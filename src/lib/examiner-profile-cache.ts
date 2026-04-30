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
 *   1. For every category in `records`, writes its profile into the cache.
 *      If `examinerProfile` is `undefined` on the record (never set, cleared,
 *      or transiently absent during a partial update), the cache entry is
 *      OVERWRITTEN with `profile: undefined` rather than left at its prior
 *      value. This guarantees a freshly-primed but profile-less category
 *      can never return a stale profile from a previous prime cycle.
 *   2. Evicts every cache entry whose categoryId is NOT in `records`.
 *
 * Distinguishing "never primed" vs "primed but absent": callers that need
 * to tell these apart should use `hasExaminerProfileEntry(id)` — `true`
 * means we've reconciled at least once and the SSOT says "no profile".
 */
export function primeExaminerProfilesFromRecords(
  records: Array<{ id: string; examinerProfile?: ExaminerProfile }>,
): void {
  const now = Date.now();
  const liveIds = new Set<string>();
  for (const r of records) {
    liveIds.add(r.id);
    // Explicit overwrite — `r.examinerProfile` may be `undefined` and that
    // must REPLACE any previously-cached profile, not be skipped.
    _cache.set(r.id, { profile: r.examinerProfile, ts: now });
  }
  // Evict orphans — categories that disappeared since the last prime.
  for (const id of _cache.keys()) {
    if (!liveIds.has(id)) _cache.delete(id);
  }
}

/** Synchronous read — returns `undefined` for both "never primed" AND
 *  "primed but record has no examinerProfile". Use `hasExaminerProfileEntry`
 *  to disambiguate when needed. */
export function getExaminerProfileSync(
  categoryId: string,
): ExaminerProfile | undefined {
  return _cache.get(categoryId)?.profile;
}

/** True iff the category has been reconciled into the cache, regardless of
 *  whether it actually has a profile attached. Lets callers distinguish
 *  "never primed" (false) from "primed, profile absent" (true). */
export function hasExaminerProfileEntry(categoryId: string): boolean {
  return _cache.has(categoryId);
}

/** Drop a single entry (used after an explicit category delete). */
export function invalidateExaminerProfile(categoryId: string): void {
  _cache.delete(categoryId);
}

/** Test helper. */
export function _clearExaminerProfileCache(): void {
  _cache.clear();
}
