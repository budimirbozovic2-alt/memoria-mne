

# Remove Sidebar Fallback Mechanism

## What
Remove the defensive `fallbackCategories` state + `useEffect` with `setTimeout` + `seedDefaultCategories()` from `AppSidebar.tsx`. Categories are now reliably provided via `categoryRecords` from context (loaded during boot).

## Changes

**`src/components/AppSidebar.tsx`**
- Remove `useState` for `fallbackCategories`
- Remove the `useEffect` that does `setTimeout` → `seedDefaultCategories()`
- Remove `displayCategories` variable — use `categoryRecords` directly in the map
- Remove `useState` from imports (only `useEffect` was using it; check if anything else needs it)
- Keep everything else identical

Net result: ~15 lines removed, zero behavioral change since boot already guarantees categories.

