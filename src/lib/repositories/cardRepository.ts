// ─────────────────────────────────────────────────────────────────────────────
// M1+A1 — Card Repository Facade
//
// Single source of truth for **card mutations**. Owns the contract between
// the in-memory cardMap (Zustand store + ref facade) and the IndexedDB
// persist queue. Higher layers (hooks, providers, services) call repository
// methods instead of poking at `schedulePersist`, `cardMapRef.current`, and
// `setCardMap` directly — this severs the tight coupling identified in the
// architecture audit (A1) and lets us evolve persistence without touching UI.
// ─────────────────────────────────────────────────────────────────────────────
import type { Card } from "@/lib/spaced-repetition";
import { invalidateCoverageCache } from "@/lib/coverage-analysis";
import { sameSourceModules } from "@/lib/struct-eq";
import {
  bumpMapVersion,
  schedulePersist,
  type CardMap,
} from "@/lib/persist-queue";
import {
  cardMapRefFacade,
  setCardMap,
  getCardMap,
} from "@/store/useCardMapStore";

// ─── Read primitives ──────────────────────────────────────────────────────
export function getCard(id: string): Card | undefined {
  return cardMapRefFacade.current[id];
}

export function snapshot(): CardMap {
  return getCardMap();
}

// ─── Internal helpers ─────────────────────────────────────────────────────
function commitSingle(card: Card): void {
  cardMapRefFacade.current[card.id] = card; // in-place ref delta
  schedulePersist({ type: "put", card });
  setCardMap((prev) => ({ ...prev, [card.id]: card }));
  bumpMapVersion();
}

function commitBulk(cards: Card[]): void {
  if (cards.length === 0) return;
  for (const c of cards) cardMapRefFacade.current[c.id] = c;
  schedulePersist({ type: "bulk", cards });
  setCardMap((prev) => {
    const next = { ...prev };
    for (const c of cards) next[c.id] = c;
    return next;
  });
  bumpMapVersion();
}

function commitDelete(id: string): void {
  delete cardMapRefFacade.current[id];
  schedulePersist({ type: "delete", id });
  setCardMap((prev) => {
    if (!prev[id]) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
  bumpMapVersion();
}

// ─── Write primitives ─────────────────────────────────────────────────────

/** Insert or replace a card. Stamps `updatedAt`. */
export function put(card: Card): void {
  const stamped = card.updatedAt ? card : { ...card, updatedAt: Date.now() };
  commitSingle(stamped);
}

/** Bulk insert/replace. Stamps `updatedAt` on entries that lack it. */
export function bulkPut(cards: Card[]): void {
  if (cards.length === 0) return;
  const now = Date.now();
  const stamped = cards.map((c) => (c.updatedAt ? c : { ...c, updatedAt: now }));
  commitBulk(stamped);
}

/** Delete a card by id. Invalidates coverage cache for any linked source. */
export function remove(id: string): void {
  const card = cardMapRefFacade.current[id];
  if (card?.sourceId) invalidateCoverageCache(card.sourceId);
  commitDelete(id);
}

/**
 * Apply a structural patch to a single card. Invalidates coverage cache only
 * if the linked-source snippet/modules actually changed — same contract as
 * the legacy `patchCard` it replaces.
 */
export function patch(id: string, patcher: (card: Card) => Card): Card | undefined {
  const card = cardMapRefFacade.current[id];
  if (!card) return undefined;
  const updated: Card = { ...patcher(card), updatedAt: Date.now() };
  if (
    updated.sourceId &&
    (updated.originalSourceSnippet !== card.originalSourceSnippet ||
      !sameSourceModules(updated.sourceModules, card.sourceModules))
  ) {
    invalidateCoverageCache(updated.sourceId);
  }
  commitSingle(updated);
  return updated;
}

/**
 * Resolve a list of ids and apply a per-card patcher. Skips missing ids.
 * Coalesces into a single bulk write + single render.
 */
export function bulkPatch(
  ids: string[],
  patcher: (card: Card) => Card,
): Card[] {
  if (ids.length === 0) return [];
  const now = Date.now();
  const updated: Card[] = [];
  for (const id of ids) {
    const card = cardMapRefFacade.current[id];
    if (!card) continue;
    updated.push({ ...patcher(card), updatedAt: now });
  }
  if (updated.length > 0) commitBulk(updated);
  return updated;
}

/**
 * Clear source linkage for a set of cards (only those that currently have a
 * sourceId). Used by `onCardLinksCleared` sync. Returns the updated rows.
 */
export function clearLinks(cardIds: string[]): Card[] {
  const updates: Card[] = [];
  const now = Date.now();
  for (const id of cardIds) {
    const c = cardMapRefFacade.current[id];
    if (!c?.sourceId) continue;
    updates.push({
      ...c,
      sourceId: undefined,
      textAnchor: undefined,
      needsReview: undefined,
      updatedAt: now,
    });
  }
  if (updates.length > 0) commitBulk(updates);
  return updates;
}

/** Clear `needsReview` for one card if currently set. */
export function clearNeedsReview(id: string): Card | undefined {
  const c = cardMapRefFacade.current[id];
  if (!c) return undefined;
  if (c.needsReview === undefined) return c;
  const updated: Card = { ...c, needsReview: undefined, updatedAt: Date.now() };
  commitSingle(updated);
  return updated;
}

/**
 * Apply a remote sync delta from the CARDS_UPDATED bus event. Newer rows
 * win over the in-memory copy; missing ids are deleted.
 */
export function applySyncDelta(rows: Card[], deletedIds: string[]): void {
  if (rows.length === 0 && deletedIds.length === 0) return;
  for (const c of rows) cardMapRefFacade.current[c.id] = c;
  for (const id of deletedIds) delete cardMapRefFacade.current[id];
  setCardMap((prev) => {
    const next = { ...prev };
    for (const c of rows) next[c.id] = c;
    for (const id of deletedIds) delete next[id];
    return next;
  });
  bumpMapVersion();
}

/** Replace the entire cardMap atom. Bootstrap / restore only. */
export function replaceAll(map: CardMap): void {
  cardMapRefFacade.current = map;
  setCardMap({ ...map });
  bumpMapVersion();
}

export const cardRepository = {
  // reads
  get: getCard,
  snapshot,
  // writes
  put,
  bulkPut,
  remove,
  patch,
  bulkPatch,
  clearLinks,
  clearNeedsReview,
  applySyncDelta,
  replaceAll,
};
