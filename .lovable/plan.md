

# Fix: Sidebar Categories Not Rendering

## Root Cause

The `useLiveQuery` in `AppSidebar.tsx` fires immediately on mount. If the DB is open but `seedDefaultCategories()` in `useCardBootstrap` hasn't completed yet (race condition), the query returns an empty array. Once boot finishes and seeds categories, `useLiveQuery` should reactively update — but if `ensureDbOpen()` hasn't been called yet, Dexie may auto-open the DB in an uninitialized state where the seed never ran.

## Fix

Add a `useEffect` in `AppSidebar.tsx` that triggers seeding when the live query returns empty:

```ts
useEffect(() => {
  if (categories.length === 0) {
    seedDefaultCategories().catch(console.error);
  }
}, [categories.length]);
```

This is a defensive guard: if categories are empty (either due to race condition or clean slate), it seeds defaults. The `useLiveQuery` will reactively pick up the new rows.

## Changes

| File | Change |
|---|---|
| `src/components/AppSidebar.tsx` | Import `seedDefaultCategories` from `@/lib/db`, add `useEffect` to seed when empty |

One small edit — no structural changes.

