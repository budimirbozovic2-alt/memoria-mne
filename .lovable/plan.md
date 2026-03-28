

# Deep Static System Audit — Report v5

---

## 🔴 CRITICAL (App crashes, infinite loops, data loss)

### C1: `renameCategory` — `aborted` flag set inside `setCategories` updater, read synchronously outside
**File:** `src/hooks/useCategoryManagement.ts` — Lines 28-33

`setCategories` wraps `setCategoriesState` and calls `idbSaveCategories(next)` inside (useCards.ts line 63-69). The functional updater runs synchronously today, so `aborted = true` inside the updater is visible at line 33. **However**, `setCategories` is a `useCallback` that wraps `setCategoriesState` — the updater IS synchronous in React 18 when called from a synchronous context. But if `renameCategory` is ever called from within `startTransition`, `flushSync`, or an async boundary, `setCategoriesState` could batch-defer the updater, and `aborted` would remain `false`. The subsequent `cardMapRef` mutations (lines 36-50) would proceed with the rename, creating duplicate category data.

**Current risk:** Low (only triggers if called from `startTransition`). **Latent severity:** Data corruption.

### C2: `logError` mutates cloned `existing` object in-place
**File:** `src/hooks/useCardAnnotations.ts` — Lines 88-93

`errorLog` is shallow-cloned with `[...(c.errorLog || [])]`, but `existing` is a reference to an object inside that shallow copy (same object as in the original `c.errorLog`). Lines 90-92 mutate `existing.count`, `existing.lastMissed`, `existing.successStreak` directly — this **mutates the original card's errorLog entries in cardMapRef**. Since `patchCard` reads from `cardMapRef.current`, the next `patchCard` call for the same card will see the already-mutated errorLog. This causes:
1. Double-counting if `patchCard` re-reads the card between the ref write and state write
2. Breaks React's immutability contract — previous renders reference mutated objects

### C3: `ReviewSession` resume doesn't recompute `items` — uses stale `items: []`
**File:** `src/components/ReviewSession.tsx` — Lines 71-83 vs 121

When `resumeSession` is called, it sets `mode` and `randomIndex` but **never sets `items`**. `items` stays as `[]` (initial state from line 19). At line 121, `const currentItem = items[randomIndex]` reads `undefined`. Line 134 `if (finished || !currentItem)` catches this and shows `ReviewComplete` — so the user sees "session complete" instead of resuming. **Resume is silently broken.**

---

## 🟠 HIGH RISK (UI bugs, logical offsets, missing fallbacks)

### H1: `electron/window.cjs` — `ipcMain.removeHandler('window-is-maximized')` throws on second crash
**File:** `electron/window.cjs` — Line 173

`ipcMain.removeHandler` throws if the handler name isn't registered. On the second crash recovery, the first recovery already removed it, so line 173 throws `Error: Attempted to remove a non-existent handler`. This crashes the main process during recovery, preventing the app from restarting.

### H2: `useDashboardData` calls `autoRedistributeIfNeeded` (IDB side effect) inside `useDeferredCompute`
**File:** `src/hooks/useDashboardData.ts` — Line 152

`autoRedistributeIfNeeded` writes to IDB planner settings. It's called inside a `useDeferredCompute` callback which runs in `requestIdleCallback`. If the component unmounts and remounts (React StrictMode, route change), the compute runs twice, potentially double-redistributing cards. The `useDeferredCompute` cancellation guard (line 14: `cancelled`) prevents `setResult` but the side effect has already fired.

### H3: `_mtHashCache` in forum-logic is only invalidated by `invalidateMonumentTypesCache` — never on load
**File:** `src/lib/forum-logic.ts` — Lines 201-208

`getMonumentTypesHash()` returns cached `_mtHashCache` forever after first call. If monument types are changed via `saveMonumentType()` which calls `invalidateMonumentTypesCache()`, the hash resets. But if localStorage is modified externally (import, another tab), `_mtHashCache` remains stale, causing the forum fingerprint to match incorrectly and returning cached forum state with wrong building types.

### H4: `importCards` missing `cardMapRef` in `useCallback` dependencies
**File:** `src/hooks/useCardImport.ts` — Line 261

`importCards` uses `cardMapRef` (line 253) but the dependency array is `[setCategories, setCardMapState]`. Missing `cardMapRef`. Since refs are stable this won't cause bugs, but it's a lint violation that could mask future issues if the ref were replaced with a different reference.

### H5: `splitCard` creates new cards with `createCard` metadata but copies section FSRS state
**File:** `src/hooks/useCardCRUD.ts` — Lines 164-173

`splitCard` calls `createCard(...)` which creates fresh FSRS sections, then immediately overwrites `sections: [{ ...section }]` with the original section's FSRS state. The `createCard` call generates a fresh `id`, `createdAt`, etc., but the section preserves its `lastReviewed`, `stability`, `nextReview` — this is correct. However, the new card inherits `question: card.question` for ALL split cards, making them indistinguishable in the card list. Only the section title differentiates them.

---

## 🟡 BOTTLENECKS (Performance drops, unnecessary re-renders)

### B1: `MentalSkeleton` recomputes on every unrelated card mutation
**File:** `src/components/MentalSkeleton.tsx` — Lines 69-90

`subCards` depends on `cards` (the full array). Since `cards = mapToArray(cardMap)` creates a new array on every `cardMap` change via `bumpMapVersion()`, any card mutation (even in a different category) triggers recomputation of `subCards`, `chapters`, `cardsByChapter`, and all downstream rendering. For 5000+ cards this cascades into significant wasted work.

### B2: `calcActualRatio` iterates full `reviewLog` on every dashboard render
**File:** `src/hooks/useDashboardData.ts` — Lines 31-57

`calcActualRatio` iterates the entire review log to build `sectionFirstSeen` map. For 10000+ review entries, this is O(n) on every render where `reviewLog` reference changes. The `useMemo` depends on `[reviewLog, cards]` — since `cards` changes on any card mutation, this recomputes even when review log hasn't changed.

### B3: `buildFingerprint` still iterates all cards every time forum is checked
**File:** `src/lib/forum-logic.ts` — Lines 211-223

Even with the `_mtHashCache` optimization, `buildFingerprint` iterates all cards to count sections/stability. For 5000+ cards with 3 sections each, this is 15000 iterations on every render that touches the forum. The fingerprint itself is cheap (just counting), but it runs on every `calculateForumState` call.

### B4: `reviewSection` creates a new `reviewLog` array on every grade
**File:** `src/hooks/useCardAnnotations.ts` — Line 60

`setReviewLog((log) => [...log, entry])` creates a new array every time a section is reviewed. For a 50-card review session, this triggers 50 `cards` + `reviewLog` dependency changes in `useDashboardData`, cascading through all memos. The spread `[...log, entry]` copies the entire log (potentially 10000+ entries) on each grade.

---

## Summary

| Severity | Count | Key Risk |
|----------|-------|----------|
| 🔴 CRITICAL | 3 | Category rename race (latent), errorLog in-place mutation, review resume broken |
| 🟠 HIGH | 5 | Double crash recovery throws, side effects in deferred compute, stale monument cache, missing dep, split card UX |
| 🟡 BOTTLENECK | 4 | MentalSkeleton cascading recompute, full reviewLog iteration, forum fingerprint iteration, reviewLog array copying |

