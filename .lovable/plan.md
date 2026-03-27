

# The React 18 Guard — Implementation Plan

## Overview
Eliminate snapshot race conditions via useEffect-based persistence, fix FSRS call-site for per-section error logging, stabilize Math.min spread, pre-compute sort keys, fix stale closures, and add source invalidation signaling.

## 1. Eliminate Snapshot Races (C1, C3, C4, H6)

### `src/hooks/useCards.ts`
**Problem**: `setCardMap`, `setCategories`, `setSubcategories` use a snapshot variable that can be empty/stale due to React 18 batching — the updater may not have run yet when the side-effect reads `snapshot`.

**Fix**: Replace snapshot-based persistence with three `useEffect` hooks:

```ts
// Persist cardMap changes via effect (skip initial mount)
const cardMapMountedRef = useRef(false);
useEffect(() => {
  if (!cardMapMountedRef.current) { cardMapMountedRef.current = true; return; }
  if (!ready) return;
  const cards = Object.values(cardMap);
  if (cards.length > 0) schedulePersist({ type: "bulk", cards });
}, [cardMap, ready]);

// Persist categories via effect
const catMountedRef = useRef(false);
useEffect(() => {
  if (!catMountedRef.current) { catMountedRef.current = true; return; }
  idbSaveCategories(categories);
}, [categories]);

// Persist subcategories via effect
const subMountedRef = useRef(false);
useEffect(() => {
  if (!subMountedRef.current) { subMountedRef.current = true; return; }
  idbSaveSubcategories(subcategories);
}, [subcategories]);
```

**Simplify setCardMap/setCategories/setSubcategories** to pure state setters:
```ts
const setCardMap = useCallback((updater, persist) => {
  setCardMapState(updater);
  bumpMapVersion();
}, []);

const setCategories = useCallback((updater) => {
  setCategoriesState(updater);
}, []);

const setSubcategories = useCallback((updater) => {
  setSubcategoriesState(updater);
}, []);
```

**Fix `reorderSubcategories`** (line 208-213): remove `idbSaveSubcategories` from inside the updater — it will now be handled by the useEffect.

**Fix `reorderCategories`** (line 203-206): remove direct `idbSaveCategories` call.

### `src/hooks/useCardImport.ts`
The `importCards` function (line 220) has a stale closure on `categories`. Since `addCategory` already uses functional updater pattern (H2 fix), just change line 220:
```ts
setCategories(prev => prev.includes(category) ? prev : [...prev, category]);
```
Remove `categories` from the dependency array.

## 2. Re-Attach FSRS Surgery (H1)

### `src/components/review/ReviewCard.tsx`
**Problem**: `onLogError(card.id, selection)` at line 99 doesn't pass `section.id`, so all sections get penalized.

**Fix**: 
- Change prop type: `onLogError: (cardId: string, text: string, sectionId?: string) => void`
- Change call at line 99: `onLogError(card.id, selection, section.id)`

### `src/components/review/review-constants.ts`
- Update `ReviewSessionProps.onLogError` type: `(cardId: string, text: string, sectionId?: string) => void`

## 3. Stabilize Math & Sorting (H5, B1)

### `src/lib/spaced-repetition.ts`
**Line 332**: Replace `Math.min(...reviewable.map(...))` with reduce:
```ts
let min = Infinity;
for (const s of reviewable) if (s.nextReview < min) min = s.nextReview;
return min;
```

### `src/hooks/useCards.ts` — single-pass memo
**Pre-compute sort key**: During the single-pass loop, compute `minNextReview` per card and store in a Map. Use this Map in the sort comparator:
```ts
const sortKeys = new Map<string, number>();
// Inside the loop, for due cards:
let minNext = Infinity;
for (const s of card.sections) {
  if (s.state !== SectionState.New && s.nextReview < minNext) minNext = s.nextReview;
}
sortKeys.set(card.id, minNext);
// ...
dueList.sort((a, b) => (sortKeys.get(a.id) ?? Infinity) - (sortKeys.get(b.id) ?? Infinity));
```

## 4. Source & Forum Correctness (H3, H4, H2)

### `src/lib/sources-storage.ts`
Add a simple event-based invalidation signal:
```ts
type SourceListener = () => void;
const _listeners = new Set<SourceListener>();
export function onSourcesChanged(fn: SourceListener) { _listeners.add(fn); return () => _listeners.delete(fn); }
function _notify() { _listeners.forEach(fn => fn()); }
```
Call `_notify()` in `saveSource`, `deleteSource`, and `invalidateSourcesCache`.

### `src/views/RomanForumPage.tsx`
Subscribe to source changes:
```ts
useEffect(() => {
  loadSources().then(setSources);
  return onSourcesChanged(() => loadSources().then(setSources));
}, []);
```

### `src/views/RomanForumPage.tsx` (H4)
Use full `reviewLog` reference as dependency instead of just length — the length-only optimization is unsound if entries are replaced:
```ts
const forumState = useMemo(() =>
  calculateForumState(deferredCards, reviewLog, sources),
  [deferredCards, sources, reviewLog]
);
```
Remove the `reviewLogLen` variable and eslint-disable comment.

### `src/components/KnowledgeMap.tsx` (H2)
Remove `(card as any).updatedAt` cast, use typed access since `updatedAt` is now on the Card interface:
```ts
const cardUpdated = card.updatedAt ?? 0;
```

## 5. Category Management (H2)

### `src/hooks/useCategoryManagement.ts`
**`renameCategory`** (line 30-31): Replace stale closure check with functional pattern:
```ts
setCategories(prev => {
  if (prev.includes(newName)) return prev; // no-op
  return prev.map(c => c === oldName ? newName : c);
});
```
Remove `categories` from dependency array.

Note: The duplicate check now happens inside the updater. The early return must be removed since we can't bail out of the whole function from inside the updater. Instead, wrap the card-update logic in a condition that checks the result.

**Approach**: Use a ref to track whether the rename actually happened:
```ts
let didRename = false;
setCategories(prev => {
  if (prev.includes(newName)) return prev;
  didRename = true;
  return prev.map(c => c === oldName ? newName : c);
});
// Only update cards if rename happened — read didRename synchronously
// (setCategoriesState is synchronous in React 18 when not in a transition)
if (!didRename) return;
```
Actually, in React 18 the updater runs synchronously within the same event handler, so `didRename` will be set by the time we read it.

## Files Changed Summary

| File | Change |
|------|--------|
| `src/hooks/useCards.ts` | Replace snapshot persistence with 3 useEffects; simplify setters; fix reorder functions; pre-compute sort keys |
| `src/components/review/ReviewCard.tsx` | Pass `section.id` to `onLogError` |
| `src/components/review/review-constants.ts` | Update `onLogError` type signature |
| `src/lib/spaced-repetition.ts` | Replace `Math.min(...arr)` with reduce loop |
| `src/lib/sources-storage.ts` | Add event-based invalidation signaling |
| `src/views/RomanForumPage.tsx` | Subscribe to source changes; fix reviewLog dep |
| `src/components/KnowledgeMap.tsx` | Remove `as any` cast |
| `src/hooks/useCategoryManagement.ts` | Fix renameCategory stale closure |
| `src/hooks/useCardImport.ts` | Fix stale closure in importCards |

## Risk Assessment
- **useEffect persistence**: Low risk — skip-on-mount pattern prevents boot re-save; `ready` guard prevents persisting empty initial state
- **FSRS**: Untouched algorithm; only call-site fixed to pass sectionId
- **Sort fix**: Pure performance improvement, same result
- **Source signaling**: Additive pattern, existing cache logic unchanged

