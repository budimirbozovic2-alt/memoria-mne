

# Tier 3 Step 3: Bulk-Split Refactor — Eliminate State Thrashing

## Problem

`AutoSplitDialog.handleImport` calls `addCard()` in a loop (up to 500 times). Each call triggers:
- `schedulePersist({ type: "put", card })` — 500 individual IDB transactions
- `setCardMapState(prev => ({...prev}))` — 500 object spreads + React re-renders
- `bumpMapVersion()` — 500 version bumps

This causes severe UI thrashing and potential desync.

## Solution

Build all cards in memory first, then execute a **single** bulk write + single state update.

### `src/components/AutoSplitDialog.tsx`

**Replace the entire `handleImport` loop** (lines 170-262) with:

1. **Build phase** — Loop through `toImport`, construct Card objects using `createCard()` from `spaced-repetition.ts`, apply extra fields (sourceId, textAnchor, sourceModules, childCardIds) manually. Collect updates separately.

2. **Bulk write phase** — Single `schedulePersist({ type: "bulk", cards: newCards })`, single `setCardMapState`, single `bumpMapVersion`. For updates, use individual `patchCard` calls (these are few — only "exists" rows).

**Key changes:**
- Import `createCard` from `@/lib/spaced-repetition`
- Import `schedulePersist, bumpMapVersion, CardMap` from `@/lib/persist-queue`
- Access `cardMapRef, setCardMapState` — **Problem:** these are internal to `useCards`, not exposed via AppContext

**Access strategy:** The cleanest path is to add a `bulkAddCards` function to `useCardCRUD.ts` that accepts pre-built Card objects and does a single bulk persist + state update, then expose it through AppContext.

### File 1: `src/hooks/useCardCRUD.ts`

Add `bulkAddCards` callback (~12 lines):
```ts
const bulkAddCards = useCallback((cards: Card[]) => {
  if (cards.length === 0) return;
  const nextRef = { ...cardMapRef.current };
  cards.forEach(c => { nextRef[c.id] = c; });
  cardMapRef.current = nextRef;
  schedulePersist({ type: "bulk", cards });
  setCardMapState(() => nextRef);
  bumpMapVersion();
}, [setCardMapState, cardMapRef]);
```

Return it alongside `addCard`, `updateCard`, etc.

### File 2: `src/hooks/useCards.ts`

Destructure `bulkAddCards` from `useCardCRUD()` and include in return object.

### File 3: `src/contexts/AppContext.tsx`

Add `bulkAddCards` to the context interface and provider value.

### File 4: `src/components/AutoSplitDialog.tsx`

Refactor `handleImport`:
- Extract `bulkAddCards` and `updateCard` from `useAppContext()`
- Build `newCards: Card[]` and `updates: {id, patch}[]` arrays in the loop
- After loop: call `bulkAddCards(newCards)` once, then `updateCard()` for each update (these are rare)
- Remove `addCard` from destructured context (no longer needed here)
- Remove the `setTimeout` yield hack (no longer needed with single bulk write)

## Scope

- Auto-split regex/detection logic: **untouched**
- FSRS math: **untouched**
- Existing `addCard`, `importCards`: **untouched**
- 4 files modified, ~30 lines added, ~40 lines replaced

