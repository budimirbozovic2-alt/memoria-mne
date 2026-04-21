import { useParams, Link } from "react-router-dom";
import { useCardData, useCategoryData } from "@/contexts/AppContext";
import { useMemo } from "react";
import {
  ArrowLeft, Compass, BookOpen, Brain, RefreshCw, Globe,
  Zap, GitBranch, Sparkles, BookMarked,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCardMasteryLevel, getMasteryColor, MASTERY_LEVELS } from "@/lib/mastery";
import { SectionState } from "@/lib/spaced-repetition";

export default function SubjectDashboard() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { categoryRecords } = useCategoryData();
  const { cards } = useCardData();

  const categoryRec = useMemo(
    () => categoryRecords.find(r => r.id === categoryId),
    [categoryRecords, categoryId],
  );
  const categoryName = categoryRec?.name ?? "Nepoznat predmet";

  // ─── Workflow cards ──────────────────────────────────
  const workflowCards = useMemo(() => [
    {
      to: `/category/${categoryId}`,
      icon: Compass,
      title: "Slobodno istraživanje",
      desc: "Čitaj izvore, pravi kartice",
      accent: "bg-blue-500/10 text-blue-400",
    },
    {
      to: `/subject/${categoryId}/speed-reader`,
      icon: BookOpen,
      title: "Pasivno čitanje",
      desc: "Brzo čitanje kartica i izvora",
      accent: "bg-emerald-500/10 text-emerald-400",
    },
    {
      to: `/learn?cat=${categoryId}`,
      icon: Brain,
      title: "Aktivno prisjećanje",
      desc: "Učenje i testiranje znanja",
      accent: "bg-violet-500/10 text-violet-400",
    },
    {
      to: `/review?cat=${categoryId}`,
      icon: RefreshCw,
      title: "Lokalna Konsolidacija",
      desc: "Ponavljanje dospjelih kartica",
      accent: "bg-amber-500/10 text-amber-400",
    },
    {
      to: "/review",
      icon: Globe,
      title: "Globalna Konsolidacija",
      desc: "Ponavljanje svih predmeta",
      accent: "bg-rose-500/10 text-rose-400",
    },
  ], [categoryId]);

  // ─── Knowledge progress data ──────────────────────────
  const subProgressData = useMemo(() => {
    if (!categoryId || !categoryRec) return [];
    const catCards = cards.filter(c => c.categoryId === categoryId);
    const subs = categoryRec.subcategories ?? [];

    return subs.map(sub => {
      const subCards = catCards.filter(c => c.subcategoryId === sub.id);
      const totalSections = subCards.reduce((s, c) => s + (c.sections?.length ?? 0), 0);
      const learnedSections = subCards.reduce(
        (s, c) => s + (c.sections?.filter(sec => sec.state !== SectionState.New).length ?? 0), 0,
      );
      const pct = totalSections > 0 ? Math.round((learnedSections / totalSections) * 100) : 0;
      const avgMastery = subCards.length > 0
        ? Math.round(subCards.reduce((s, c) => s + getCardMasteryLevel(c), 0) / subCards.length)
        : 0;

      const chapters = (sub.chapters ?? []).map(ch => {
        const chCards = subCards.filter(c => c.chapterId === ch.id);
        const chTotal = chCards.reduce((s, c) => s + (c.sections?.length ?? 0), 0);
        const chLearned = chCards.reduce(
          (s, c) => s + (c.sections?.filter(sec => sec.state !== SectionState.New).length ?? 0), 0,
        );
        const chPct = chTotal > 0 ? Math.round((chLearned / chTotal) * 100) : 0;
        const chMastery = chCards.length > 0
          ? Math.round(chCards.reduce((s, c) => s + getCardMasteryLevel(c), 0) / chCards.length)
          : 0;
        return { id: ch.id, name: ch.name, cardCount: chCards.length, pct: chPct, mastery: chMastery };
      });

      return { id: sub.id, name: sub.name, cardCount: subCards.length, pct, mastery: avgMastery, chapters };
    });
  }, [categoryId, categoryRec, cards]);

  // ─── Contextual tools ──────────────────────────────────
  const contextTools = useMemo(() => [
    {
      to: `/subject/${categoryId}/speed-reader`,
      icon: Zap,
      title: "Speed Reader",
      desc: "Brzo čitanje unutar predmeta",
      accent: "bg-emerald-500/10 text-emerald-400",
    },
    {
      to: `/subject/${categoryId}/mind-maps`,
      icon: GitBranch,
      title: "Mentalne mape",
      desc: "Vizualizacija znanja",
      accent: "bg-sky-500/10 text-sky-400",
    },
    {
      to: `/subject/${categoryId}/mnemonics`,
      icon: Sparkles,
      title: "Mnemoničke kuke",
      desc: "Memorijske tehnike",
      accent: "bg-fuchsia-500/10 text-fuchsia-400",
    },
  ], [categoryId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Nazad na početnu"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Dashboard predmeta</p>
        </div>
      </div>

      {/* ─── Section 1: Integrisani Workflow ────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Integrisani Workflow Učenja
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {workflowCards.map(({ to, icon: Icon, title, desc, accent }) => (
            <Link
              key={title}
              to={to}
              className="glass-card rounded-xl p-4 flex flex-col gap-3 hover:border-primary/40 transition-all group"
            >
              <div className={`p-2.5 rounded-lg ${accent} w-fit group-hover:scale-105 transition-transform`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Section 2: Prikaz Znanja ────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Prikaz Znanja
          </h2>
        </div>

        {subProgressData.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Nema potkategorija za ovaj predmet. Dodaj ih u Podešavanjima.
          </div>
        ) : (
          <div className="space-y-2">
            {subProgressData.map(sub => (
              <div key={sub.id} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{sub.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: getMasteryColor(sub.mastery) + "22", color: getMasteryColor(sub.mastery) }}
                    >
                      {MASTERY_LEVELS[sub.mastery]?.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{sub.cardCount} kartica</span>
                    <span className="text-xs font-medium text-foreground w-8 text-right">{sub.pct}%</span>
                  </div>
                </div>
                <Progress value={sub.pct} className="h-1.5" style={{ "--progress-color": getMasteryColor(sub.mastery) } as React.CSSProperties} />

                {/* Chapters nested */}
                {sub.chapters.length > 0 && (
                  <div className="pl-4 space-y-1.5 pt-1 border-l border-border/40 ml-1">
                    {sub.chapters.map(ch => (
                      <div key={ch.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate flex-1">{ch.name}</span>
                        <span className="text-[10px] text-muted-foreground w-6 text-right">{ch.cardCount}</span>
                        <div className="w-20">
                          <Progress value={ch.pct} className="h-1" style={{ "--progress-color": getMasteryColor(ch.mastery) } as React.CSSProperties} />
                        </div>
                        <span className="text-[10px] font-medium text-foreground w-7 text-right">{ch.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Section 3: Kontekstualni Alati ──────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Kontekstualni Alati
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {contextTools.map(({ to, icon: Icon, title, desc, accent }) => (
            <Link
              key={title}
              to={to}
              className="glass-card rounded-xl p-5 flex items-start gap-4 hover:border-primary/40 transition-all group"
            >
              <div className={`p-2.5 rounded-lg ${accent} shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
