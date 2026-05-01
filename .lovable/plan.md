# Phase 1 — Release Safeguards

Three surgical changes. No refactors, no touches outside the listed lines.

---

## 1. Dexie Log Retention (QuotaExceededError prevention)

**File:** `src/hooks/useCardBootstrap.ts` — schedule the prune once per session, after `ensureDbOpen` succeeds (line 87 area). Wrapped in `requestIdleCallback` (with `setTimeout` fallback) so it never blocks boot.

**Helper file (new):** `src/lib/log-retention.ts` — keeps the pruning logic isolated and unit-testable. Targets the five append-only logs the user specified: `reviewLog`, `latencyLog`, `calibrationLog`, `activityLog`, `pomodoroLog`. Cap = **10,000** newest entries each.

```ts
// src/lib/log-retention.ts  (NEW)
import { db } from "./db-schema";

const MAX_RETAIN = 10_000;
const LOG_TABLES = ["reviewLog", "latencyLog", "calibrationLog", "activityLog", "pomodoroLog"] as const;
let didRunThisSession = false;

export async function pruneAppendOnlyLogs(): Promise<void> {
  if (didRunThisSession) return;
  didRunThisSession = true;
  try {
    await db.transaction("rw", LOG_TABLES.map(n => db.table(n)), async () => {
      for (const name of LOG_TABLES) {
        const tbl = db.table(name);
        const count = await tbl.count();
        if (count <= MAX_RETAIN) continue;
        const toDelete = count - MAX_RETAIN;
        // Auto-incrementing PK ⇒ ordering by primary key === chronological.
        const oldestKeys = await tbl.toCollection().primaryKeys();
        await tbl.bulkDelete(oldestKeys.slice(0, toDelete));
      }
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[log-retention] prune failed", err);
  }
}

export function scheduleLogPrune(): void {
  const run = () => { void pruneAppendOnlyLogs(); };
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === "function") ric(run, { timeout: 8000 });
  else setTimeout(run, 4000);
}
```

**Insertion in `src/hooks/useCardBootstrap.ts`:**
- Add import at the top of the existing import block.
- Call `scheduleLogPrune()` immediately after the `ensureDbOpen` success branch (right after line 87, inside the same `if (dbOk)` flow that already exists in the bootstrap).

```ts
// near existing imports
import { scheduleLogPrune } from "@/lib/log-retention";

// after: const dbOk = await ensureDbOpen(6000);
if (dbOk) scheduleLogPrune();
```

---

## 2. Strict CSP — IMPORTANT DEVIATION REQUIRED

The user asked to drop this exact meta into `index.html <head>`:

```
default-src 'self' app:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' app:;
```

**This will hard-break the web/preview build and dev mode**, because:

- `index.html` lines **92–117** contain an **inline `<script>`** (boot retry + 10s safety timer). `script-src 'self'` blocks it → no retry, no fallback UI.
- Vite dev/HMR injects inline scripts and connects via `ws://` → blocked by `connect-src 'self' app:`.
- The `<div id="app-splash">` and fallback UI use **inline `style="…"` attributes** (lines 34–85). These need `'unsafe-inline'` in `style-src` (already present — fine).
- `og:image` / `twitter:image` reference an external R2 URL — fine (it's an OG meta, not an `<img>`).
- The `app:` scheme is unknown to browsers; harmless in web but adds nothing there.

Production Electron **already has a strict CSP** applied via `main.cjs:211–223` over the `app://` protocol, which is the deployment target. Adding the same restriction as a meta tag in `index.html` provides defense-in-depth there but breaks the web preview.

**Two safe options — pick one:**

**Option A (recommended) — Electron-only meta, injected at runtime:**
Add a tiny inline script (which itself needs to be allowed) before the boot `<script>` that injects the CSP meta only when running under `app://`. Trade-off: the inline injector itself violates `script-src 'self'`, so the meta must be injected *before* it takes effect — which means the meta must allow inline at insertion time. Net result: Option A doesn't actually tighten Electron beyond what `main.cjs` already does.

**Option B (recommended, cleaner) — keep the strict CSP only on the HTTP response header path in `main.cjs` and ALSO add a slightly relaxed meta to `index.html` that survives the inline boot script.** This adds defense-in-depth in case the header is ever stripped:

```html
<!-- insert at index.html line 7, replacing the comment on line 6 -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self' app:; script-src 'self' 'unsafe-inline' app:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: app:; font-src 'self' data: app:; connect-src 'self' blob: app: ws: wss: https://fonts.gstatic.com https://fonts.googleapis.com;">
```

This mirrors the production header in `main.cjs:218–219` and keeps preview functional. **Strictness vs. user's literal request:** allows `'unsafe-inline'` for scripts (required by the boot retry script) and allows `ws:`/`wss:` (required by Vite HMR + Lovable preview).

**If you insist on the literal strict CSP from the brief**, the only safe path is to also:
1. Move the inline boot script (lines 92–117) into a separate `./boot-retry.js` file served from the same origin, and
2. Skip injecting the meta in dev (Vite plugin gating), keeping it only in the production build.

That's a 30-line refactor, not a one-liner. Flagging it as a decision point.

**Default I'll execute unless you say otherwise:** Option B (the relaxed meta above), inserted at `index.html` line 7.

---

## 3. Electron Permission Lockdown

**File:** `main.cjs` — inside the existing `app.whenReady().then(() => { … })` block. Insert **immediately after line 207** (right after the `app://` protocol handler registration block closes) and **before** the existing CSP header block starts at line 209. This keeps it grouped with other session-level lockdowns.

```js
// ── Permission lockdown: deny all default Chromium permission requests ──
session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
  callback(false);
});
session.defaultSession.setPermissionCheckHandler(() => false);
```

The second line (`setPermissionCheckHandler`) is the silent-check counterpart — without it, code can probe permissions via the synchronous Permissions API without ever firing a request handler. Standard hardening pair.

---

## Files touched

| File | Change |
|---|---|
| `src/lib/log-retention.ts` | NEW — prune helper |
| `src/hooks/useCardBootstrap.ts` | +1 import, +1 call after `ensureDbOpen` |
| `index.html` | +1 `<meta>` at line 7 (Option B) |
| `main.cjs` | +4 lines after line 207 |

No tests are required by the brief, but I'll add a short smoke test for `pruneAppendOnlyLogs` against a fake-indexeddb instance if you want — say the word.

---

## Decision needed before I implement

**CSP path**: confirm **Option B (relaxed meta matching `main.cjs` header, preview stays alive)**, OR ask for the literal strict CSP plus the boot-script extraction refactor. Everything else (log retention + permission lockdown) I'll ship as-is.
