import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Card } from "@/lib/spaced-repetition";
import type { SubcategoryNode } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  cards: Card[];
  subcategoryNodes: SubcategoryNode[];
}

export default function PassiveReader({ cards, subcategoryNodes }: Props) {
  const [subFilter, setSubFilter] = useState<string>("all");
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [index, setIndex] = useState(0);

  const chapters = useMemo(() => {
    if (subFilter === "all") return [];
    const sub = subcategoryNodes.find(s => s.id === subFilter);
    return sub?.chapters ?? [];
  }, [subFilter, subcategoryNodes]);

  const filtered = useMemo(() => {
    let list = cards.slice();
    if (subFilter !== "all") list = list.filter(c => c.subcategoryId === subFilter);
    if (chapterFilter !== "all") list = list.filter(c => c.chapterId === chapterFilter);
    return list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [cards, subFilter, chapterFilter]);

  // Reset index when filters change
  useEffect(() => { setIndex(0); }, [subFilter, chapterFilter]);
  // Clamp index if list shrinks
  useEffect(() => {
    if (index > 0 && index >= filtered.length) setIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, index]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        setIndex(i => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key === "ArrowLeft") {
        setIndex(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered.length]);

  const current = filtered[index];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={subFilter} onValueChange={(v) => { setSubFilter(v); setChapterFilter("all"); }}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Potkategorija" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve potkategorije</SelectItem>
            {subcategoryNodes.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subFilter !== "all" && chapters.length > 0 && (
          <Select value={chapterFilter} onValueChange={setChapterFilter}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Glava" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve glave</SelectItem>
              {chapters.map(ch => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length === 0 ? "Nema kartica" : `${index + 1} / ${filtered.length}`}
        </div>
      </div>

      {/* Card */}
      {!current ? (
        <div className="glass-card rounded-xl p-12 text-center text-sm text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Nema kartica za prikaz uz odabrane filtere.
        </div>
      ) : (
        <article className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
          <header className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Pasivno čitanje
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
              {current.question}
            </h2>
          </header>
          <div className="space-y-4">
            {(current.sections ?? []).map((sec, i) => (
              <section key={i} className="space-y-1.5">
                {sec.title && (
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {sec.title}
                  </h3>
                )}
                <div
                  className="prose prose-sm max-w-none dark:prose-invert card-prose"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(sec.content || "") }}
                />
              </section>
            ))}
          </div>
        </article>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          disabled={index <= 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Prethodna
        </Button>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Tastatura: ← / → za navigaciju
        </p>
        <Button
          variant="outline"
          onClick={() => setIndex(i => Math.min(i + 1, Math.max(0, filtered.length - 1)))}
          disabled={index >= filtered.length - 1}
          className="gap-1.5"
        >
          Sljedeća <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
