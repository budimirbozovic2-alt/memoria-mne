

# Fix C1 + C2: DB Blocked Handler Accumulation & Persist Queue Async Flush

## C1: `db.on("blocked")` Handler Accumulation

**Bug**: Every call to `ensureDbOpen()` registers a new `db.on("blocked", ...)` handler. During HMR or retries, handlers accumulate, and stale `blockedReject` closures from previous calls can fire unexpectedly, causing unhandled rejections.

**Fix in `src/lib/db.ts`**:
- Move the blocked handler registration **outside** `ensureDbOpen`, registering it once on the module-level `db` instance
- Use a module-level mutable reference (`let _blockedReject`) that `ensureDbOpen` sets before `db.open()` and clears after
- The single handler checks `_blockedReject` and calls it only if set

```text
// Module level (once):
let _blockedReject: ((err: Error) => void) | null = null;
db.on("blocked", () => {
  console.warn("[MemoriaDB] DB open blocked by another connection");
  _blockedReject?.(new Error("DB_BLOCKED"));
});

// Inside ensureDbOpen:
// - Remove db.on("blocked", ...) call
// - Set _blockedReject = reject before race
// - Clear _blockedReject = null in finally
```

## C2: Async `flush()` Called Synchronously on Unmount

**Bug**: `cleanup()` calls `flush()` (async) but doesn't await it. On tab close or unmount, the browser can kill the page before the async IDB writes complete, causing silent data loss. The `sessionStorage` dirty flag partially mitigates this but doesn't prevent the loss.

**Fix in `src/lib/persist-queue.ts`**:
- In `cleanup()`, instead of calling async `flush()`, use **synchronous `navigator.sendBeacon`** as a last-resort signal, and fire-and-forget the flush
- Add a `beforeunload` listener (registered once) that:
  1. Sets the `codex-flush-pending` sessionStorage flag
  2. Attempts a synchronous-safe final write via `navigator.sendBeacon` to a no-op endpoint (as a persistence marker)
  3. Calls `flush()` fire-and-forget (browser may or may not complete it)
- Refactor `cleanup()` to:
  1. Clear the timer
  2. If pending actions exist, attempt `flush()` (fire-and-forget) — this handles React unmount during normal navigation
  3. Mark dirty flag synchronously so next boot detects it
- Register a **global `visibilitychange`** listener that eagerly flushes when the page becomes hidden (more reliable than `beforeunload` for mobile/tab-switch)

```text
// Module level:
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pending.length > 0) {
      // Eager flush when tab loses visibility
      try { sessionStorage.setItem("codex-flush-pending", "1"); } catch {}
      flush(); // fire-and-forget, browser gives ~5s for hidden tab work
    }
  });
}

// cleanup() becomes:
function cleanup() {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  if (pending.length > 0) {
    try { sessionStorage.setItem("codex-flush-pending", "1"); } catch {}
    flush(); // fire-and-forget — best effort
  }
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db.ts` | Move `db.on("blocked")` to module level with mutable reject ref; clean up ref in finally |
| `src/lib/persist-queue.ts` | Add `visibilitychange` eager flush; mark dirty flag synchronously in cleanup; keep flush fire-and-forget |

## Risk Assessment
- C1 fix is a pure structural move — same behavior, no accumulation
- C2 fix adds a safety net without changing flush logic — `visibilitychange` is the most reliable cross-browser signal for "page going away"
- No FSRS, UI, or boot sequence changes

