import { useMemo, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Brain } from "lucide-react";
import { useCardData, useCategoryData, useReviewData, useCardActions } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import FrequentErrors from "@/pages/FrequentErrors";

const CognitiveAnalytics = lazy(() => import("@/components/CognitiveAnalytics"));

export default function SubjectDiagnosticsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { cards, ready, buckets } = useCardData();
  const { categoryRecords } = useCategoryData();
  const { reviewLog } = useReviewData();
  const { clearErrorLog } = useCardActions();

  const categoryRec = useMemo(
    () => categoryRecords.find(r => r.id === categoryId),
    [categoryRecords, categoryId],
  );
  const categoryName = categoryRec?.name ?? "Nepoznat predmet";

  const subjectCards = useMemo(
    () => (categoryId ? buckets.byCategory.get(categoryId) ?? [] : []),
    [buckets, categoryId],
  );

  const subjectCardIds = useMemo(
    () => new Set(subjectCards.map(c => c.id)),
    [subjectCards],
  );

  const subjectReviewLog = useMemo(
    () => reviewLog.filter(r => subjectCardIds.has(r.cardId)),
    [reviewLog, subjectCardIds],
  );

  const catNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of categoryRecords) {
      map[r.id] = r.name;
      for (const sub of (r.subcategories || [])) map[sub.id] = sub.name;
    }
    return map;
  }, [categoryRecords]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Učitavanje dijagnostike...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary label="Dijagnostika predmeta">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to={`/subject/${categoryId}`}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Nazad na dashboard predmeta"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2.5 rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">Dijagnostika</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {categoryName} — greške i kognitivna analiza
            </p>
          </div>
        </div>

        {/* Frequent errors (scoped) */}
        <section className="space-y-4">
          <FrequentErrors
            cards={subjectCards}
            categoryRecords={categoryRecords}
            onClearErrorLog={clearErrorLog}
            embedded
          />
        </section>

        {/* Cognitive analytics (scoped) */}
        <section className="space-y-4 border-t pt-8">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Kognitivna dijagnostika</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Analiza interferencija, stabilnosti memorije i slijepih tačaka — ograničena na ovaj predmet.
            Ovi podaci hrane FSRS prilagođavanje.
          </p>
          <Suspense fallback={<Skeleton className="h-[240px] w-full rounded-xl" />}>
            <CognitiveAnalytics
              cards={subjectCards}
              categories={categoryId ? [categoryId] : []}
              reviewLog={subjectReviewLog}
              catNameMap={catNameMap}
              categoryId={categoryId}
            />
          </Suspense>
        </section>
      </div>
    </ErrorBoundary>
  );
}
