import { lazy, Suspense } from "react";
import { useCardData, useCategoryData, useCategoryStatsData, useReviewData } from "@/contexts/AppContext";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const MyStats = lazy(() => import("@/components/MyStats"));

export default function StatsPage() {
  const { cards } = useCardData();
  const { categories, categoryRecords, subcategories } = useCategoryData();
  const { categoryStats } = useCategoryStatsData();
  const { reviewLog, srSettings } = useReviewData();

  return (
    <div className="p-4 max-w-7xl mx-auto w-full">
      <Suspense fallback={<PageSkeleton />}>
        <ErrorBoundary label="Stats">
          <MyStats
            cards={cards}
            categories={categories}
            categoryRecords={categoryRecords}
            subcategories={subcategories}
            categoryStats={categoryStats}
            reviewLog={reviewLog}
            srSettings={srSettings}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
