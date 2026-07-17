import { Suspense, lazy } from "react";
import SessionComplete from "./learn/SessionComplete";
import EmptyState from "@/components/EmptyState";
import { SessionCardSkeleton } from "@/components/ui/loading";
import { LearnSessionProps } from "./learn/types";
import { useLearnSession } from "@/hooks/useLearnSession";

const StudyModeRecall = lazy(() => import("./learn/StudyModeRecall"));

export default function LearnSession(props: LearnSessionProps) {
  const session = useLearnSession(props);

  // Learning is subject-centric strict-recall only — the session always starts
  // immediately from the incoming filters (or a restored one). The old global
  // filter-setup screen was removed; if somehow not started, show the skeleton
  // rather than a picker.
  if (!session.started) {
    return <SessionCardSkeleton />;
  }

  if (!session.card && session.sortedCards.length === 0) {
    return (
      <EmptyState
        type="learn-filter"
        onAction={session.handleEmptyFilterAction}
      />
    );
  }

  if (session.sessionFinished) {
    return (
      <SessionComplete
        sessionStartTime={session.sessionStartTime}
        totalGrades={session.totalGrades}
        modulesCompleted={session.modulesCompleted}
        readCardsCount={session.readCards.size}
        completedCardsCount={session.completedCards.size}
        onBack={session.onBack}
      />
    );
  }

  const fallback = <SessionCardSkeleton />;

  if (!session.card) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <StudyModeRecall
        card={session.card}
        allCards={session.cards}
        sortedCards={session.sortedCards}
        currentIndex={session.effectiveIndex}
        viewWidth={session.viewWidth}
        setViewWidth={session.setViewWidth}
        readCards={session.readCards}
        completedCards={session.completedCards}
        chainCompletedCards={session.chainCompletedCards}
        onMarkRead={session.handleMarkRead}
        onReviewSection={session.handleReviewSection}
        onAddKeyPart={session.onAddKeyPart}
        goToCard={session.goToCard}
        goNext={session.goNext}
        goPrev={session.goPrev}
        onBack={session.handleActiveBack}
        setCompletedCards={session.setCompletedCards}
        setTotalGrades={session.setTotalGrades}
        setModulesCompleted={session.setModulesCompleted}
        updateProgress={session.updateProgress}
        cardProgress={session.cardProgress}
        strictRecall={session.isStrictRecall}
      />
    </Suspense>
  );
}
