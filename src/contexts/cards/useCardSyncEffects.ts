// Phase 3 — slim sync effects.
//
// CARDS_UPDATED-driven cache invalidation moved to module-level
// `cardMapInvalidator` (initialized in main.tsx). What remains here is
// strictly the cross-module command dispatch wiring that must be tied to
// React lifecycle (the backlink-index init is module-bound but exposed as
// an effect subscription cleanup).
import { useEffect } from "react";
import { onCardLinksCleared, onCardReviewConfirmed } from "@/lib/sources-storage";
import { initBacklinkIndexSubscriptions } from "@/lib/backlink-index";
import { cardCommandBus } from "@/lib/repositories/cardCommandBus";

export function useCardSyncEffects(): void {
  useEffect(() => initBacklinkIndexSubscriptions(), []);

  useEffect(() => onCardLinksCleared((ids) => {
    void cardCommandBus.dispatch({ type: "clearLinks", ids });
  }), []);

  useEffect(() => onCardReviewConfirmed((cardId) => {
    void cardCommandBus.dispatch({ type: "clearNeedsReview", id: cardId });
  }), []);
}
