import { useEffect, useCallback } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useSessionContext, QueuedReview, QueuedError, QueuedMarkRead } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LearnSession from "@/components/LearnSession";

export default function LearnPage() {
  const { cards, categories, subcategories, markRead, reviewSection, setView, stats, reviewLog } = useAppContext();
  const session = useSessionContext();

  // Start session on mount
  useEffect(() => {
    session.startSession(cards, reviewLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    if (session.isSessionActive) {
      session.queueMarkRead(id);
    }
    markRead(id);
  }, [session, markRead]);

  const handleReviewSection = useCallback((cardId: string, sectionId: string, grade: number) => {
    if (session.isSessionActive) {
      session.queueReview(cardId, sectionId, grade);
    }
    reviewSection(cardId, sectionId, grade);
  }, [session, reviewSection]);

  const handleBack = useCallback(() => {
    if (session.isSessionActive) {
      session.endSession(
        (_reviews: QueuedReview[]) => {},
        (_errors: QueuedError[]) => {},
        (_reads: QueuedMarkRead[]) => {},
      );
    }
    setView("dashboard");
  }, [session, setView]);

  return (
    <ErrorBoundary label="Učenje" onNavigateHome={() => setView("dashboard")}>
      <LearnSession
        cards={cards}
        categories={categories}
        subcategories={subcategories}
        onMarkRead={handleMarkRead}
        onReviewSection={handleReviewSection}
        onBack={handleBack}
        dueCount={stats.due}
      />
    </ErrorBoundary>
  );
}
