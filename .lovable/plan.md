

# Mnemonic Module UUID Migration & Cache Sync

## Confirmed Problems

1. **`MnemonicCard.category` stores UUID** (callers pass `card.categoryId`), but Workshop filters display raw UUIDs and compare by UUID — so filter pills show UUIDs instead of human names
2. **No react-query invalidation** when `TextSelectionTooltip` writes to localStorage — Workshop shows stale data until page reload
3. **Interface field named `category`** should be `categoryId` for consistency with rest of codebase

## Changes

### 1. `src/lib/mnemonic-storage.ts`
- Rename `category: string` → `categoryId: string` in `MnemonicCard` interface
- In `loadMnemonicCards()` migration block, add: `categoryId: c.categoryId || (c as any).category`
- Update `createMnemonicCard` and `createMnemonicCardFromSelection` parameter names and return objects

### 2. `src/components/TextSelectionTooltip.tsx`
- After `saveMnemonicCards(...)`, invalidate the react-query cache:
  - Import `useQueryClient` from `@tanstack/react-query`
  - Call `qc.invalidateQueries({ queryKey: ["mnemonicCards"] })` after save
- This is the sync fix — Workshop picks up new cards immediately

### 3. `src/components/MnemonicWorkshop.tsx`
- Accept new prop: `categoryRecords?: CategoryRecord[]`
- Build `idToName` map: `Object.fromEntries(categoryRecords.map(r => [r.id, r.name]))`
- Category tree keys stay as UUIDs (they already are), but display `idToName[cat] ?? cat` in filter pills
- Filter comparison stays `c.categoryId === selectedCategory` (UUID match — correct)
- Sort by category uses `idToName` for display name comparison

### 4. `src/components/MnemonicModule.tsx`
- Import `useCardContext` to get `categoryRecords`
- Pass `categoryRecords` to `<MnemonicWorkshop>`
- All `c.category` references → `c.categoryId`

### 5. `src/components/MnemonicTest.tsx` + `src/components/workshop/WorkshopCardItem.tsx`
- Update any `card.category` references → `card.categoryId`

## Scope
- 6 files, ~40 lines changed
- No IDB schema changes, no FSRS changes, no context provider changes
- localStorage format: backward-compatible via migration in `loadMnemonicCards`

