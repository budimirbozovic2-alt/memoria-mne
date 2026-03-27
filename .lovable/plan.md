

# Step 3: Architectural Refactoring & Decoupling — Refactoring Map

## Summary of Current State

Most of the heavy decomposition work has **already been done** in previous phases. MentalSkeleton already has ChapterBox, DraggableCardTile, LearnModal, AuditorDetailPanel extracted. CardList has CardBadges and CardContextMenu extracted. StrategicPlanner uses usePlannerData hook and tab sub-components. CardForm delegates to useCardActions hook and EditorSection/MetadataSection. The data layer uses a boot-load-all CardMap pattern (intentionally no `useLiveQuery`). No `TouchSensor` exists. No `use-mobile` hook exists.

**What remains** is targeted cleanup, not wholesale restructuring.

---

## TASK 1: Large File Decomposition

### Files > 300 lines

| File | Lines | Status | Action Required |
|------|-------|--------|-----------------|
| `KnowledgeMap.tsx` | 494 | Partially modular | Extract `Header`, `SearchBar`, `EmptyMessage` + category/subcategory step views |
| `CardList.tsx` | 437 | Already has CardRowInner memoized | Extract `VirtualRow` + reorder-drag logic into hook |
| `MyStats.tsx` | 438 | Monolithic stats page | Extract tab contents into `stats/` subdirectory files |
| `LearnSession.tsx` | 365 | Study modes already lazy-loaded | Extract setup screens (mode picker, filter screen) into `learn/LearnSetup.tsx` |
| `TopNav.tsx` | 363 | Contains mobile nav dead code | Remove mobile section (Task 4), reduces to ~240 lines |
| `RichTextEditor.tsx` | 322 | Self-contained editor | No extraction needed — single responsibility |
| `SourceManager.tsx` | 313 | Moderate | Extract registry dialog into `SourceRegistryDialog.tsx` |
| `SourceReader.tsx` | 303 | Already uses useSourceLogic hook | Extract `CoverageStatsBar` (already inline) — minor |
| `MetacognitiveCenter.tsx` | 302 | Tab-based | Extract diary form + analysis tab into sub-files |

### Extraction Plan (Priority Order)

**Batch 1 — KnowledgeMap.tsx (494 → ~280 lines)**
- Extract `Header`, `SearchBar`, `EmptyMessage` → `src/components/knowledge-map/SharedWidgets.tsx`
- Extract category list view (lines 317-434) → `src/components/knowledge-map/CategoryList.tsx`
- Extract subcategory list view (lines 180-314) → `src/components/knowledge-map/SubcategoryList.tsx`
- KnowledgeMap.tsx becomes an orchestrator with view state + routing

**Batch 2 — MyStats.tsx (438 → ~120 lines)**
- Already has `CalibrationTab`, `EfficiencyTab`, `LatencyTab`, `PredictionTab`, `ResistanceTab` in `stats/`
- Extract the overview/summary tab (the main content before tabs) → `stats/OverviewTab.tsx`
- Extract shared chart data computation → `useStatsData` hook

**Batch 3 — LearnSession.tsx (365 → ~180 lines)**
- Extract mode selection screen (lines 121-233) → `learn/ModeSelector.tsx`
- Extract filter/sort screen (lines 236-286) → `learn/FilterSetup.tsx`
- LearnSession becomes: setup orchestrator + delegation to lazy study modes

**Batch 4 — TopNav.tsx (363 → ~240 lines after mobile removal)**
- Remove mobile nav entirely (Task 4 below)
- Extract version dialog → `VersionDialog.tsx` or inline simplification

---

## TASK 2: Separation of Concerns

### DB Imports in Components (Current State)
Components importing `@/lib/db` directly:
- `MindMapList.tsx` — imports types only + uses `mindmap-storage` functions
- `MindMapCanvas.tsx` — imports types only + uses `mindmap-storage` functions  
- `MonumentInterior.tsx` — imports `Source` type only
- `SourceSnippetDialog.tsx` — imports `db` directly for a query
- `GlobalSearch.tsx` — imports types only
- `HealthMonitor.tsx` — imports `db` directly for health checks
- `KnowledgeMap.tsx` — imports `Source` type only

**Action needed:**
- `SourceSnippetDialog.tsx` — move the direct `db` query into `sources-storage.ts` as a helper function
- `HealthMonitor.tsx` — acceptable (it IS a database diagnostic tool)
- All others — type-only imports, no change needed

### Database Indexing Analysis
Current Dexie schema (v4):
- `cards`: `id, category, subcategory, type, createdAt, sourceId`
- Missing indexes: `chapter` (used in chapter-based filtering), `[category+subcategory]` compound index

**Action:** Add compound index `[category+subcategory]` in a v5 schema migration. The `chapter` field is filtered in-memory from the boot-loaded CardMap, which is acceptable for <10k cards.

### useLiveQuery Decision
Per the memory note: the app **intentionally** uses boot-load-all pattern, not `useLiveQuery`. This is correct for an offline-first Electron app with <10k cards. **No change.**

### Business Logic Already Extracted
- FSRS calculations → `spaced-repetition.ts` (untouched per guardrail)
- Dashboard stats → `useDashboardData` hook
- Planner calculations → `usePlannerData` hook
- Card CRUD → `useCardCRUD` hook
- Card annotations → `useCardAnnotations` hook

**One remaining extraction:**
- `LearnSession.tsx` lines 146-185: inline review-ratio calculation → extract to `lib/learn-analytics.ts` as `calcReviewPriorityWarning()`

---

## TASK 3: Performance Optimization

### Current Memoization Audit
| Component | `React.memo` | Stable callbacks | Status |
|-----------|:---:|:---:|--------|
| `DraggableCardTile` | ✅ | ✅ | Good |
| `ChapterBox` | ✅ | N/A | Good |
| `CardRowInner` (CardList) | ✅ | ✅ | Good |
| `SourceContent` (SourceReader) | ✅ | ✅ | Good |
| `SubcategoryCard` | Need to check | — | **Verify** |

**Action:** Verify `SubcategoryCard` is memoized. If not, wrap with `React.memo`.

### Re-render Risks Identified
1. **KnowledgeMap subcategory view**: `handleMoveSub` is created inline inside render branch → wrap in `useCallback`
2. **LearnSession**: `updateProgress` depends on `learnMode` which changes during setup → stable, no issue
3. **CardList VirtualRow**: receives `rowProps` object literal on every render → memoize the `rowProps` object with `useMemo`

---

## TASK 4: Desktop-Only Cleanup

### TopNav.tsx Mobile Code (lines 230-321)
- `mobileOpen` state variable
- `md:hidden` mobile header div (lines 231-252)
- Mobile dropdown menu (lines 254-321)
- `Menu` and `X` icon imports (used only for mobile hamburger)

**Action:** Remove all of the above. Remove `Menu` import. Keep the `hidden md:flex` desktop nav as the only nav. Simplify to always-visible desktop layout (remove `hidden md:flex` → just `flex`).

### Other Mobile Patterns
- No `TouchSensor` found
- No `use-mobile` hook found
- No other `md:hidden` patterns found outside TopNav
- Responsive CSS (`sm:grid-cols-2`, `lg:grid-cols-3`) preserved for desktop window resizing

---

## Execution Order (One batch per response)

1. **TopNav mobile cleanup** — smallest, lowest risk, immediate line reduction
2. **KnowledgeMap decomposition** — largest file, highest impact
3. **MyStats decomposition** — extract overview tab + useStatsData hook
4. **LearnSession setup extraction** — ModeSelector + FilterSetup
5. **Minor fixes** — SourceSnippetDialog db import, SubcategoryCard memo check, CardList rowProps memoization, Dexie v5 compound index
6. **LearnSession analytics extraction** — `calcReviewPriorityWarning()` to lib

---

## Risk Assessment

- **KnowledgeMap split**: Medium risk — view-state routing logic must stay coordinated. The `useSourceHierarchy` hook is called conditionally (only in subcategory view) which React rules require staying in the same component or being restructured.
- **MyStats split**: Low risk — tab contents are already independent.
- **TopNav mobile removal**: Very low risk — pure deletion of dead code for desktop-only app.
- **Dexie v5 migration**: Low risk — additive index, no data migration needed.

