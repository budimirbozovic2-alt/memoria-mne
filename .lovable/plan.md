## Audit Status

| # | Fix | Status |
|---|---|---|
| 1 | Cache eviction + drop unused `ts` in examiner-profile-cache | ⚠️ Eviction already done; remove unused `ts` field |
| 2 | Review-log persist queue with 250 ms debounce + `bulkAdd` | ⚠️ Implement |
| 3 | `loadCalibrationForCardIds(cardIds: Set<string>)` helper | ⚠️ Add helper |

## Item 1 — `src/lib/examiner-profile-cache.ts`

Eviction in `primeExaminerProfilesFromRecords` is already implemented (loops `_cache.keys()` against a live `liveIds` Set and deletes orphans — lines 57–60). The `ts: number` field on `Entry` is set but never read. Replace the `Entry` wrapper with a plain `Map<string, ExaminerProfile | undefined>`:

- Drop the `Entry` interface.
- Change `_cache` type to `Map<string, ExaminerProfile | undefined>`.
- `primeExaminerProfile`: store profile directly.
- `primeExaminerProfilesFromRecords`: drop `now`, store `r.examinerProfile` directly. Eviction loop unchanged.
- `getExaminerProfileSync`: `_cache.get(categoryId)` (no `?.profile`).
- `hasExaminerProfileEntry` / `invalidateExaminerProfile` / `_clearExaminerProfileCache` unchanged.

Tests in `src/test/examiner-profile-cache.test.ts` should still pass — they test reconciliation/eviction/orphan behavior, none reference `ts`.

## Item 2 — Review log persist queue (`src/hooks/useCardAnnotations.ts` + new helper in `src/lib/db-queries.ts`)

Today every `reviewSection` call fires an isolated `db.reviewLog.add(entry)`. During a fast streak (10+ reviews/sec in Zen) this floods Dexie's serialized write queue, contending with the cards persist queue and degrading typing/UI responsiveness.

**Strategy** — module-level micro-queue in `db-queries.ts`, drained by a 250 ms debounce timer using `db.reviewLog.bulkAdd`. Pattern modeled on the existing cards `persist-queue.ts` but simpler (append-only, no de-dup needed because every entry is unique).

### Add to `src/lib/db-queries.ts`

```ts
const _reviewLogQueue: ReviewLogEntry[] = [];
let _reviewLogTimer: ReturnType<typeof setTimeout> | null = null;
const REVIEW_LOG_DEBOUNCE_MS = 250;

function _flushReviewLogQueue(): Promise<void> {
  _reviewLogTimer = null;
  if (_reviewLogQueue.length === 0) return Promise.resolve();
  const batch = _reviewLogQueue.splice(0, _reviewLogQueue.length);
  return db.reviewLog.bulkAdd(batch).catch(err => {
    console.error("[reviewLog] bulk write failed", err);
    // Re-queue so we don't silently lose entries on transient failures
    _reviewLogQueue.unshift(...batch);
    throw err;
  });
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
```

The signature changes from `Promise<void>` → `void`. This is intentional — the call site doesn't await success of an individual write, only of the eventual flush. The current `await idbAddReviewLogEntry(entry)` only wraps the synchronous enqueue, so removing the `await` is functionally equivalent.

### Update `src/hooks/useCardAnnotations.ts` lines 72–80

```ts
// Persist review log OUTSIDE the state updater to avoid nested setState.
// Batched + debounced (250 ms) inside idbAddReviewLogEntry to avoid IDB queue floods.
try { idbAddReviewLogEntry(entry); }
catch (err) {
  console.error("[reviewSection] log enqueue failed", err);
  void import("sonner").then(({ toast }) => toast.error("Memorija puna, istorija učenja se ne čuva!"));
}
```

(The async IIFE wrapper goes away.) Errors during the actual `bulkAdd` flush are logged in `_flushReviewLogQueue` itself; re-queuing on failure preserves the previous "best effort" semantics.

### Wire `flushReviewLogQueue` into export/backup paths

Audit existing call sites of `idbAddReviewLogEntry` and any `reviewLog.toArray()` reader used by exports/backups:
- `src/hooks/useCardExport.ts` — call `await flushReviewLogQueue()` before reading `reviewLog`.
- `src/main.tsx` boot/restore paths and `src/lib/sources-storage.ts` Full Restore — ensure flush before `db.delete()`.

Will inspect during implementation; the change is additive.

## Item 3 — `src/lib/metacognitive-storage.ts`

Add a single helper near `loadCalibration` (line 88):

```ts
/** Filter the calibration cache to entries belonging to a specific set of
 *  card IDs. O(N) over the (capped) cache; uses Set lookup for O(1) membership.
 *  Use when the UI needs per-card calibration without paying the cost of
 *  scanning a 2 000-entry array on every render. */
export function loadCalibrationForCardIds(cardIds: Set<string>): CalibrationEntry[] {
  if (cardIds.size === 0) return [];
  const out: CalibrationEntry[] = [];
  for (const e of _calibrationCache) {
    if (cardIds.has(e.cardId)) out.push(e);
  }
  return out;
}
```

Pure addition; no existing call site changes. Callers that currently do `loadCalibration().filter(e => ids.includes(e.cardId))` (O(N·M) with `Array.includes`) can migrate to the Set-based helper opportunistically. No mass rewrite in this pass.

## Verification plan

- TypeScript build clean (no `any`, typed catches).
- Existing tests (`examiner-profile-cache.test.ts`, `zettelkasten-bulk-create.test.ts`) still pass — neither touches the changed surfaces.
- Manual: a fast review streak should now produce a single `bulkAdd` per ~250 ms instead of N individual `add` calls (verify via Dexie devtools or temporary console.count in `_flushReviewLogQueue`).

## Files

- **Edit**: `src/lib/examiner-profile-cache.ts`
- **Edit**: `src/lib/db-queries.ts`
- **Edit**: `src/hooks/useCardAnnotations.ts`
- **Edit**: `src/lib/metacognitive-storage.ts`
- **Possibly edit**: `src/hooks/useCardExport.ts` (add flush) — pending audit during implementation
