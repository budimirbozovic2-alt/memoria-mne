// Synchronous, in-memory examiner-profile cache keyed by categoryId.
// Primed from AppContext.categoryRecords on load and on every mutation,
// so callers in the SRS hot-path (calculateNextReview / reviewSection)
// can read it without async/await and without an "undefined first call".
//
// TTL is advisory: entries never expire on read; they get refreshed via
// primeExaminerProfile whenever AppContext sees new categoryRecords.

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

/** Bulk prime — call once per `categoryRecords` change. */
export function primeExaminerProfilesFromRecords(
  records: Array<{ id: string; examinerProfile?: ExaminerProfile }>,
): void {
  const now = Date.now();
  for (const r of records) {
    _cache.set(r.id, { profile: r.examinerProfile, ts: now });
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
