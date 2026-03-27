

# Step 4: Final Polishing — Validation Report

## TASK 1: React Hook Audit

### Dependency Arrays — All Clear
All scanned `useEffect`, `useMemo`, and `useCallback` hooks have correct dependency arrays. No stale closures or infinite loop risks detected. Key observations:
- `LearnPage.tsx` has an intentional `// eslint-disable-next-line react-hooks/exhaustive-deps` on `startSession` — this is correct (one-time init)
- `usePlannerData.ts` — `disciplineLog` and `disciplineTrend` use `useMemo(() => ..., [])` (load-once semantics) — correct for cached data
- `HealthMonitor.tsx` — `refresh` in `useCallback([], [])` then `useEffect([refresh])` — correct

### Memory Leak Check — All Clear
Every `useEffect` with `addEventListener`, `setInterval`, `setTimeout`, `ResizeObserver` has proper cleanup:
- `ScrollableRow.tsx` — removes scroll listener + disconnects ResizeObserver ✅
- `MnemonicTest.tsx` — `clearInterval` in effect cleanup ✅
- `SpeedReader.tsx` — timer cleared; TTS timeout cleared (just fixed) ✅
- `ZenMode.tsx` — interval cleared ✅
- `AppContext.tsx` — interval cleared ✅
- `GlobalSearch.tsx`, `MainLayout.tsx`, `TopNav.tsx`, `ReviewCard.tsx` — all remove keydown listeners ✅

### Tailwind Config — One Fix Needed
Current `content` array: `["./pages/**/*", "./components/**/*", "./app/**/*", "./src/**/*"]`
The first 3 paths are vestigial (no top-level `pages/`, `components/`, `app/` dirs exist). Harmless but messy. **Minor cleanup recommended** — remove the 3 unused globs.

---

## TASK 2: TypeScript Hardening

### Remaining `any` Types — 18 files, ~45 instances

**Priority 1 — Planner component props (easy, high impact):**

| File | Location | Fix |
|------|----------|-----|
| `planner/RoadmapTab.tsx` | `burnupData: any[]`, `phaseProgressList: any[]` | Define `BurnupDataPoint` and `PhaseProgressItem` interfaces |
| `planner/OperationsTab.tsx` | `phaseProgressList: any[]`, `dynamicDates: any[]`, `smartSuggestion: any`, `timeRec: any`, `debt: any` | Same interfaces, derive from `planner-storage.ts` return types |
| `planner/DisciplineTab.tsx` | `disciplineLog: any[]`, `disciplineTrend: any[]` | Use `DisciplineEntry` (already exported) + define `DisciplineTrendPoint` |
| `planner/planner-constants.tsx` | `ChartTooltip` props `any`, `payload.map((p: any))` | Define `RechartsTooltipProps` interface |

**Priority 2 — Import/Export (justified `any` — dynamic JSON parsing):**

| File | Location | Verdict |
|------|----------|---------|
| `useCardImport.ts` | `parsed: any`, `migrateImported(c: any)`, `(db as any)[table]` | Keep `parsed: unknown` + type guards; `(db as any)` is unavoidable for dynamic table access |
| `useCardExport.ts` | `dataAny = data as any`, `localStorageData: Record<string, any>` | Replace with `Record<string, unknown>` + typed extraction |

**Priority 3 — Miscellaneous:**

| File | Location | Fix |
|------|----------|-----|
| `EditPage.tsx` | `handleUpdate(id, u: any)`, `setView(returnTo as any)` | Type `u` as `Partial<Card>`, create union type for views |
| `chart-tooltip.tsx` | `payload?: any[]` | Define `RechartsPayloadItem` |
| `LazyChart.tsx` | `(window as any).requestIdleCallback` | Use proper `Window` augmentation in `vite-env.d.ts` |
| `useDeferredCompute.ts` | Same `requestIdleCallback` cast | Same fix |
| `sounds.ts` | `(window as any).webkitAudioContext` | Window augmentation |
| `MindMapCanvas.tsx` | `(edge.style as any)`, `(data as any)` | Use `MindMapNodeData` / typed edge styles |
| `planner-storage.ts` | Migration code `(parsed as any).decades` | Use type guard: `if ('decades' in parsed)` |
| `db.ts` | `(err as any)?.inner?.name` | Use `(err as Record<string, any>)?.inner` or type guard |
| `CardList.tsx` | `listRef as any` | Proper ref typing for virtuoso |
| `SourcesView.tsx` | `(window as any).electronAPI` | Already typed globally — just use `window.electronAPI` |

### Type Consolidation
Currently types are scattered. Create `src/types/index.ts` to re-export shared types:
- `Card`, `Section`, `SRSettings` from `spaced-repetition.ts` — already centralized, just add re-export
- `BurnupDataPoint`, `PhaseProgressItem`, `DisciplineTrendPoint` — new interfaces for planner
- `RechartsPayloadItem` — shared recharts tooltip type
- `ViewName` union type for navigation

---

## TASK 3: UI/UX Polishing

### Loading States — Mostly Covered
- Dashboard: has skeleton via `useDashboardData` ✅
- Card list: shows filtered count / empty message ✅
- Sources: loads async, shows list — **missing loading spinner during `loadSources()`**
- MindMapList: loads async — **missing loading state during `refresh()`**
- GlobalSearch: loads sources/mindmaps on open — acceptable (fast)

### Empty States — Mostly Covered
- Dashboard empty: uses `EmptyState` component ✅
- Review session: uses `EmptyState` ✅
- CardsView with filters: shows "Nema kartica" ✅
- **MindMapList with no maps**: needs empty state
- **SourcesView with no sources**: needs empty state (currently just blank)

### Error Boundaries — Complete
All pages wrap content in `<ErrorBoundary>` with `label` and `onNavigateHome`. Compact mode exists for widgets. Reset button works. ✅

### Accessibility — Needs Attention
**Zero `aria-label` attributes found in the entire codebase.** Key items to add:
- Navigation buttons in TopNav (hamburger, lab menu)
- Scroll buttons in ScrollableRow
- Grade buttons (1-4) in ReviewCard
- Dialog close buttons
- Speed reader controls
This is a large surface area — recommend a targeted pass on the most interactive components.

---

## TASK 4: Error Logging System

### Current State
- `ErrorBoundary` already logs crashes to `localStorage` under `memoria-crash-log` (max 50 entries) ✅
- Console logging exists throughout ✅
- Electron IPC: `preload.cjs` exposes typed API, `main.cjs` handles backup via `invoke` pattern ✅

### Recommended Addition
Add an `electronAPI.logError(message: string)` IPC channel:
- **preload.cjs**: expose `logError` via `contextBridge`
- **main.cjs**: handle `ipcMain.handle('log-error', ...)` → append to `~/.codex/error.log`
- **Web fallback**: no-op (already logs to console)
- Wire into `ErrorBoundary.componentDidCatch` — if `window.electronAPI?.logError`, send crash data

---

## Execution Plan (8 steps, one per response)

| Step | Scope | Files |
|------|-------|-------|
| 1 | Tailwind config cleanup (remove 3 unused content globs) | `tailwind.config.ts` |
| 2 | Create planner type interfaces + `src/types/planner.ts` | New file + update `RoadmapTab`, `OperationsTab`, `DisciplineTab` |
| 3 | Type `ChartTooltip` + `chart-tooltip.tsx` | `planner-constants.tsx`, `chart-tooltip.tsx` |
| 4 | Fix remaining `any` in `EditPage`, `CardList`, `SourcesView`, `LazyChart`, `useDeferredCompute`, `sounds.ts` | 6 files |
| 5 | Harden `useCardImport` + `useCardExport` (any → unknown + guards) | 2 files |
| 6 | Add loading/empty states to `SourcesView` and `MindMapList` | 2 files |
| 7 | Add `aria-label` to key interactive elements (TopNav, ScrollableRow, ReviewCard, SpeedReader) | 4 files |
| 8 | Add `electronAPI.logError` IPC channel | `preload.cjs`, `main.cjs`, `electron.d.ts`, `ErrorBoundary.tsx` |

