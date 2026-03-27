

# UI Cleanup & Database Page Decomposition

## Overview
Three workstreams: (1) strip misused `font-display` from Forum UI labels/descriptions, (2) split the monolithic DatabasePage into separate routed tabs, (3) restructure nav to group database sub-pages under "Baza" dropdown.

## 1. Forum UI — Typography Cleanup

Strip `font-display` from non-title elements. Only keep it on major page titles (h1).

### Files to edit:
- **`src/views/RomanForumPage.tsx`** line 64: remove `font-display` from "Napredak" label; line 75: remove `font-display` from empty-state paragraph
- **`src/components/gamification/ForumTransition.tsx`** line 46: keep `font-display` (this IS a title)
- **`src/components/gamification/MonumentInterior.tsx`**: no `font-display` found — no changes

The monument-effects.tsx, monument-buildings.tsx, monument-svg.tsx, ArchNode.tsx, MonumentCard.tsx have no `font-display` — no changes needed.

Forum animations are already clean (simple opacity fades, 200ms transitions, no particles). No animation changes needed.

## 2. Database Page Decomposition

Current DatabasePage has 4 tabs: Kartice, Kategorije, Izvori, Registar izvora. Plus modal-based DOCX import and Export/Import dialogs.

**Approach**: Split into 4 dedicated route pages. Each page gets its own route and renders one tab's content. Export/Import and DOCX Import become accessible from the Kartice page (their primary context).

### New files:
- **`src/views/CardsPage.tsx`** — renders CardsView + Export/Import + DOCX Import buttons
- **`src/views/CategoriesRoutePage.tsx`** — renders CategoriesPage
- **`src/views/SourcesRoutePage.tsx`** — renders SourcesView
- **`src/views/SourceRegistryPage.tsx`** — renders SourceManager

### Remove:
- **`src/views/DatabasePage.tsx`** — delete (logic moves to new files)

### Update:
- **`src/App.tsx`** — replace `/database` route with 4 new routes:
  - `/cards` → CardsPage
  - `/categories` → CategoriesRoutePage  
  - `/sources` → SourcesRoutePage
  - `/source-registry` → SourceRegistryPage
  - Keep `/database` as redirect to `/cards` for backward compat

## 3. Navigation — "Baza" Dropdown

### `src/components/TopNav.tsx`
- Replace the single "Baza podataka" NavLink with a dropdown similar to existing "Alati" pattern
- Label: "Baza"
- Items: Kartice (`/cards`), Kategorije (`/categories`), Izvori (`/sources`), Registar izvora (`/source-registry`)
- Same clean popover style as Alati dropdown

### Update event listener
- The custom event `memoria-open-database-tab` is used in a few places to programmatically switch tabs. Search for this event and update dispatchers to navigate to the correct new route instead.

## 4. Breadcrumbs & References

- **`src/components/Breadcrumbs.tsx`** — add route labels for new paths
- **`src/components/MainLayout.tsx`** — update `SOURCE_ROUTES` array to include new route paths if needed for full-width layout

## Files Changed Summary

| File | Action |
|------|--------|
| `src/views/RomanForumPage.tsx` | Remove 2 `font-display` from non-title elements |
| `src/views/CardsPage.tsx` | **New** — cards tab + export/import/docx buttons |
| `src/views/CategoriesRoutePage.tsx` | **New** — categories wrapper |
| `src/views/SourcesRoutePage.tsx` | **New** — sources wrapper |
| `src/views/SourceRegistryPage.tsx` | **New** — source manager wrapper |
| `src/views/DatabasePage.tsx` | Delete or redirect |
| `src/App.tsx` | Register 4 new routes, redirect old `/database` |
| `src/components/TopNav.tsx` | Replace single DB link with "Baza" dropdown |
| `src/components/Breadcrumbs.tsx` | Add labels for new routes |
| `src/components/MainLayout.tsx` | Update SOURCE_ROUTES if needed |

## Guardrails
- Zero changes to hooks, persist-queue, db.ts, or FSRS
- Each new page file is a thin wrapper importing existing lazy components
- No logic rewrite — just visual reorganization

