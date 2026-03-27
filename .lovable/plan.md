

# Dead Code Elimination — 7 Surgical Deletions

## 1. Delete `src/views/DatabasePage.tsx`
Entire file — zero imports anywhere in the codebase.

## 2. Clean `src/hooks/useCategoryManagement.ts`
- Remove `categories` and `setCardMap` from `UseCategoryManagementParams` interface (lines 6, 9)
- Remove them from destructuring (lines 14, 17)

## 3. Clean `src/hooks/useCardImport.ts`
- Remove `categories`, `setCardMap`, and `schedulePersist` from `UseCardImportDeps` interface (lines 8, 9, 14)
- Remove them from destructuring (lines 20-21): drop `categories`, `setCardMap`, and `schedulePersist: _schedulePersist`

## 4. Clean `src/hooks/useCardExport.ts`
- Remove `reviewLog` from `UseCardExportDeps` interface (line 52)
- Remove `reviewLog` from destructuring (line 56)
- Remove `reviewLog` from `exportData` dep array (line 156): `[cards, categories, subcategories, srSettings]`
- Remove unused import `ReviewLogEntry` (line 4) — only used for `reviewLog` typing

## 5. Clean `src/hooks/useCards.ts` (orchestrator)
- **Line 110**: Remove `categories` and `setCardMap` from `useCategoryManagement` call
- **Lines 115-118**: Remove `categories`, `setCardMap`, and `schedulePersist` from `useCardImport` call
- **Line 114**: Remove `reviewLog` from `useCardExport` call
- **Lines 62-66**: Delete the entire `setCardMap` useCallback (zero consumers after above)

## 6. Delete `idbSaveCards` from `src/lib/db.ts`
Lines 345-353 — deprecated function with zero actual imports. Test file only references it in a comment string.

## 7. Delete deprecated aliases from `src/lib/forum-logic.ts`
Lines 314-318 — `MATERIAL_LABELS` and `MATERIAL_ICONS` have zero consumers outside their export definitions.

## Files touched
| File | Action |
|------|--------|
| `src/views/DatabasePage.tsx` | Delete |
| `src/hooks/useCategoryManagement.ts` | Remove 2 dead params |
| `src/hooks/useCardImport.ts` | Remove 3 dead params |
| `src/hooks/useCardExport.ts` | Remove `reviewLog` dep |
| `src/hooks/useCards.ts` | Stop passing dead params, delete `setCardMap` |
| `src/lib/db.ts` | Delete `idbSaveCards` |
| `src/lib/forum-logic.ts` | Delete deprecated aliases |

Zero logic, FSRS, or persist changes.

