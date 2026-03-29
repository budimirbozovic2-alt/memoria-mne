

# Tier 3 Step 1: Strict UUID Validation in ExportImportDialog

## What
Replace the weak sample-check validation (lines 98–132) with comprehensive UUID validation for all imported entities: categories, cards, sources, and mindMaps. Legacy v1 JSON files with string-based IDs will be rejected with clear error messages.

## Change

**`src/components/ExportImportDialog.tsx`** — lines 98–132

Replace the current validation block:

```typescript
// Current (REMOVE):
const errors: string[] = [];
if (!parsed || typeof parsed !== "object") { ... }
if (!Array.isArray(parsed.cards)) { ... }
const importedCards: any[] = (parsed.cards || []).map(...sanitize...);
// sample check loop (10 cards, string-type only)
```

With the user-provided strict UUID validation block:

```typescript
const errors: string[] = [];
const uuidRegex = /^[0-9a-f]{8}-...$/i;
const isValidUUID = (id: any) => typeof id === 'string' && uuidRegex.test(id);

// Structure check
// Categories UUID check (break on first failure)
// Sanitize + map importedCards
// Cards UUID check: id, categoryId, sections (break on first failure)
// Sources UUID check: id, categoryId (break on first failure)
// MindMaps UUID check: id (break on first failure)
```

The exact replacement code is provided in the user's directive — lines 98–132 are replaced, `setProgress(80)` on line 132 stays as the boundary.

## Scope
- Only the validation block inside `handleFileSelect` changes
- No UI, props, ZIP logic, or export logic touched
- Net effect: ~34 lines replaced with ~50 lines of strict validation

