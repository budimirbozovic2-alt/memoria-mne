

# Phase 2: Layout & Routing Shell

## What Already Exists
- `src/components/ui/sidebar.tsx` — full sidebar component system (SidebarProvider, Sidebar, SidebarContent, etc.)
- `src/components/AppSidebar.tsx` — sidebar with static nav + dynamic categories + tools (has a local `cn` duplicate to fix)
- `src/lib/db.ts` — already has the correct 9 categories seeded
- `src/components/ui/tabs.tsx` — existing Tabs components

## Changes Required

### 1. Create `src/views/CategoryView.tsx` (NEW)
The bounded-context view for `/category/:categoryId`:
- Read `categoryId` from `useParams()`
- Load category name via `db.categories.get(categoryId)`
- Load scoped cards via `db.cards.where("categoryId").equals(categoryId).toArray()`
- Load scoped sources via `db.sources.where("categoryId").equals(categoryId).toArray()`
- Render category name as page header
- 3 tabs using existing `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`:
  - **Kartice** — simple list showing card question + type badge + count in tab label
  - **Izvori** — simple list showing source title + date + count in tab label
  - **Mnemonička radionica** — placeholder text confirming scoped categoryId

### 2. Update `src/App.tsx`
- Add lazy import for `CategoryView`
- Add route: `<Route path="/category/:categoryId" element={<CategoryView />} />`
- Wrap the main layout area with `SidebarProvider` (from sidebar.tsx)

### 3. Rewrite `src/components/MainLayout.tsx`
- Replace `TopNav` rendering with sidebar-based layout:
  - Render `<AppSidebar />` on the left
  - Main content area on the right
  - Small header bar with `<SidebarTrigger />`, dark mode toggle, search button, Ctrl+K shortcut
- Keep all existing features: Breadcrumbs, NudgeWatcher, ZenMode, GlobalSearch, DocxImporter, AppOnboarding
- Add `/category/` prefix to `SOURCE_ROUTES` for full-width layout

### 4. Fix `src/components/AppSidebar.tsx`
- Remove local `cn` function duplicate (use `import { cn } from "@/lib/utils"` instead)
- Already correct otherwise

### 5. Update `src/components/Breadcrumbs.tsx`
- Add dynamic breadcrumb for `/category/:categoryId` paths
- Show: Dashboard > {CategoryName} (load category name from IDB or pass via state)

### 6. Move TopNav utilities to header
- Dark mode toggle, search trigger, version dialog — move to a compact header strip inside MainLayout
- TopNav.tsx file stays but is no longer the primary navigation component

## Architecture

```text
┌─────────────────────────────────────────────────┐
│ TitleBar                                        │
├──────────┬──────────────────────────────────────┤
│          │ [≡] [breadcrumbs]        [🔍] [☀/🌙]│
│ Sidebar  ├──────────────────────────────────────┤
│          │                                      │
│ Dashboard│  <Routes>                            │
│ Učenje   │    /              → DashboardPage    │
│ Konsolid.│    /category/:id  → CategoryView     │
│ Forum    │      ┌───────┬────────┬───────────┐  │
│ Podešav. │      │Kartice│Izvori  │Mnemo rad. │  │
│ ──────── │      ├───────┴────────┴───────────┤  │
│ Predmeti │      │ scoped card/source list    │  │
│  Krivič..│      └────────────────────────────┘  │
│  Građan..│    /review        → ReviewPage       │
│  ...     │    /forum         → RomanForumPage   │
│ ──────── │    ...                               │
│ Alati    │                                      │
│  Statist.│                                      │
│  Planer  │                                      │
└──────────┴──────────────────────────────────────┘
```

## Files Summary

| File | Action |
|---|---|
| `src/views/CategoryView.tsx` | **CREATE** — bounded context with 3 tabs |
| `src/App.tsx` | Add CategoryView route + SidebarProvider wrapping |
| `src/components/MainLayout.tsx` | Replace TopNav with Sidebar layout + header bar |
| `src/components/AppSidebar.tsx` | Fix `cn` import |
| `src/components/Breadcrumbs.tsx` | Add `/category/:categoryId` breadcrumb |

## What This Does NOT Touch
- No Mode A/B card toggle
- No Source Editor
- No Forum changes
- No complex card editing UI

