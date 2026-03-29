

# Tier 3 Electron Hardening — Audit Result & Plan

## Part A: Require Paths — NO CHANGE NEEDED

The user's premise is **incorrect**. The files `window.cjs` and `backup.cjs` **do** reside inside the `electron/` subdirectory:

```
electron/
  backup.cjs
  window.cjs
```

The current require statements on lines 44-45 are **correct**:
```js
require(path.join(__dirname, 'electron', 'window.cjs'))
require(path.join(__dirname, 'electron', 'backup.cjs'))
```

No change will be made here — changing these would **break** the app.

## Part B: Harden save-file IPC Handler — VALID FIX

The `save-file` handler on line 80-88 does not strip data URI prefixes. If the frontend ever passes a string like `data:application/json;base64,eyJ...`, `Buffer.from()` will produce a corrupted file.

### Change: `main.cjs` lines 80-88

Replace the `save-file` handler with a version that strips data URI prefixes:

```js
ipcMain.handle('save-file', async (_event, filePath, base64Data) => {
  try {
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    return true;
  } catch (err) {
    logCrash('save-file', err);
    return false;
  }
});
```

One line added, zero risk. The regex is a no-op when the string is already clean base64.

## Scope

- Only the `save-file` handler body changes (1 line added)
- No protocol, preload, crash recovery, or window logic touched
- Part A is skipped because the directory structure is already correct

