

# Deep Static System Audit — Report v2

---

## 🔴 CRITICAL (App crashes, infinite loops, data loss)

### C1: `renameCategory` — Stale closure defeats `aborted` flag
**File:** `src/hooks/useCategoryManagement.ts` — Lines 23-51

The `aborted` variable is set inside the `setCategories` functional updater, but `setCardMapState` runs **asynchronously in a separate React batch**. By the time `setCardMapState` reads `aborted`, the `setCategories` updater has already completed — but `aborted` is a **local variable** outside the updater, not a ref. The actual issue: `aborted` is set to `true` inside the updater callback, and then checked **synchronously after** the `setCategories` call. However, React 18's automatic batching may **defer** the updater execution, meaning `aborted` could still be `false` when `setCardMapState` runs. If the user renames to a duplicate name during a batched update, **cards get their category changed to the duplicate name while the category list rejects it**, orphaning those cards.

**Impact:** Cards moved to a non-existent category = invisible data.

### C2: `bulkFlagNeedsReview` / `reorderCards` / `bulkUpdateChapter` — cardMapRef mutation inside setState
**File:** `src/hooks/useCardAnnotations.ts` — Lines 144-199

These three functions mutate `cardMapRef.current[id]` **inside** the `setCardMapState` updater callback. If React calls the updater twice (StrictMode), the ref gets mutated with stale `prev` data on the second pass. The `schedulePersist` call happens **after** `setCardMapState`, reading from the ref that was set during the updater — but if React discarded the first updater result, the persisted cards may not match the final state.

**Impact:** Under StrictMode or concurrent features, persisted IDB data diverges from React state.

### C3: Overwrite import doesn't clear IDB subcategories
**File:** `src/hooks/useCardImport.ts` — Lines 113-125

When `strategy === "overwrite"`, categories are fully replaced (`setCategories(() => data.categories)`), but subcategories use the same codepath as non-overwrite — `setSubcategories(() => data.subcategories)`. The `setSubcategories` wrapper in `useCards.ts` (line 71) calls `idbSaveSubcategories` which does a surgical upsert (bulkPut + delete orphans). This is correct. **However**, if the imported file has **no** `subcategories` key, the existing subcategories in IDB survive the overwrite silently — no clearing happens.

**Impact:** Stale subcategories persist after "full overwrite" import if the backup file predates the subcategories feature.

---

## 🟠 HIGH RISK (UI bugs, logical errors, missing fallbacks)

### H1: Forum fingerprint ignores source registry changes
**File:** `src/lib/forum-logic.ts` — Lines 186-198

`buildFingerprint()` uses `cards.length`, section counts, stability sum, `reviewLogLen`, and `sourceCount`. It does **not** include any signal from the source registry (alias map, monument types, category overrides). When a user reassigns a source alias in the Registry, `registryVersion` bumps in `RomanForumPage`, but the fingerprint hasn't changed → `calculateForumState` returns the **cached** result with the old monument groupings.

The `registryVersion` is in the `useMemo` deps, which forces re-execution, but `calculateForumState` internally short-circuits via the fingerprint cache. **Net effect:** Registry changes are invisible until a card is reviewed.

**Fix needed:** Include `registryVersion` or a registry hash in the fingerprint.

### H2: `mapToArray` version cache is a global singleton
**File:** `src/lib/persist-queue.ts` — Lines 16-29

`_mapVersion`, `_cachedVersion`, and `_cachedArray` are module-level globals. In StrictMode double-mount, two `useCards` instances share the same counter. More critically, `bumpMapVersion()` is called from multiple unrelated operations (CRUD, reorder, import), and the cached array is only rebuilt when `mapToArray` is called with a new map reference. If `bumpMapVersion()` is called but `mapToArray` is called with the **same** `cardMap` object reference (e.g., after a state update that returned the same object), the version mismatch forces an unnecessary `Object.values()` rebuild.

**Impact:** Minor — unnecessary O(n) work in edge cases, not a correctness bug.

### H3: `exportData` captures stale `cards` from closure
**File:** `src/hooks/useCardExport.ts` — Lines 89-157

`exportData` is a `useCallback` with `[cards, categories, subcategories, srSettings]` deps. It uses `cards` from the closure for the export payload. But during the `await Promise.all(...)` for sources/mindMaps/etc., the user could add or modify cards. The exported `cards` array won't include those changes because it's from the closure snapshot, while `fullReviewLog` and `sources` are freshly loaded from IDB.

**Impact:** Export asymmetry — reviewLog may reference cards not in the exported cards array. Low probability in practice.

### H4: DnD MeasuringStrategy.Always without container offset compensation
**File:** `src/components/MentalSkeleton.tsx` — Line 346

`MeasuringStrategy.Always` recalculates droppable rects on every pointer move. If the `MentalSkeleton` is rendered inside a scrollable container with CSS transforms (e.g., `mx-auto`, or inside `MainLayout` with `overflow-auto`), the measured coordinates can drift from visual positions. The component doesn't use `modifiers` or a custom `collisionDetection` to compensate.

**Impact:** Cards may drop into wrong chapters if the page is scrolled during drag.

### H5: `SessionContext.endSession` doesn't persist snapshot reviews to IDB
**File:** `src/contexts/SessionContext.tsx` — Lines 83-111

The `endSession` callback flushes queued reviews via `flushReviews(reviews)`, which calls `reviewSection` for each. But `reviewSection` writes to IDB asynchronously via `idbAddReviewLogEntry`. If the user closes the tab immediately after session end, the 2500ms processing timeout means `setSnapshot(null)` runs — but the async IDB writes may not have completed. The `visibilitychange` handler only flushes the card persist queue, **not** the review log entries.

**Impact:** Review history loss on immediate tab close after session end.

---

## 🟡 BOTTLENECKS (Performance drops, unnecessary re-renders)

### B1: `useCardContext()` creates a new merged object on every render
**File:** `src/contexts/AppContext.tsx` — Lines 115-119

`useCardContext()` calls `useMemo(() => ({ ...data, ...actions }), [data, actions])`. Since `data` changes on every card mutation (new object reference from the `data` useMemo), every consumer of `useCardContext()` gets a new merged object on every mutation. Components that only need actions (e.g., `SourceManager`) still re-render because the merged object reference changes.

**Impact:** All `useCardContext()` consumers re-render on every card state change. Use `useCardData()` or `useCardActions()` separately for isolation.

### B2: `calculateForumState` iterates all cards 3× (monument build + overall + fingerprint)
**File:** `src/lib/forum-logic.ts` — Lines 203-294

Three separate O(n×s) loops:
1. `buildFingerprint()` — iterates all sections
2. Per-category `buildMonument()` — iterates category cards
3. Overall mastery loop — iterates all cards again

Could be fused into a single pass. With 5000+ cards and 5+ sections each, this is ~75K iterations per render.

### B3: `SourceManager.tsx` loads sources on every mount
**File:** `src/components/SourceManager.tsx` — Line 1+ (useEffect with `loadSources()`)

Every time the Source Registry page mounts, it calls `loadSources()` which does `db.sources.toArray()`. For large source collections (50+ laws with full HTML), this can take 200-500ms. No caching layer exists between the component and IDB for sources.

### B4: Pomodoro timer causes 1 re-render/second across all `usePomodoroContext` consumers
**File:** `src/contexts/AppContext.tsx` — Lines 187-233

The `useGlobalPomodoro` hook returns a new `useMemo` object every second (because `seconds` changes). All consumers of `usePomodoroContext()` re-render every second while the timer runs. This is already isolated from the main UI via `PomodoroContext`, but any component that imports `usePomodoroContext` (TopNav timer display) will re-render at 1Hz.

**Impact:** Minor — only affects TopNav and PomodoroTimer components.

---

## Summary

| Severity | Count | Key Risk |
|----------|-------|----------|
| 🔴 CRITICAL | 3 | Category rename data orphaning, StrictMode ref mutation, incomplete overwrite import |
| 🟠 HIGH | 5 | Forum cache staleness, export asymmetry, DnD offset drift, session review loss |
| 🟡 BOTTLENECK | 4 | Context re-renders, triple card iteration, source loading, timer renders |

