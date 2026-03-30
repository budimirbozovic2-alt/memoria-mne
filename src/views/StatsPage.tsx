import { useCardContext, useUIContext } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MyStats from "@/components/MyStats";

export default function StatsPage() {
  const { cards, categories, subcategories, categoryStats, reviewLog, srSettings, ready } = useCardContext();
  const { setView } = useUIContext();

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Učitavanje statistike...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary label="Statistike" onNavigateHome={() => setView("dashboard")}>
      <MyStats
        cards={cards}
        categories={categories}
        subcategories={subcategories}
        categoryStats={categoryStats}
        reviewLog={reviewLog}
        srSettings={srSettings}
        onShowKnowledgeMap={() => setView("knowledge-map")}
        onShowPlanner={() => setView("planner")}
      />
    </ErrorBoundary>
  );
}
