

# Fix: IndexedDB Data Not Persisting in Electron (Data Loss on Restart)

## Root Cause

Under `file://` protocol in Chromium (which Electron uses), the origin is **opaque** — meaning IndexedDB gets a unique, non-persistent storage context. Data written during a session exists in memory but is **not guaranteed to persist** across app restarts. This is why the app works perfectly during a session but starts empty on next launch.

The fix: register a **custom `app://` protocol** that serves dist files with a **stable, consistent origin**, making IndexedDB fully persistent.

## Changes

### 1. `main.cjs` — Register custom protocol scheme (before `app.whenReady`)

Add `protocol.registerSchemesAsPrivileged` call **before** `app.whenReady()` to register an `app` scheme with:
- `standard: true` (enables proper URL resolution)
- `secure: true` (enables IndexedDB, localStorage, etc.)
- `supportFetchAPI: true`

Inside `app.whenReady()`, register a file protocol handler that maps `app://localhost/` requests to the `dist/` directory.

### 2. `electron/window.cjs` — Load via `app://localhost/index.html` instead of `loadFile`

In the production branch of `createWindow`:
- Replace `win.loadFile(indexPath)` with `win.loadURL('app://localhost/index.html')`
- The fallback in `did-fail-load` also uses `app://localhost/index.html`
- Remove `webSecurity: false` (no longer needed — `app://` is a proper secure origin)

### 3. No changes to renderer code

The app code (`src/`) remains untouched. IndexedDB, localStorage, and all Web APIs work identically under `app://` as they do under `http://`.

## Why This Works

| Protocol | Origin | IndexedDB Persists? |
|----------|--------|-------------------|
| `file://` | Opaque/null | No (or unreliable) |
| `app://localhost` | `app://localhost` | Yes — stable origin |
| `http://localhost` | `http://localhost:PORT` | Yes |

## Files Changed

| File | Change |
|------|--------|
| `main.cjs` | Add `protocol.registerSchemesAsPrivileged` + file handler |
| `electron/window.cjs` | Use `app://localhost/index.html` for production load, remove `webSecurity: false` |

## Risk Assessment

- **Zero impact on web preview** — no renderer code changes
- **Backward compatible** — existing Electron window state, backup system, IPC all unaffected
- **Dev mode unchanged** — still uses `http://localhost:8080`

