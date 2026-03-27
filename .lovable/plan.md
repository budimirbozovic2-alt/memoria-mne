

# Fix Import Confirm Button — Diagnosis & Defensive Patch

## Diagnosis

After tracing the full chain, the wiring is **correctly connected**:

```text
CardsPage (onImport={importData})
  → ExportImportDialog.handleImport(strategy)
    → onImport(validation.file, strategy)  // = importData from useCardImport
    → handleOpenChange(false)              // closes dialog
```

No broken references, no missing params, no stale closures. The `importData` function has correct access to `cardMapRef`, `setCardMapState`, and all other deps.

**Most likely cause**: Stale Vite HMR cache after the dead-code elimination round. The old module graph may have retained a broken reference that a full rebuild clears.

## Defensive Cleanup (1 file)

### `src/hooks/useCardImport.ts` — line 3
Remove unused `createSection` import (dead code from previous cleanup):

```
- import { Card, createCard, createSection, SRSettings, DEFAULT_SR_SETTINGS } from "@/lib/spaced-repetition";
+ import { Card, createCard, SRSettings, DEFAULT_SR_SETTINGS } from "@/lib/spaced-repetition";
```

This is the only actual code issue found. The import is harmless at runtime but should be cleaned for hygiene.

## Testing

After this change, the user should:
1. Hard-refresh the preview (Ctrl+Shift+R)
2. Open Cards page → Export/Import → pick a JSON/ZIP file → confirm

If the button still doesn't respond after a hard refresh, a browser console check during the click will reveal the exact error.

