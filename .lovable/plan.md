

# Fix Eternal Loading Screen in Electron

## Root Cause Analysis

The app already uses `HashRouter` and `base: './'` — those are correct. The actual culprits are:

1. **CSP blocks dynamic imports under `file://`** — In `main.cjs:52-61`, the production CSP sets `script-src 'self' 'unsafe-inline'` but under the `file://` protocol, `'self'` origin matching is unreliable in Chromium. Dynamic `import()` calls in `main.tsx` (lines 55, 61, 65) silently fail, so React never mounts.

2. **Service Worker registration crashes under `file://`** — In `main.tsx:189-201`, production mode tries `navigator.serviceWorker.register("./sw.js")`. Service workers are not supported under `file://` and this can throw an unhandled error.

3. **SW cache poisoning** — The service worker caches absolute paths (`/`, `/index.html`) which don't exist under `file://`, potentially intercepting navigation requests and returning broken responses.

## Changes

### 1. `main.cjs` — Relax CSP for file:// protocol (~3 lines)

Only apply the CSP `onHeadersReceived` filter when the URL scheme is **not** `file://`. This lets Electron load scripts freely from local disk (which is already sandboxed by `contextIsolation: true`).

```js
// Line 52: add protocol check
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  // Skip CSP for file:// — 'self' doesn't match reliably under file protocol
  if (details.url.startsWith('file://')) {
    return callback({ responseHeaders: details.responseHeaders });
  }
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';"
      ],
    },
  });
});
```

### 2. `src/main.tsx` — Skip service worker in Electron (~2 lines)

Wrap the SW registration block with an Electron guard:

```ts
// Line 189: add Electron guard
if ("serviceWorker" in navigator && !(window as any).electronAPI) {
```

This prevents SW registration entirely when running inside Electron, avoiding both the `file://` crash and cache poisoning.

### 3. `public/sw.js` — Use relative cache paths (safety net)

Change `STATIC_ASSETS` from absolute paths to relative, so even if SW somehow registers, it won't cache-intercept with broken absolute URLs:

```js
const STATIC_ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
```

## Files Changed

| File | Change |
|------|--------|
| `main.cjs` | Skip CSP header injection for `file://` URLs |
| `src/main.tsx` | Skip SW registration when `electronAPI` is present |
| `public/sw.js` | Use relative paths in `STATIC_ASSETS` |

## What stays the same
- `App.tsx` — already uses `HashRouter` ✅
- `vite.config.ts` — already has `base: './'` ✅
- `electron/window.cjs` — fallback timers and `loadFile` path are correct ✅
- All DB/persistence logic untouched

