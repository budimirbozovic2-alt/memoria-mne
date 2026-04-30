// Synchronous, in-memory examiner-profile cache keyed by categoryId.
// Primed from AppContext.categoryRecords on load and on every mutation,
// so callers in the SRS hot-path (calculateNextReview / reviewSection)
// can read it without async/await and without an "undefined first call".
//
// Invalidation strategy:
//   * `primeExaminerProfilesFromRecords` is authoritative — it reconciles
//     the cache with the SSOT (`categoryRecords`) and EVICTS entries for
//     categories no longer present. This prevents stale profiles from
//     surviving deletions or in-session subject switches.
//   * `invalidateExaminerProfile` is the explicit single-entry escape hatch.

import type { ExaminerProfile } from "./db-schema";

interface Entry {
  profile: ExaminerProfile | undefined;
  ts: number;
}

const _cache = new Map<string, Entry>();

/** Synchronously set the profile for a category. */
export function primeExaminerProfile(
  categoryId: string,
  profile: ExaminerProfile | undefined,
): void {
  _cache.set(categoryId, { profile, ts: Date.now() });
}

/**
 * Bulk prime — call once per `categoryRecords` change.
 *
 * Performs a full reconciliation:
 *   1. Updates/inserts the profile for every category in `records`.
 *   2. Evicts every cache entry whose categoryId is NOT in `records`,
 *      so deleted (or otherwise no-longer-known) subjects can never
 *      return a stale profile within the same session.
 */
export function primeExaminerProfilesFromRecords(
  records: Array<{ id: string; examinerProfile?: ExaminerProfile }>,
): void {
  const now = Date.now();
  const liveIds = new Set<string>();
  for (const r of records) {
    liveIds.add(r.id);
    _cache.set(r.id, { profile: r.examinerProfile, ts: now });
  }
  // Evict orphans — categories that disappeared since the last prime.
  for (const id of _cache.keys()) {
    if (!liveIds.has(id)) _cache.delete(id);
  }
}

/** Synchronous read — returns undefined only if the category was never primed. */
export function getExaminerProfileSync(
  categoryId: string,
): ExaminerProfile | undefined {
  return _cache.get(categoryId)?.profile;
}

/** Drop a single entry (used after an explicit category delete). */
export function invalidateExaminerProfile(categoryId: string): void {
  _cache.delete(categoryId);
}

/** Test helper. */
export function _clearExaminerProfileCache(): void {
  _cache.clear();
}
