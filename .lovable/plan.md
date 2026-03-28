

# Phase 2.5: Sidebar UI Fixes

## Current State Analysis

The code already has most of what's requested but needs two adjustments:

1. **Rename "Konsolidacija" → "Učenje"** in STATIC_NAV (line 20 of AppSidebar.tsx)
2. **Categories may not load** because `idbLoadCategories()` fires once on mount via `useEffect`, but the DB may not be open yet at that point. Switch to `useLiveQuery` from `dexie-react-hooks` for reactive category loading.
3. **Empty states already exist** in CategoryView — they show "Nema kartica/izvora u ovoj kategoriji." These can be enhanced with icons for better visual clarity.

## Changes

### 1. `src/components/AppSidebar.tsx`

- Change label from `"Konsolidacija"` to `"Učenje"` in STATIC_NAV
- Replace the `useEffect` + `useState` pattern with `useLiveQuery(() => db.categories.orderBy("sortOrder").toArray())` from `dexie-react-hooks` for reliable reactive loading
- Add `dexie-react-hooks` import (already in dependencies)

### 2. `src/views/CategoryView.tsx`

- Enhance empty states with icons (`BookOpen` for cards, `FileText` for sources) and slightly more descriptive messages
- No structural changes needed — the 3-tab layout and data fetching are already correct

### 3. `package.json`

- Verify `dexie-react-hooks` is already a dependency (it should be from the Dexie setup). If not, add it.

## Summary

Two small edits — rename a label, swap `useEffect` for `useLiveQuery`, and polish empty states. No architectural changes.

