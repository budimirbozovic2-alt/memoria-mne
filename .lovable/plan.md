

# Phase 4: Post-Refactoring System Integrity Audit

## Executive Summary

The architecture is **structurally sound** with one critical scoping violation, several pieces of dead code, and a few legacy remnants. No "God Object" problems detected. Below is the full report with recommended fixes.

---

## 1. Dead Code & Ghost Dependencies

### Dead Components (no imports anywhere)
| File | Status | Reason |
|---|---|---|
| `src/components/SourceManager.tsx` | **DEAD** | Zero imports. Was the old global source overview; replaced by `CategoryView` Sources tab |

### Legacy Views (still routed but redundant under new architecture)
| File | Status | Reason |
|---|---|---|
| `src/views/CardsView.tsx` (541 lines) | **Candidate for removal** | Global card browser with `codex-nav-category` localStorage filters. Replaced by scoped `CategoryView` Kartice tab. Still routed at `/cards` and `/database` |
| `src/views/SourcesView.tsx` (639 lines) | **Candidate for removal** | Global source manager. Replaced by scoped `CategoryView` Izvori tab. Still routed at `/sources` |
| `src/views/CardsPage.tsx` | **Wrapper for CardsView** — dies with it |
| `src/views/SourcesRoutePage.tsx` | **Wrapper for SourcesView** — dies with it |
| `src/views/CategoriesRoutePage.tsx` + `src/views/CategoriesPage.tsx` | **Review needed** — may still serve as a global category list |

### Action
- **Delete** `SourceManager.tsx` (zero consumers)
- **Remove routes** `/cards`, `/database`, `/sources` from `App.tsx` and delete `CardsView.tsx`, `SourcesView.tsx`, `CardsPage.tsx`, `SourcesRoutePage.tsx` — OR keep them as legacy fallback if the user wants a global view. **Recommend asking user.**

---

## 2. "God Object" Detection

| Component | Lines | Verdict |
|---|---|---|
| `CategoryView.tsx` | 253 | ✅ Clean — delegates to `CardViewMode`, `CardOrgMode`, `SourceEditor`, `CategoryMnemonicWorkshop` |
| `AppSidebar.tsx` | 179 | ✅ Clean — pure navigation, no business logic |
| `MainLayout.tsx` | ~180 | ✅ Clean — layout shell with isolated `NudgeWatcher`, `GlobalSearchWrapper`, `DocxImporterWrapper` |
| `useCards.ts` | 309 | ✅ Acceptable — orchestrator hook, logic delegated to `useCardBootstrap`, `useCardCRUD`, `useCardAnnotations`, `useCategoryManagement` |
| `AppContext.tsx` | 388 | ✅ Acceptable — provider composition, no business logic inline |

**No God Objects detected.** The decomposition from Phase 1-3 is holding well.

---

## 3. Implicit vs. Explicit Scoping Conflicts

### CRITICAL: `loadSources()` fetches ALL sources globally

`src/lib/sources-storage.ts` line 44-48:
```ts
export async function loadSources(): Promise<Source[]> {
  const sources = await db.sources.toArray(); // ALL sources, no category filter
}
```

**Consumers loading ALL sources (data leakage risk):**
- `RomanForumPage.tsx` — Forum needs all sources for its cross-category analytics → **Acceptable**
- `GlobalSearch.tsx` — Search across everything → **Acceptable**
- `KnowledgeMap.tsx` — Cross-category overview → **Acceptable**
- `auto-link-suggestion.ts` — **VIOLATION** — auto-link should be scoped to same category

**CategoryView.tsx** correctly uses `useLiveQuery` scoped by `categoryId` → ✅ No leakage

### Action
- Add `loadSourcesByCategory(categoryId)` to `sources-storage.ts`
- Refactor `auto-link-suggestion.ts` to accept `categoryId` and filter sources

---

## 4. Legacy Registry Remnants

### localStorage references to old registry
| Location | Key | Status |
|---|---|---|
| `src/lib/db.ts:247` | `codex-source-registry` removal | ✅ Cleanup code — correct |
| `src/lib/db.ts:248` | `codex-monument-types` removal | ✅ Cleanup code — correct |
| `src/lib/forum-logic.ts:22-41` | `codex-monument-types` in localStorage | ⚠️ **Active use** — Forum still reads/writes monument types to localStorage |
| `src/components/CategoryManager.tsx:8,44,88-90` | `loadMonumentTypes`, `saveMonumentType` | ⚠️ **Active use** — CategoryManager still manages monument building types via localStorage |
| `src/views/CardsView.tsx:29-35,93-98` | `codex-nav-category/subcategory/chapter` | ⚠️ **Legacy navigation state** — should die with CardsView removal |

### Action
- Monument types in localStorage is **acceptable** for now (it's a UI preference, not domain data)
- `codex-nav-*` localStorage keys will be eliminated when `CardsView` is removed

---

## 5. Component Prop Drilling vs. Context

`categoryId` is passed through at most 1-2 levels:
- `CategoryView` → `CardViewMode` / `CardOrgMode` / `SourceEditor` / `CategoryMnemonicWorkshop`

This is **not excessive**. A `CategoryContext` would add complexity for no real benefit at this depth. **No action needed.**

---

## 6. FSRS & Forum Alignment

- **ReviewSession** (`src/components/ReviewSession.tsx`) uses `Card.sections[].state`, `stability`, `difficulty`, `nextReview` — all v7 schema fields ✅
- **Forum** (`src/lib/forum-logic.ts`) reads `card.sections` for stability/difficulty aggregation via `computeForumData()` ✅
- **ReviewLog** linkage: `reviewLog.cardId` → `Card.id` (UUID) ✅
- Forum uses `loadSources()` (global) which is correct for its cross-category analytics role ✅

**FSRS and Forum are correctly aligned with the new schema.**

---

## Recommended Fix Plan

### Priority 1 (Do Now)
1. **Delete `src/components/SourceManager.tsx`** — zero imports, pure dead code
2. **Remove debug `console.log` lines** from `AppSidebar.tsx` (line 58) and `useCardBootstrap.ts` (lines 86, 104, 113, 122, 129, 151)

### Priority 2 (Ask User First)
3. **Remove legacy global views** (`CardsView`, `SourcesView`, `CardsPage`, `SourcesRoutePage`) and their routes — these are redundant with `CategoryView` but may still be wanted as a "see everything" fallback
4. **Remove `/cards`, `/database`, `/sources` routes** from `App.tsx`

### Priority 3 (Next Sprint)
5. **Add `loadSourcesByCategory()`** to `sources-storage.ts` and scope `auto-link-suggestion.ts`
6. **Remove sidebar fallback mechanism** once category rendering is confirmed stable (the `setTimeout` + `seedDefaultCategories` fallback in AppSidebar)

### Files to Change
| File | Action |
|---|---|
| `src/components/SourceManager.tsx` | **DELETE** |
| `src/components/AppSidebar.tsx` | Remove debug console.log |
| `src/hooks/useCardBootstrap.ts` | Remove debug console.log |
| `src/views/CardsView.tsx` | **DELETE** (pending user approval) |
| `src/views/SourcesView.tsx` | **DELETE** (pending user approval) |
| `src/views/CardsPage.tsx` | **DELETE** (pending user approval) |
| `src/views/SourcesRoutePage.tsx` | **DELETE** (pending user approval) |
| `src/App.tsx` | Remove dead routes (pending user approval) |
| `src/lib/sources-storage.ts` | Add `loadSourcesByCategory()` |
| `src/lib/auto-link-suggestion.ts` | Scope by `categoryId` |

