import { useAppContext } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import KnowledgeMap from "@/components/KnowledgeMap";

export default function KnowledgeMapPage() {
  const {
    cards, categories, subcategories,
    bulkUpdateChapter, reviewSection, setView,
    reorderCategories, reorderSubcategories,
  } = useAppContext();

  return (
    <ErrorBoundary label="Mapa znanja" onNavigateHome={() => setView("dashboard")}>
      <KnowledgeMap
        cards={cards}
        categories={categories}
        subcategories={subcategories}
        onBack={() => setView("dashboard")}
        onUpdateChapters={bulkUpdateChapter}
        onReviewSection={reviewSection}
        onReorderCategories={reorderCategories}
        onReorderSubcategories={reorderSubcategories}
      />
    </ErrorBoundary>
  );
}
