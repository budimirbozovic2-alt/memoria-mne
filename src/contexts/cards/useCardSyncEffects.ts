// M1 decomposition + F2 — sync effects extracted from CardStateProvider.
// All mutation paths (link clear / review confirmed / CARDS_UPDATED delta /
// full reload) dispatch through `cardCommandBus`, which serializes against
// any in-flight patchCard for the affected ids. The V5/V10 race patches in
// the legacy provider are now obsolete: serialization is guaranteed by the
// per-id mutex, and the `applySyncDelta` repository method still applies
// `updatedAt` newer-wins as defense-in-depth.
import { useEffect } from "react";
import { onCardLinksCleared, onCardReviewConfirmed } from "@/lib/sources-storage";
import { eventBus, EVENT_TYPES } from "@/lib/event-bus";
import { initBacklinkIndexSubscriptions } from "@/lib/backlink-index";
import { persistQueue } from "@/lib/persist-queue";
import { cardCommandBus } from "@/lib/repositories/cardCommandBus";
import type { Card } from "@/lib/spaced-repetition";

interface CardsUpdatedPayload {
  source?: string;
  cardIds?: string[];
}

const SURGICAL_LIMIT = 200;

export function useCardSyncEffects(): void {
  useEffect(() => initBacklinkIndexSubscriptions(), []);

  useEffect(() => onCardLinksCleared((ids) => {
    void cardCommandBus.dispatch({ type: "clearLinks", ids });
  }), []);

  useEffect(() => onCardReviewConfirmed((cardId) => {
    void cardCommandBus.dispatch({ type: "clearNeedsReview", id: cardId });
  }), []);

  useEffect(() => {
    let isSubscribed = true;
    let fetchSequence = 0;

    const unsub = eventBus.subscribe<CardsUpdatedPayload>(EVENT_TYPES.CARDS_UPDATED, (payload) => {
      const currentSequence = ++fetchSequence;
      const ids = payload?.cardIds;

      if (ids && ids.length > 0 && ids.length <= SURGICAL_LIMIT) {
        void persistQueue.cleanup()
          .then(() => import("@/lib/db"))
          .then(({ db }) => db.cards.bulkGet(ids))
          .then((rows) => {
            if (!isSubscribed || currentSequence !== fetchSequence) return;
            const fetched = rows.filter((r): r is Card => !!r);
            const fetchedIds = new Set(fetched.map((c) => c.id));
            const deletedIds = ids.filter((id) => !fetchedIds.has(id));
            if (fetched.length === 0 && deletedIds.length === 0) return;
            return cardCommandBus.dispatch({
              type: "applySyncDelta",
              rows: fetched,
              deletedIds,
            });
          });
        return;
      }

      void persistQueue.cleanup()
        .then(() => import("@/lib/db-queries"))
        .then(({ idbLoadCards }) => idbLoadCards())
        .then((loaded) => {
          if (!isSubscribed || currentSequence !== fetchSequence) return;
          const map: Record<string, Card> = {};
          for (const c of loaded) map[c.id] = c;
          return cardCommandBus.dispatch({ type: "replaceAll", map });
        });
    });

    return () => { isSubscribed = false; unsub(); };
  }, []);
}
