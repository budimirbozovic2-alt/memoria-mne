

# Deep Static System Audit — Report v4

---

## 🔴 CRITICAL (App crashes, infinite loops, data loss)

### C1: `renameCategory` / `deleteCategory` / `renameSubcategory` — `changed` array populated inside `setCardMapState` updater but read outside
**File:** `src/hooks/useCategoryManagement.ts` — Lines 36-48, 62-74, 103-115

The `changed` array is declared before `setCardMapState`, populated inside the updater function, then used outside at `schedulePersist({ type: "bulk", cards: changed })`. This pattern relies on React executing the functional updater synchronously (which it does today in React 18 for `setState` calls in the same synchronous stack). However, `setCardMapState` is the raw `useState` setter passed from `useCards`, NOT the wrapped `setCategories` (which has IDB side effects). If React batching behavior changes or these are called from an async context, `changed` could be empty when `schedulePersist` reads it, causing **cards to be visually renamed in state but never persisted to IDB**. On restart, cards revert to old category names — **silent data orphaning**.

**Current risk:** Low (works today), but fragile.

### C2: `ipcMain.once('renderer-ready', showWindow)` handler leaks on crash recovery
**File:** `electron/window.cjs` — Line 212

On crash recovery (line 168-177), `win.destroy()` is called and a new `createWindow` is invoked. The old `ipcMain.once('renderer-ready', showWindow)` listener is already consumed or destroyed with the old window. However, `ipcMain.removeHandler('window-is-maximized')` on line 173 will throw if called twice (Electron doesn't allow removing a handler that doesn't exist). If the crash recovery fires before the `once` handler fires, the `once` listener referencing the destroyed `win` still exists on `ipcMain` — it won't crash (guards check `appReady`) but it's a dead listener.

### C3: `importData` overwrite strategy doesn't clear orphan records for `pomodoroLog` if backup has zero entries
**File:** `src/hooks/useCardImport.ts` — Lines 186-207

The `hasExtraTables` check (line 185) only enters the IDB restoration block if at least one table has data. If a backup has `pomodoroLog: []` (empty array), the existing pomodoroLog data in IDB is NOT cleared during overwrite. This means stale pomodoro records from a previous import survive an "overwrite" import, producing phantom statistics. Same applies to all auto-increment tables when the backup has empty arrays.

---

## 🟠 HIGH RISK (UI bugs, logical offsets, missing fallbacks)

### H1: `exportTemplate` uses closure `cards` (stale), but `exportData` reads fresh from IDB (inconsistency)
**File:** `src/hooks/useCardExport.ts` — Lines 56-87 vs 89-161

`exportData` was fixed (H3 from prior audit) to read fresh cards from IDB. But `exportTemplate` at line 58 still uses `cards` from the closure prop. If a user edits a card and immediately exports a template before re-render, the template contains stale data. Not critical for templates (which strip FSRS data), but `question` and `sections.content` could be stale.

### H2: `ReviewSession` saves session state to `localStorage` — not cleared on overwrite import
**File:** `src/components/ReviewSession.tsx` — Lines 30-44

When an overwrite import occurs, localStorage keys like `sr-review-session` are NOT cleared. On next review, `resumeSession` could reference a `randomIndex` pointing to a card that no longer exists in the new dataset, causing undefined behavior (accessing `items[randomIndex]` where `randomIndex` > `items.length`).

### H3: `buildFingerprint` calls `loadMonumentTypes()` which does `JSON.stringify` on every invocation
**File:** `src/lib/forum-logic.ts` — Line 213

`buildFingerprint` is called on every `calculateForumState` invocation. Line 213 does `JSON.stringify(loadMonumentTypes())` — this serializes the entire monument types object every time to check cache validity. While `loadMonumentTypes` itself is cached, the `JSON.stringify` is O(k) where k = number of categories. For 50+ categories this becomes noticeable, especially since the fingerprint is checked on every render that passes through `ForumProvider`.

### H4: `_tryLoadFromIDB` async fallback may hydrate AFTER first Forum render
**File:** `src/lib/source-registry.ts` — Lines 56-76

When `loadSourceRegistry()` finds localStorage empty, it returns `{ aliases: [], overrides: [] }` immediately and fires `_tryLoadFromIDB()` asynchronously. If IDB has valid data, it hydrates the cache and calls `_notifyRegistry()`. But Forum components that already rendered with the empty registry won't re-render unless they explicitly listen to `onRegistryChanged`. The `ForumContext` doesn't subscribe to registry changes — it relies on `registryVersion` prop. This means the Forum could render with empty aliases until the next card mutation triggers a re-render.

### H5: `importCards` (batch import from DOCX/template) doesn't sync `cardMapRef`
**File:** `src/hooks/useCardImport.ts` — Lines 236-251

`importCards` updates `setCardMapState` and `schedulePersist`, but doesn't update `cardMapRef.current`. If another action (e.g., `patchCard`, `bulkFlagNeedsReview`) runs before React's `useEffect` syncs the ref, those actions read stale ref data and may overwrite the newly imported cards.

---

## 🟡 BOTTLENECKS (Performance drops, unnecessary re-renders)

### B1: `useDashboardData` imports and calls heavy planner functions synchronously
**File:** `src/hooks/useDashboardData.ts` — Lines 1-60

`loadPlanner()`, `calcVelocity()`, `loadDisciplineLog()`, `loadSlippageLog()` are all called inside `useMemo`. These read from in-memory caches (fast), but `autoRedistributeIfNeeded` and `recordDayDiscipline` have IDB write side effects called inside a `useMemo` — this is a React anti-pattern. Side effects in `useMemo` are not guaranteed to run exactly once and could fire multiple times during concurrent rendering.

### B2: Pomodoro context changes every second — `useMemo` depends on `seconds`
**File:** `src/contexts/AppContext.tsx` — Lines 228-232

`useMemo` for the pomodoro return value depends on `seconds`, creating a new object every second. All consumers of `usePomodoroContext()` re-render at 1Hz. Since Pomodoro is in its own isolated context, impact is limited to TopNav and PomodoroTimer components — but those components are always mounted.

### B3: `MentalSkeleton` recomputes `cardsByChapter` on every `subCards` change
**File:** `src/components/MentalSkeleton.tsx` — Lines 80-90

`subCards` is derived from `cards.filter(...)` which creates a new array reference whenever `cards` (the full array) changes — even if the relevant subcategory's cards didn't change. This cascades through `chapters`, `unassignedCards`, `cardsByChapter`, and `allChapters`, causing full re-computation of the chapter layout on unrelated card mutations.

### B4: `LearnSession` re-imports `@/lib/db` on every filter change
**File:** `src/components/LearnSession.tsx` — Lines 52-61

The `useEffect` that loads chapter settings does a dynamic `import("@/lib/db")` on every `selectedCategory` or `selectedSubcategory` change. While Vite caches dynamic imports after first load, the `then` chain creates new closures and promise objects each time, adding GC pressure during rapid filter changes.

---

## Summary

| Severity | Count | Key Risk |
|----------|-------|----------|
| 🔴 CRITICAL | 3 | Category rename persistence race, IPC handler leak, overwrite import doesn't clear empty tables |
| 🟠 HIGH | 5 | Template export staleness, review session stale resume, fingerprint serialization cost, async registry hydration, importCards ref desync |
| 🟡 BOTTLENECK | 4 | Dashboard side-effects in useMemo, Pomodoro 1Hz renders, MentalSkeleton cascading recompute, LearnSession dynamic import churn |

