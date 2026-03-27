

# Deep Loading Diagnostics — Analysis & Fix Plan

## Boot Sequence Trace (Current Flow)

```text
index.html         → splash DOM visible (10s auto-retry timer)
main.tsx           → 8s splash removal safety timer
                   → React render (App.tsx)
  App.tsx          → CardProvider → useCards() → useCardBootstrap()
    bootstrap      → ensureDbOpen(6000ms timeout)
                   → migrateFromLocalStorage()
                   → initMetacognitiveCache() + initPlannerCache()
                   → idbLoadCards/Categories/Subcategories/ReviewLog/Settings
                   → setReady(true) in finally block
  useCards.ts      → 5s forceReady safety net
```

## Findings

### No Critical Hang Bugs Found
The boot sequence has **3 layers of protection** already working correctly:
1. `useCardBootstrap` panic timer (8s)
2. `useCards` forceReady timer (5s)  
3. `main.tsx` splash removal timer (8s)
4. `index.html` 10s boot-fallback with auto-retry

The `finally` block in `useCardBootstrap` **always** runs `setReady(true)`, even on error. The `dbOk === false` path does `return` but `finally` still executes.

### What's Likely Happening in Sandbox
The Lovable sandbox has restricted/slow IndexedDB. The `ensureDbOpen(6000)` call may hang for up to 6 seconds. Combined with cache init and data loading, the total can approach 8+ seconds before UI shows.

### Real Issues Found (Minor-to-Medium)

**1. Missing `onblocked` handler on Dexie** — If another tab has the DB open during HMR, Dexie can enter a "blocked" state that never resolves within the 6s timeout. No handler exists to detect this.

**2. No timeout on `migrateFromLocalStorage()`** — Line 101 in bootstrap awaits migration with no timeout wrapper. If any `bulkAdd` call hangs (e.g., QuotaExceededError on a large review log), it blocks indefinitely until the 8s panic timer fires.

**3. No timeout on `initMetacognitiveCache()` + `initPlannerCache()`** — These are wrapped in `.catch()` but not in `withTimeout()`. If `db.diary.toArray()` or similar hangs, it blocks until panic.

**4. `RomanForumPage` calls `idbLoadReviewLog()` independently** — This loads ALL review log entries (no day filter) every time the Forum page mounts, duplicating data already in context. For large logs this is slow and wasteful.

**5. Splash removal race** — `main.tsx` line 42 removes splash after 8s. `useCardBootstrap` panic timer also removes splash after 8s. Both can race. Not harmful but messy.

## Fix Plan

### Fix 1: `src/lib/db.ts` — Add `onblocked` handler
- On `db.open()`, Dexie supports `db.on('blocked', callback)`. Register a handler that logs a warning and triggers the timeout reject early, preventing indefinite "blocked" state.

### Fix 2: `src/hooks/useCardBootstrap.ts` — Wrap migration + cache init in withTimeout
- Wrap `migrateFromLocalStorage()` in `withTimeout(…, 3000, "migration", undefined)`
- Wrap the `Promise.all([initMetacognitiveCache, initPlannerCache])` in `withTimeout(…, 3000, "cache init", undefined)`
- This ensures every async step has a bounded execution time

### Fix 3: `src/views/RomanForumPage.tsx` — Use context reviewLog
- Replace `idbLoadReviewLog().then(setReviewLog)` with the `reviewLog` already available from `useCardContext()`
- Eliminates redundant full-table scan on every Forum mount

### Fix 4: `src/hooks/useCardBootstrap.ts` — Add diagnostic console markers
- Add `console.log("[boot:diag] step N: description")` at each stage boundary
- These are lightweight and help diagnose any future stalls

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db.ts` | Add `db.on('blocked')` handler in `ensureDbOpen` |
| `src/hooks/useCardBootstrap.ts` | Wrap migration + cache init in `withTimeout`; add diagnostic markers |
| `src/views/RomanForumPage.tsx` | Use `reviewLog` from context instead of separate IDB load |

## Risk Assessment
- All changes are additive safety nets — no existing logic altered
- Forum page change removes a redundant IDB call (pure improvement)
- No FSRS, UI style, or boot timer changes

