

# Sprint 5: The Surgical Refactor — Ref-Delta Pattern

## What's Already Done (No Changes Needed)
These items from the mission are already implemented in the current codebase:
- **H1 (ReviewCard sectionId)**: Line 99 already passes `section.id` ✓
- **H5 (Math.min spread)**: `getCardNextReview` already uses a loop (lines 330-334) ✓
- **B1 (Sort pre-computation)**: Sort keys already pre-computed in Map (lines 184-192) ✓
- **H3 (Source invalidation)**: `onSourcesChanged` event pattern already exists ✓
- **H4 (Forum reviewLog dep)**: Already uses full `reviewLog` reference ✓
- **H2 (KnowledgeMap any cast)**: Already removed ✓
- **H2 (renameCategory stale closure)**: Already uses functional updater ✓
- **ReviewPage sectionId passthrough**: Already forwards `sectionId` ✓

## What Changes — The Ref-Delta Pattern

The single remaining architectural fix: replace the 3 `useEffect`-based persistence hooks in `useCards.ts` with synchronous ref-based side-effects in action handlers.

### Problem with Current Code
`useCards.ts` lines 57-85: Three `useEffect` hooks watch `cardMap`, `categories`, and `subcategories` and persist on change. This:
- Fires asynchronously (next microtask), not at mutation time
- Requires a diff (O(n) reference comparison) for every cardMap change
- Couples persistence timing to React's render cycle instead of user intent

### The Ref-Delta Pattern

**Core idea**: Maintain a `cardMapRef` that mirrors state. Action handlers read the ref synchronously, compute the result, fire the surgical persist immediately, then update React state.

### File: `src/hooks/useCards.ts`

**Remove** (lines 57-85): All three `useEffect`-based persistence hooks (`cardMapMountedRef`, `prevCardMapRef`, `catMountedRef`, `subMountedRef` and their effects).

**Add** a `cardMapRef` synced to state:
```ts
const cardMapRef = useRef<CardMap>({});
useEffect(() => { cardMapRef.current = cardMap; }, [cardMap]);
```

**Restore side-effects in setters** — but using pre-computed payloads, not snapshots:

```ts
const setCardMap = useCallback((updater, persist) => {
  setCardMapState(updater);
  bumpMapVersion();
  // No persist here — handled by callers with pre-computed data
}, []);

const setCategories = useCallback((updater) => {
  setCategoriesState(prev => {
    const next = updater(prev);
    if (next !== prev) idbSaveCategories(next);
    return next;
  });
}, []);

const setSubcategories = useCallback((updater) => {
  setSubcategoriesState(prev => {
    const next = updater(prev);
    if (next !== prev) idbSaveSubcategories(next);
    return next;
  });
}, []);
```

For categories/subcategories, the functional updater approach is safe because the persist call uses the exact computed `next` value — no snapshot race. The updater runs synchronously within React's batch.

**Fix `reorderCategories` and `reorderSubcategories`**: These set state directly (not via the wrapper setters), so add explicit persist:
```ts
const reorderCategories = useCallback((ordered) => {
  setCategoriesState(ordered);
  idbSaveCategories(ordered);
}, []);

const reorderSubcategories = useCallback((category, ordered) => {
  setSubcategoriesState(prev => {
    const next = { ...prev, [category]: ordered };
    idbSaveSubcategories(next);
    return next;
  });
}, []);
```

### File: `src/hooks/useCardCRUD.ts`

**Accept `cardMapRef`** as a new parameter.

**`patchCard`** — Ref-Delta pattern:
```ts
const patchCard = useCallback((id: string, patcher: (card: Card) => Card) => {
  const card = cardMapRef.current[id];
  if (!card) return;
  const updated = { ...patcher(card), updatedAt: Date.now() };
  // Surgical persist BEFORE state update — payload is pre-computed
  schedulePersist({ type: "put", card: updated });
  setCardMapState(prev => {
    if (!prev[id]) return prev;
    return { ...prev, [id]: updated };
  });
  bumpMapVersion();
}, [setCardMapState, cardMapRef]);
```

**`addCard`** — already pre-computes the card object outside the updater, so just add:
```ts
schedulePersist({ type: "put", card });
```
before `setCardMapState`.

**`addFlashCard`** — same pattern: add `schedulePersist({ type: "put", card })`.

**`splitCard`** — needs ref access to read the card and compute new cards synchronously:
```ts
const splitCard = useCallback((id: string) => {
  const card = cardMapRef.current[id];
  if (!card || card.sections.length <= 1) return;
  const newCards = card.sections.map(section => ({
    ...createCard(card.question, [{ title: section.title, content: section.content }], card.category, card.subcategory),
    sections: [{ ...section }],
    updatedAt: Date.now(),
  }));
  schedulePersist({ type: "bulk", cards: newCards });
  idbDeleteCard(id).catch(e => console.error("[splitCard] IDB delete failed", e));
  setCardMapState(prev => {
    const next = { ...prev };
    delete next[id];
    newCards.forEach(c => { next[c.id] = c; });
    return next;
  });
  bumpMapVersion();
}, [setCardMapState, cardMapRef]);
```

### File: `src/hooks/useCardAnnotations.ts`

**`bulkFlagNeedsReview`**, **`reorderCards`**, **`bulkUpdateChapter`** — these use `setCardMapState` directly. Add `cardMapRef` param, pre-compute changes, and persist:

```ts
const bulkFlagNeedsReview = useCallback((cardIds: string[]) => {
  if (cardIds.length === 0) return;
  const updated: Card[] = [];
  setCardMapState(prev => {
    const next = { ...prev };
    for (const id of cardIds) {
      if (next[id]) {
        const u = { ...next[id], needsReview: true, updatedAt: Date.now() };
        next[id] = u;
        updated.push(u);
      }
    }
    return next;
  });
  if (updated.length > 0) schedulePersist({ type: "bulk", cards: updated });
  bumpMapVersion();
}, [setCardMapState]);
```

Same pattern for `reorderCards` and `bulkUpdateChapter`.

Note: For these bulk operations, we can collect `updated` cards inside the updater (reading from `prev`) and persist after. The updater runs synchronously, so `updated` is populated by the time `schedulePersist` runs. This is safe because we're not reading a snapshot variable — we're accumulating results from the updater's own `prev`.

### File: `src/hooks/useCardImport.ts`

**`importCards`** — already pre-computes `created` array outside updater. Add:
```ts
schedulePersist({ type: "bulk", cards: created });
```

**`importData`** — uses `setCardMap` wrapper which doesn't persist. The imported cards are known (`importedCards`), but the merge logic (skip/overwrite/newer) happens inside the updater. Use the same accumulator pattern:
```ts
const merged: Card[] = [];
setCardMap(prev => {
  // ... existing merge logic, pushing to `merged` for each card that enters `next`
  return next;
}, "full");
if (merged.length > 0) schedulePersist({ type: "bulk", cards: merged });
```

### File: `src/hooks/useCategoryManagement.ts`

**`renameCategory`**, **`deleteCategory`**, **`renameSubcategory`**, **`deleteSubcategory`**, **`bulkUpdateSubcategory`** — these call `setCardMapState` directly. Use the accumulator pattern: collect changed cards inside the updater, persist after.

Categories/subcategories persistence is now handled by the wrapper `setCategories`/`setSubcategories` in `useCards.ts` which persist inside the functional updater.

### Wiring Changes in `useCards.ts`

Pass `cardMapRef` to `useCardCRUD` and `useCardAnnotations`:
```ts
const cardMapRef = useRef<CardMap>({});
useEffect(() => { cardMapRef.current = cardMap; }, [cardMap]);

const { patchCard, ... } = useCardCRUD({ categories, setCardMapState, setCategories, cardMapRef });
const { ... } = useCardAnnotations({ patchCard, setCardMapState, setReviewLog, cardMapRef });
```

### Import changes
- `useCardCRUD.ts`: import `schedulePersist` from `persist-queue`
- `useCardAnnotations.ts`: import `schedulePersist` from `persist-queue`
- `useCardImport.ts`: already has `schedulePersist` in deps
- `useCategoryManagement.ts`: already imports from `persist-queue`

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCards.ts` | Remove 3 useEffect persist hooks; add `cardMapRef`; restore persist in `setCategories`/`setSubcategories` wrappers; pass ref to CRUD/annotations |
| `src/hooks/useCardCRUD.ts` | Accept `cardMapRef`; add `schedulePersist` calls with pre-computed data in `patchCard`, `addCard`, `addFlashCard`, `splitCard` |
| `src/hooks/useCardAnnotations.ts` | Add `schedulePersist` calls in bulk operations using accumulator pattern |
| `src/hooks/useCardImport.ts` | Add `schedulePersist` for `importCards`; accumulator pattern for `importData` |
| `src/hooks/useCategoryManagement.ts` | Accumulator pattern for card mutations in rename/delete operations |

## Risk Assessment
- **Categories/subcategories**: Persisting inside functional updater is safe — the value written is the exact return value
- **patchCard ref-delta**: Pre-computing from ref is safe because React dispatches synchronously within event handlers; ref and state diverge only during concurrent renders (which we don't use)
- **Accumulator pattern**: Collecting results inside updater + persisting after is safe because React 18 runs updaters synchronously in event handlers
- **No FSRS changes**: Algorithm untouched
- **Deletes**: Still explicit via `idbDeleteCard` — unchanged

