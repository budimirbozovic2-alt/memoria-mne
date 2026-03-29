

# Tier 3 Step 4: Fix Category Export/Import UUID Roundtrip

## Critical Bug Found

**The export writes `categories` as `string[]` (names only), but the import validator expects `CategoryRecord[]` (objects with `.id` UUID).** This means:

1. A user exports a backup → `categories: ["Pravo", "Ekonomija"]`
2. They re-import it → validator checks `cat.id` → `undefined` → **fails UUID validation**
3. Even if it passed, `useCardImport.ts` calls `setCategories()` with strings, which generates **new UUIDs** — breaking all FK references from cards/sources that point to the old UUIDs

This is a **data-destroying roundtrip failure** in the core backup pipeline.

## Root Cause

| Location | Problem |
|---|---|
| `useCardExport.ts` line 64 | `categories: string[]` — exports name strings, not `CategoryRecord[]` |
| `useCardExport.ts` lines 86, 153 | Writes `categories` (string array) into JSON |
| `useCardImport.ts` lines 106-111 | Treats `data.categories` as `string[]`, feeds through name-based `setCategories` which creates new UUIDs |
| `ExportImportDialog.tsx` line 111-117 | Validator checks `cat.id` — correct for v7, but will reject exports from our own app |

## Fix

### File 1: `src/hooks/useCardExport.ts`

**Export `CategoryRecord[]` from IDB instead of `string[]` names.**

- Remove `categories: string[]` from the `UseCardExportDeps` interface (keep `subcategories` and `srSettings`)
- In both `exportTemplate` and `exportData`, load categories fresh from IDB: `const catRecords = await db.categories.orderBy('sortOrder').toArray();`
- Write `categories: catRecords` into the exported JSON (preserves UUIDs)
- Update `useCallback` dependency arrays accordingly

### File 2: `src/hooks/useCardImport.ts`

**Handle `CategoryRecord[]` import properly — write directly to IDB.**

- In `importData`, after card processing (lines 106-111), detect format:
  - If `data.categories[0]` is an object with `.id` → it's `CategoryRecord[]` → write directly via `db.categories.bulkPut()` (overwrite) or merge (skip/newer)
  - If it's a string → legacy format → keep existing `setCategories` string path as fallback
- On overwrite: `await db.categories.clear(); await db.categories.bulkPut(records);`
- On merge/skip/newer: `await db.categories.bulkPut(records)` (upsert, existing records win for skip)
- After IDB write, sync React state: reload from IDB and update both `setCategoriesState` and `setCategoryRecordsState`
- This requires adding `setCategoryRecordsState` to the deps interface

### File 3: `src/hooks/useCards.ts`

- Pass `setCategoryRecordsState` into `useCardImport` deps
- Remove `categories` from `useCardExport` deps (it reads from IDB now)

### File 4: `src/components/ExportImportDialog.tsx`

**Add backward compatibility for legacy `string[]` categories.**

- In the UUID validation block (lines 110-118), add a guard:
  ```
  if (typeof parsed.categories[0] === 'string') {
    // Legacy v1-v3 format — skip UUID check for categories
    // (cards will still be validated)
  } else {
    // v7+ CategoryRecord format — validate UUIDs
  }
  ```
- In the relational integrity guard, handle both formats when building `validCategoryIds`

## Scope

- Steps 1-3 validation logic structure preserved
- `onImport` prop signature unchanged
- Conflict UI unchanged
- Backward compatible with legacy string-based category exports

