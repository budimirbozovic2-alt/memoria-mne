import { useEffect, useCallback } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useSessionContext, QueuedReview, QueuedError } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ReviewSession from "@/components/ReviewSession";
import EmptyState from "@/components/EmptyState";

export default function ReviewPage() {
  const { dueCards, cards, reviewLog, subcategories, srSettings, reviewSection, logError, setView } = useAppContext();
  const session = useSessionContext();

  // Start session on mount
  useEffect(() => {
    session.startSession(cards, reviewLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrap reviewSection to queue instead of applying immediately
  const handleReviewSection = useCallback((cardId: string, sectionId: string, grade: number) => {
    if (session.isSessionActive) {
      session.queueReview(cardId, sectionId, grade);
      // Still call the real one so the UI updates cards in-memory for the session
      reviewSection(cardId, sectionId, grade);
    } else {
      reviewSection(cardId, sectionId, grade);
    }
  }, [session, reviewSection]);

  const handleLogError = useCallback((cardId: string, text: string) => {
    if (session.isSessionActive) {
      session.queueError(cardId, text);
      logError(cardId, text);
    } else {
      logError(cardId, text);
    }
  }, [session, logError]);

  // On back, end session and flush
  const handleBack = useCallback(() => {
    if (session.isSessionActive) {
      session.endSession(
        (_reviews: QueuedReview[]) => { /* already applied in real-time */ },
        (_errors: QueuedError[]) => { /* already applied in real-time */ },
        () => {},
      );
    }
    setView("dashboard");
  }, [session, setView]);

  return (
    <ErrorBoundary label="Ponavljanje" onNavigateHome={() => setView("dashboard")}>
      {dueCards.length === 0 ? (
        <EmptyState type="review" />
      ) : (
        <ReviewSession
          dueCards={dueCards}
          allCards={cards}
          subcategories={subcategories}
          srSettings={srSettings}
          onReviewSection={handleReviewSection}
          onLogError={handleLogError}
          onBack={handleBack}
        />
      )}
    </ErrorBoundary>
  );
}
