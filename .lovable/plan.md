

# Tier 3 Step 3: Category Conflict Resolution & Merge UI

## Changes — `src/components/ExportImportDialog.tsx`

### Part A: Interface (line 30)
Add `duplicateCategoryCount: number;` to `ImportValidation`.

### Part B: Calculation block (lines 200–227)
Replace with:
- After `setProgress(80)`, compute `existingIds` and `duplicateCount` (unchanged)
- **NEW**: `const existingCatIds = new Set((await db.categories.toArray()).map(c => c.id));`
- **NEW**: `duplicateCategoryCount` calculated from `parsed.categories` intersection
- Add `duplicateCategoryCount` to `validationResult`
- Update conflict condition: `if (duplicateCount > 0 || duplicateCategoryCount > 0)`

### Part C: Conflict UI (lines 410–453)
Replace the `import-conflict` block's `DialogDescription` and buttons with user-provided text:
- Description mentions both card and category overlap counts
- "Pametno spajanje (Preporučeno)" for `newer`
- "Dodaj samo nove (Merge)" for `keep`
- "Prepiši sve (Overwrite)" for `overwrite`

### Part D: Error catch (line 232)
Add `duplicateCategoryCount: 0` to the error fallback validation object.

## Scope
- UUID validation (Step 1) and Relational Guard (Step 2) untouched
- `onImport` prop signature unchanged
- Only validation calculation and conflict UI updated

