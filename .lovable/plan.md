

# Fix: Navigation State Persistence

## Problem
When navigating back from edit mode or switching between views, the selected Category/Subcategory/Chapter resets to defaults. The user must re-navigate the hierarchy each time.

## Solution
Use `localStorage` with 3 keys (`codex-nav-category`, `codex-nav-subcategory`, `codex-nav-chapter`) to persist the last active navigation state. Both `KnowledgeMap.tsx` and `CardsView.tsx` read these on mount and write them on change.

## Changes

### 1. `src/components/KnowledgeMap.tsx`
- **Initialize `view` state** from localStorage: if `codex-nav-category` and `codex-nav-subcategory` exist, start at `step: "detail"`; if only category exists, start at `step: "subcategories"`; otherwise `step: "categories"`.
- **Update `navigate()` function** to write the keys on each transition:
  - `subcategories` step → save category
  - `detail` step → save category + subcategory
  - `categories` step → clear all 3 keys
- Validate that the stored category/subcategory still exist in the current `categories`/`subcategories` props before hydrating.

### 2. `src/views/CardsView.tsx`
- **Hydrate `filterCategory`**: check `codex-nav-category` from localStorage (after the existing `sr-deeplink-category` sessionStorage check, which takes priority).
- **Hydrate `filterSubcategory`**: check `codex-nav-subcategory`.
- **Hydrate `filterChapter`**: check `codex-nav-chapter`.
- **Write to localStorage** whenever these filters change — add a `useEffect` that syncs the 3 values.

### 3. `src/components/MentalSkeleton.tsx`
- No direct changes needed. MentalSkeleton receives `category`/`subcategory` as props from KnowledgeMap. The chapter state is already internal (expanded chapters). However, the **selected chapter context** is implicit (all chapters expanded). No chapter-level persistence needed here since MentalSkeleton shows all chapters simultaneously.

## Storage Keys
| Key | Set by | Read by |
|-----|--------|---------|
| `codex-nav-category` | KnowledgeMap `navigate()`, CardsView filter change | Both on mount |
| `codex-nav-subcategory` | KnowledgeMap `navigate()`, CardsView filter change | Both on mount |
| `codex-nav-chapter` | CardsView filter change | CardsView on mount |

## Cross-Component Sync
Both components read/write the same localStorage keys, so selecting a category in KnowledgeMap → navigating to CardsView will show the same category pre-selected, and vice versa.

## Guardrails
- Existing `sr-deeplink-category` sessionStorage mechanism takes priority (used by PlannerPage)
- FSRS/SM-2 logic untouched
- No layout changes
- Stored values are validated against current data before use (stale categories ignored)

## Files modified
| File | Change |
|------|--------|
| `src/components/KnowledgeMap.tsx` | Hydrate `view` state from localStorage; persist on navigate |
| `src/views/CardsView.tsx` | Hydrate filters from localStorage; sync on change |

