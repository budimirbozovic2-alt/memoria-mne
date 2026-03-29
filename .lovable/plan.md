

# Electron Auto-Backup: Upgrade to v5 Format with CategoryRecords

## Bugs Found (line 137-141 of `src/main.tsx`)

```ts
const data: Record<string, unknown> = {
  version: 4, type: "full",          // ← Bug 1: Still v4
  cards,
  categories: categories.map(r => r.name),  // ← Bug 2: Strips UUIDs, writes string[]
  subcategories,
```

The `buildBackupData()` function in the Electron IPC backup path was never updated during the Tier 3 hardening. It writes `version: 4` and flattens `categories` to a `string[]` — losing UUIDs, sortOrder, and subcategory data embedded in CategoryRecords.

## Fix

Two line changes in `src/main.tsx`:

1. **Line 138**: `version: 4` → `version: 5`
2. **Line 140**: `categories: categories.map(r => r.name)` → `categories: categories` (pass full CategoryRecord objects)

This aligns the Electron auto-backup with the manual export format already fixed in `useCardExport.ts` (Step 4b). The `subcategories` field remains for backward compatibility with older importers.

## Scope
- Only `src/main.tsx` lines 138 and 140 change
- No IPC, preload, or backup.cjs changes
- Import logic already handles both formats (string[] and CategoryRecord[])

