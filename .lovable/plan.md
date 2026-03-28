

# Deep Static System Audit Report

---

## 🔴 CRITICAL (App crashes, infinite loops, data loss)

### C1. `ensureDbOpen` retry creates orphan DB connection — potential data split
**[src/lib/db.ts: 210-215]**
After `VersionError` deletes the DB, the retry logic creates a `new MemoriaDB()` instance (`freshDb`) and opens it. But the app continues to use the module-level `db` singleton. The `freshDb` instance is never closed, creating a dangling open connection that can **block** the singleton's `tryOpen()` retry via the `"blocked"` event. If this happens, the app enters a dead state with `dbErrorState = timeout` and no recovery path — the user sees a permanent error screen.

### C2. `categoryStats` keyed by category NAME, cards keyed by `categoryId` UUID — silent mismatch
**[src/hooks/useCards.ts: 177-208]**
The `catAccum` is initialized using `categories` (string names), but `card.categoryId` is a UUID. The lookup `catAccum[card.categoryId]` on line 203 will **always** return `undefined` because UUIDs never match category names. Result: `categoryStats` shows 0 score / 0 total / 0 due for ALL categories. Dashboard "weakest categories" and Stats "category chart" are both silently empty. **No crash, but complete data loss in analytics views.**

### C3. `setCategories` persists by NAME lookup — loses UUID identity on reorder
**[src/hooks/useCards.ts: 86-107]**
`setCategories` loads existing `CategoryRecord[]`, builds a `Map<name, record>`, then reconstructs records by matching names. If two categories share the same name (edge case but possible via import), this silently merges them. More critically, any category rename that hasn't flushed to IDB yet will create a **duplicate** record with a new UUID, orphaning all cards that referenced the old UUID.

### C4. `persist-queue` visibilitychange listener never cleaned up
**[src/lib/persist-queue.ts: 99-106]**
The `document.addEventListener("visibilitychange", ...)` is registered at module scope with no cleanup. In Vite HMR, this module can be re-evaluated, stacking duplicate listeners. Each listener independently calls `flush()`, which can cause concurrent IDB writes on the same batch, potentially corrupting data or throwing `ConstraintError`.

---

## 🟠 HIGH RISK (UI bugs, logical offsets, missing fallbacks)

### H1. `cardCountByCategory` uses UUID, `categoryStats` uses NAME — inconsistent keys
**[src/hooks/useCards.ts: 184 vs 203]**
`countByCategory[card.categoryId]` correctly uses UUID (line 184). But `catAccum[card.categoryId]` is initialized by name (line 177). Components consuming both will get mismatched keys. Any UI rendering "due cards per category" alongside "card count per category" will show contradictory data.

### H2. `useDashboardData` and `useStatsData` access `categoryStats[cat]` where `cat` is a NAME string
**[src/hooks/useDashboardData.ts: 189-191, src/hooks/useStatsData.ts: 93-97]**
These access `categoryStats` by category name, which is technically correct if `categoryStats` were keyed by name (it is, per the `catAccum` initialization). But since `catAccum[card.categoryId]` never matches (C2 above), these views always show empty arrays. Even if C2 is fixed to use UUIDs, these consumers will need to be updated to use UUIDs too.

### H3. MnemonicWorkshop graduation logic missing — `patchCard` not wired
**[src/components/MnemonicWorkshop.tsx: 11-16]**
The `Props` interface has no `patchCard` prop. The plan called for adding graduation logic (stamping cards with `"mnemonic"` tag when status = "ready"), but `MnemonicWorkshop` only receives `onUpdateCard` (which updates `MnemonicCard` in localStorage, not the real `Card` in IDB). The graduation bridge between the mnemonic system and the FSRS card system is **not connected**.

### H4. `reorderCategories` bypasses `categoryRecordsState` — sidebar stale after reorder
**[src/hooks/useCards.ts: 241-257]**
`reorderCategories` updates `setCategoriesState` (string[]) and persists to IDB, but never calls `setCategoryRecordsState`. The sidebar reads from `categoryRecords` (from context), which remains in the old order until the next full page refresh.

### H5. `dbError` check blocks ALL children including Toaster
**[src/contexts/AppContext.tsx: 284-291]**
When `h.dbError` is truthy, `CardProvider` returns `DatabaseRecoveryPanel` without wrapping it in `CardActionsContext.Provider` or `CardDataContext.Provider`. Any child that calls `useCardActions()` or `useCardData()` during the error state (e.g., `ProcessingOverlay` or `ForumTransition`) will throw "must be used within CardProvider", causing a cascade crash that hides the recovery panel.

### H6. `reorderSubcategories` doesn't persist to IDB
**[src/hooks/useCards.ts: 259-264]**
Unlike `setSubcategories` which has async IDB persistence logic, `reorderSubcategories` only updates React state. Subcategory reordering is lost on refresh.

---

## 🟡 BOTTLENECKS (Performance drops, unnecessary re-renders)

### B1. `useCardContext()` creates a new merged object on every data change
**[src/contexts/AppContext.tsx: 117-121]**
`useCardContext` calls `useMemo(() => ({ ...data, ...actions }), [data, actions])`. Since `data` changes on every card mutation and `actions` is a Proxy, this spread creates a new object every time `data` changes, causing re-renders in all 20+ consumers of `useCardContext()`. Components that only need actions still re-render on data changes.

### B2. `getCategoryStats` in spaced-repetition.ts is O(N) per category — called redundantly
**[src/lib/spaced-repetition.ts: 366-372]**
The standalone `getCategoryStats()` function does a full `cards.filter()` per category. While `useCards.ts` has an optimized single-pass version (line 167), any component that imports and calls `getCategoryStats` directly bypasses the optimization and re-scans the entire card array.

### B3. Pomodoro timer causes AppProvider subtree re-render every second
**[src/contexts/AppContext.tsx: 189-216]**
The `setSeconds` call fires every 1000ms while running, changing `pom.state.seconds`. The `PomodoroContext.Provider` value recalculates via `useMemo` every second. While `PomodoroContext` is isolated, any component using `usePomodoroContext()` re-renders every second — check if `PomodoroTimer` is the only consumer.

### B4. `mapToArray` cache uses module-level version counter — breaks with StrictMode double-render
**[src/lib/persist-queue.ts: 17-29]**
`bumpMapVersion()` is called inside action handlers. In React StrictMode, the action handler runs twice, bumping version twice but `setCardMapState` only commits once. The cached array stays valid, but `_mapVersion` drifts ahead of actual renders, causing unnecessary `Object.values()` recomputation on next access.

### B5. `lazy(() => import(...))` inside render function (conditional)
**[src/contexts/AppContext.tsx: 285]**
`const DatabaseRecoveryPanel = lazy(...)` is created inside the render path of `CardProvider`. React docs warn against creating lazy components during render — it should be hoisted to module scope. Currently it works but creates a new lazy wrapper on every render when `dbError` is truthy.

---

## Summary

| Severity | Count | Most Urgent |
|----------|-------|-------------|
| 🔴 CRITICAL | 4 | C2 (categoryStats UUID mismatch) — silently breaks all analytics |
| 🟠 HIGH | 6 | H5 (dbError cascade crash) |
| 🟡 BOTTLENECK | 5 | B1 (useCardContext spread) |

**Recommended fix order:** C2 → C1 → H5 → C3 → H4 → H3 → C4 → remainder

