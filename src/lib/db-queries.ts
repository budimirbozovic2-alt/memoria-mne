import { db } from "./db-schema";
import type { CategoryRecord } from "./db-schema";
import { Card } from "./spaced-repetition";
import { ReviewLogEntry } from "./storage";

// ─── Cards ──────────────────────────────────────────────

export async function idbLoadCards(): Promise<Card[]> {
  return db.cards.toArray();
}

function hasInnerQuotaError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("inner" in err)) return false;
  const inner = (err as Record<string, unknown>).inner;
  return typeof inner === "object" && inner !== null && (inner as Record<string, unknown>).name === "QuotaExceededError";
}

export async function idbPutCard(card: Card): Promise<void> {
  try {
    await db.cards.put(card);
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (e.name === "QuotaExceededError" || hasInnerQuotaError(err)) {
      console.error("[MemoriaDB] Storage quota exceeded", err);
      throw new Error("QUOTA_EXCEEDED");
    }
    throw err;
  }
}

export async function idbBulkPutCards(cards: Card[]): Promise<void> {
  if (cards.length === 0) return;
  try {
    await db.cards.bulkPut(cards);
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (e.name === "QuotaExceededError" || hasInnerQuotaError(err)) {
      console.error("[MemoriaDB] Storage quota exceeded during bulk write", err);
      throw new Error("QUOTA_EXCEEDED");
    }
    throw err;
  }
}

export async function idbDeleteCard(id: string): Promise<void> {
  await db.cards.delete(id);
}

// ─── Categories ─────────────────────────────────────────

export async function idbLoadCategories(): Promise<CategoryRecord[]> {
  return db.categories.orderBy("sortOrder").toArray();
}

export async function idbSaveCategory(cat: CategoryRecord): Promise<void> {
  await db.categories.put(cat);
}

export async function idbSaveCategories(cats: CategoryRecord[]): Promise<void> {
  await db.transaction("rw", db.categories, async () => {
    await db.categories.bulkPut(cats);
    const keepIds = new Set(cats.map(c => c.id));
    const allKeys = await db.categories.toCollection().primaryKeys();
    const toDelete = allKeys.filter(k => !keepIds.has(k as string));
    if (toDelete.length > 0) await db.categories.bulkDelete(toDelete);
  });
}

export async function idbDeleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// ─── Review Log ─────────────────────────────────────────

export async function idbLoadReviewLog(): Promise<ReviewLogEntry[]> {
  return db.reviewLog.toArray();
}

export async function idbLoadRecentReviewLog(days: number = 90): Promise<ReviewLogEntry[]> {
  const cutoff = Date.now() - days * 86400000;
  return db.reviewLog.where("timestamp").aboveOrEqual(cutoff).toArray();
}

export async function idbCountReviewLog(): Promise<number> {
  return db.reviewLog.count();
}

// ─── Review log persist queue ───────────────────────────
// Append-only micro-queue, drained by a 250 ms debounce timer using
// `db.reviewLog.bulkAdd`. Prevents IDB write-queue floods during fast
// review streaks (Zen mode, 10+ grades/sec).

const _reviewLogQueue: ReviewLogEntry[] = [];
let _reviewLogTimer: ReturnType<typeof setTimeout> | null = null;
const REVIEW_LOG_DEBOUNCE_MS = 250;

async function _flushReviewLogQueue(): Promise<void> {
  _reviewLogTimer = null;
  if (_reviewLogQueue.length === 0) return;
  const batch = _reviewLogQueue.splice(0, _reviewLogQueue.length);
  try {
    await db.reviewLog.bulkAdd(batch);
  } catch (err: unknown) {
    console.error("[reviewLog] bulk write failed", err);
    // Re-queue so we don't silently lose entries on transient failures.
    _reviewLogQueue.unshift(...batch);
    throw err;
  }
}

/** Enqueue a review-log entry. Batched & debounced (250 ms) to avoid
 *  flooding Dexie's serialized write queue during fast review streaks. */
export function idbAddReviewLogEntry(entry: ReviewLogEntry): void {
  _reviewLogQueue.push(entry);
  if (_reviewLogTimer == null) {
    _reviewLogTimer = setTimeout(() => { void _flushReviewLogQueue(); }, REVIEW_LOG_DEBOUNCE_MS);
  }
}

/** Force-drain the queue. Call before backup/export/full-restore so no
 *  pending entries are missed. */
export async function flushReviewLogQueue(): Promise<void> {
  if (_reviewLogTimer != null) { clearTimeout(_reviewLogTimer); _reviewLogTimer = null; }
  await _flushReviewLogQueue();
}

// ─── Settings ───────────────────────────────────────────

export async function idbLoadSettings<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function idbSaveSettings(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

// ─── Fast aggregation helpers ───────────────────────────

export async function idbCountCardsByCategory(categoryId: string): Promise<number> {
  return db.cards.where("categoryId").equals(categoryId).count();
}

export async function idbCountAllCards(): Promise<number> {
  return db.cards.count();
}

export async function idbCountByType(type: string): Promise<number> {
  return db.cards.where("type").equals(type).count();
}

export async function idbCountReviewLogSince(since: number): Promise<number> {
  return db.reviewLog.where("timestamp").aboveOrEqual(since).count();
}
