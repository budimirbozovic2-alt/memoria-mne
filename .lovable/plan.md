

# The Final Engine Calibration (C1, C2, H1, H2, B3)

## Changes

### 1. C1 + H4: Fix `renameCategory` batching race (`useCategoryManagement.ts`)
**Problem**: `didRename` is set inside `setCategories` updater but read outside — React 18 batching means the updater may not have executed yet.
**Fix**: Use synchronous `categories.includes(newName)` check before calling any state updaters. Add `categories` to the dependency array (fixing H4 — unused prop).

Lines 27-61: Replace `renameCategory` with:
```ts
const renameCategory = useCallback(
  (oldName: string, newName: string) => {
    if (categories.includes(newName)) return; // Synchronous check
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    const changed: Card[] = [];
    setCardMapState(prev => {
      const next = { ...prev };
      for (const [id, c] of Object.entries(next)) {
        if (c.category === oldName) {
          const u = { ...c, category: newName, updatedAt: Date.now() };
          next[id] = u;
          changed.push(u);
        }
      }
      return next;
    });
    if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
    bumpMapVersion();
    setSubcategories(prev => {
      const next = { ...prev };
      if (next[oldName]) { next[newName] = next[oldName]; delete next[oldName]; }
      return next;
    });
  },
  [categories, setCategories, setCardMapState, setSubcategories],
);
```

### 2. H2: Fix double-mutation ref lag (`useCardCRUD.ts`)
**Problem**: `cardMapRef` syncs via `useEffect` in `useCards.ts`, lagging one render. Two `patchCard` calls in the same handler clobber each other.
**Fix**: Mutate `cardMapRef.current` synchronously inside `patchCard`, `addCard`, `addFlashCard`, `splitCard`, and `deleteCard`.

In `patchCard` (line 34, after computing `updated`), add:
```ts
cardMapRef.current = { ...cardMapRef.current, [id]: updated };
```

In `addCard` (after line 68), add:
```ts
cardMapRef.current = { ...cardMapRef.current, [card.id]: card };
```

In `addFlashCard` (after line 84), add:
```ts
cardMapRef.current = { ...cardMapRef.current, [card.id]: card };
```

In `splitCard` (after line 172), add:
```ts
const nextRef = { ...cardMapRef.current };
delete nextRef[id];
newCards.forEach(c => { nextRef[c.id] = c; });
cardMapRef.current = nextRef;
```

In `deleteCard` (after line 148), add:
```ts
const nextRef = { ...cardMapRef.current };
delete nextRef[id];
cardMapRef.current = nextRef;
```

### 3. C2: Fix `Math.max` spread stack overflow (`useCardImport.ts`)
**Problem**: Line 84: `Math.max(0, ...c.sections.map(...))` — stack overflow on large section arrays.
**Fix**: Replace with `.reduce()`:
```ts
const getLastReview = (c: Card) => c.sections.reduce((max, s) => Math.max(max, s.lastReviewed || 0), 0);
```

### 4. H1: Fix `logError` blanket penalty (`useCardAnnotations.ts`)
**Problem**: Lines 104-105: `if (sectionId && s.id !== sectionId) return s;` — when `sectionId` is undefined, ALL sections get penalized.
**Fix**: Change to:
```ts
if (!sectionId || s.id !== sectionId) return s;
```
This means: if no sectionId provided, skip penalty entirely. Only penalize the targeted section.

### 5. B3: Use cached retention (`useCardAnnotations.ts`)
**Problem**: Line 23 calls `loadAppSettings().targetRetention` on every review — re-parses JSON from localStorage.
**Fix**:
- In `spaced-repetition.ts`: export `getCachedRetention`
- In `useCardAnnotations.ts`: replace `loadAppSettings` import with `getCachedRetention` from spaced-repetition, use `getCachedRetention()` directly

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useCategoryManagement.ts` | Synchronous `categories.includes` check, remove `didRename` flag |
| `src/hooks/useCardCRUD.ts` | Sync ref mutation in patchCard, addCard, addFlashCard, splitCard, deleteCard |
| `src/hooks/useCardImport.ts` | `Math.max` spread → `.reduce()` |
| `src/hooks/useCardAnnotations.ts` | logError guard fix + getCachedRetention |
| `src/lib/spaced-repetition.ts` | Export `getCachedRetention` |

## Risk
- All fixes are surgical, single-line or few-line changes
- No FSRS algorithm changes
- `getCachedRetention` already exists and is battle-tested internally

