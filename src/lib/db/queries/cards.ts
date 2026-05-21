// ─────────────────────────────────────────────────────────────────────────────
// Phase 0 — IDB query layer for cards.
//
// Named queries that resolve to indexed Dexie operations. Each query exposes:
//   • a one-shot async reader (`.toArray()` / `.count()`) for imperative paths
//   • a `liveQuery()` Observable for reactive callers (Phase 2+ wires hooks)
//
// No call site is required to use this module yet — Phase 0 only ships the
// indexes (v18) and the abstraction layer. Phase 1+ migrates consumers off
// `useCardData().cards.filter(...)` onto these queries.
//
// Invariants:
//   • Every query MUST hit an index defined in db-schema.ts v18.
//   • Unbounded reads (no chapter / source / tag scope) MUST take a `limit`.
// ─────────────────────────────────────────────────────────────────────────────
import { liveQuery, type Observable } from "dexie";
import { db } from "@/lib/db";
import type { Card } from "@/lib/spaced-repetition";

// ── one-shot readers ────────────────────────────────────────────────────────

export function cardsByCategory(categoryId: string): Promise<Card[]> {
  return db.cards.where("categoryId").equals(categoryId).toArray();
}

export function cardsBySubcategory(categoryId: string, subcategoryId: string): Promise<Card[]> {
  return db.cards
    .where("[categoryId+subcategoryId]")
    .equals([categoryId, subcategoryId])
    .toArray();
}

export function cardsByChapter(categoryId: string, chapterId: string): Promise<Card[]> {
  return db.cards
    .where("[categoryId+chapterId]")
    .equals([categoryId, chapterId])
    .toArray();
}

export function cardsByType(categoryId: string, type: Card["type"]): Promise<Card[]> {
  return db.cards
    .where("[categoryId+type]")
    .equals([categoryId, type])
    .toArray();
}

export function cardsBySource(sourceId: string): Promise<Card[]> {
  // [sourceId+createdAt] yields rows ordered by createdAt ascending for free.
  return db.cards
    .where("[sourceId+createdAt]")
    .between([sourceId, -Infinity], [sourceId, Infinity])
    .toArray();
}

export function cardsByTag(tag: string, limit = 500): Promise<Card[]> {
  return db.cards.where("tags").equals(tag).limit(limit).toArray();
}

// ── counts (cheap, index-only) ─────────────────────────────────────────────

export function cardCountByCategory(categoryId: string): Promise<number> {
  return db.cards.where("categoryId").equals(categoryId).count();
}

export function cardCountByChapter(categoryId: string, chapterId: string): Promise<number> {
  return db.cards
    .where("[categoryId+chapterId]")
    .equals([categoryId, chapterId])
    .count();
}

export function cardCountByType(categoryId: string, type: Card["type"]): Promise<number> {
  return db.cards
    .where("[categoryId+type]")
    .equals([categoryId, type])
    .count();
}

// ── reactive Observables (Phase 2 consumers) ───────────────────────────────
// Each `live*` wraps the corresponding reader in Dexie's liveQuery.
// Subscribers re-emit whenever any write touches the underlying rows.

export function liveCardsByCategory(categoryId: string): Observable<Card[]> {
  return liveQuery(() => cardsByCategory(categoryId));
}

export function liveCardsBySubcategory(
  categoryId: string,
  subcategoryId: string,
): Observable<Card[]> {
  return liveQuery(() => cardsBySubcategory(categoryId, subcategoryId));
}

export function liveCardsByChapter(
  categoryId: string,
  chapterId: string,
): Observable<Card[]> {
  return liveQuery(() => cardsByChapter(categoryId, chapterId));
}

export function liveCardsByType(
  categoryId: string,
  type: Card["type"],
): Observable<Card[]> {
  return liveQuery(() => cardsByType(categoryId, type));
}

export function liveCardsBySource(sourceId: string): Observable<Card[]> {
  return liveQuery(() => cardsBySource(sourceId));
}

export function liveCardCountByCategory(categoryId: string): Observable<number> {
  return liveQuery(() => cardCountByCategory(categoryId));
}
