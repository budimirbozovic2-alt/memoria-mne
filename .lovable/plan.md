

# Imperial Atlas: Unified Forum + Knowledge Map

## Overview
Replace the current `MonumentDetailDialog` with a full-screen "zoom-in" interior view that embeds the Knowledge Map hierarchy inside each monument, styled with architectural elements. Clicking a monument expands it into a navigable interior panel rather than opening a simple card list dialog.

## Current State (Already Implemented)
- Source Registry + aliases in `source-registry.ts` — **done**
- Source Manager UI in Database tab — **done**
- `useSourceHierarchy` hook with A/B depth logic — **done**
- KnowledgeMap uses source hierarchy when cards have `sourceId` — **done**
- Forum shows monument grid + detail dialog — **done**

## What Changes

### 1. Monument Interior View (`src/components/gamification/MonumentInterior.tsx` — New)

Full-screen glass-card panel that replaces the current `MonumentDetailDialog`. Renders when a monument is selected.

**Layout**: Glass-morphic panel with the monument's SVG building as a small header icon, category name in Cinzel font, and the Knowledge Map subcategory/source tree rendered below — but styled as architectural elements:

- **Mode A** (Multi-Source): Each Master Source is a "wing" — a bordered section with the source name as a stone lintel header. Inside each wing, subcategories appear as column cards.
- **Mode B** (Deep-Dive): Subcategories appear as tall column cards directly. Chapters appear inside each column when expanded.

Each node shows its mastery bar (reusing the existing `levels` color bar from SubcategoryCard) plus a visual health indicator:
- Stability < 10 → subtle crack SVG overlay on the node card
- Stability < 5 → ivy/moss tint on the border
- All mastered → golden border glow

Clicking a node navigates to the MentalSkeleton detail view (same as KnowledgeMap's step 3).

**Back button** returns to the monument grid.

### 2. Zoom-In Transition

Use `framer-motion` `layoutId` on the MonumentCard and MonumentInterior to create a smooth expand animation. The card expands from its grid position to fill the page area.

Fallback: If `layoutId` proves complex, use a simple `AnimatePresence` with scale-up + fade from the card's center.

### 3. Update `RomanForumPage.tsx`

Replace the `MonumentDetailDialog` with conditional rendering:
- `selectedCategory === null` → show monument grid
- `selectedCategory !== null` → show `MonumentInterior` for that category

Pass `cards`, `sources`, `subcategories`, and Knowledge Map callbacks through.

### 4. Architectural Node Card (`src/components/gamification/ArchNode.tsx` — New)

A styled version of `SubcategoryCard` for the Forum interior:
- Glass-card with subtle column SVG decoration on the sides
- Mastery color bar at the bottom
- Crack/ivy overlay computed from average stability of cards in that node
- Gold shimmer border for nodes with 100% mastery
- Click → navigates to MentalSkeleton detail

### 5. KnowledgeMap Sync

No changes needed — KnowledgeMap already uses `useSourceHierarchy` with the same A/B logic and source registry. The Forum interior reuses the same hook, ensuring both views show identical hierarchy.

### 6. Forum Statistics Aggregation

Already done — `calculateForumState` loads source registry and populates `monument.sources[]`. The interior view can display per-source mastery breakdowns using this existing data.

## Files Changed

| File | Change |
|------|--------|
| `src/components/gamification/MonumentInterior.tsx` | **New**: Full-screen interior view with architectural nodes |
| `src/components/gamification/ArchNode.tsx` | **New**: Styled node card with crack/ivy overlays |
| `src/views/RomanForumPage.tsx` | Replace dialog with interior view, pass KnowledgeMap props |
| `src/components/gamification/MonumentCard.tsx` | Add `layoutId` for zoom transition |
| `src/views/KnowledgeMapPage.tsx` | No change (already uses source hierarchy) |

## Execution Order
1. Create `ArchNode.tsx` (styled node component)
2. Create `MonumentInterior.tsx` (interior panel with hierarchy)
3. Update `MonumentCard.tsx` (add layoutId)
4. Update `RomanForumPage.tsx` (swap dialog for interior, wire navigation)

## Guardrails
- No FSRS math changes
- No changes to source-registry or useSourceHierarchy (already correct)
- Existing KnowledgeMap stays untouched
- Standard barrel imports for icons
- `useMemo` for all hierarchy computations inside the interior
- MonumentDetailDialog kept but unused (can be removed in cleanup)

