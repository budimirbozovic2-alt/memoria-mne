

# Phase 3: Monumentalna Arhitektura

## Overview
Replace the simple pillar bars in MonumentCard with detailed SVG building silhouettes. Each category gets a user-chosen building type (from 9 Roman archetypes). Buildings visually evolve through material tiers (wood → gold). Dynamic effect overlays reflect FSRS health metrics.

## Architecture

```text
monument-svg.tsx          ← SVG primitives (columns, roofs, bases)
monument-buildings.tsx    ← 9 building composers using primitives
monument-effects.tsx      ← Overlay effects (cracks, water, torches, scaffolding)
MonumentCard.tsx           ← Updated to render SVG building + effects
forum-logic.ts             ← Add buildingType to Monument interface
CategoryManager.tsx        ← Building type picker per category
```

## Storage
- `localStorage` key `codex-monument-types`: `Record<string, BuildingType>` mapping category name → building type
- Default: unassigned categories get `"insula"` (generic Roman house)

## New Types

```ts
type BuildingType =
  | "amphitheatrum" | "basilica" | "tabularium" | "rostra"
  | "curia" | "macellum" | "argentaria" | "templum" | "arcus"
  | "insula"; // fallback
```

## Task 1: SVG Primitive Library (`monument-svg.tsx`)

Reusable building blocks, all receiving `tier: MaterialTier` and computing fill/stroke from a color palette:

| Primitive | Wood | Brick | Stone | Marble | Gold |
|-----------|------|-------|-------|--------|------|
| **Column** | Simple post (Doric stub) | Tapered brick pillar | Fluted Doric | Ionic with volutes | Corinthian with acanthus |
| **Roof** | Flat timber plank | Low-pitched tiles | Triangular pediment | Curved dome | Grand pediment + gold acroteria |
| **Base** | Rough timber platform | Brick steps (2) | Cut stone steps (3) | Polished marble podium (4 steps) | Gold-trimmed podium with relief |
| **Arch** | Timber lintel | Brick semicircle | Stone voussoirs | Marble with keystone | Gold arch with relief |
| **Wall** | Vertical planks | Brick pattern (rect grid) | Ashlar blocks | Smooth marble surface | Gold-veined marble |

Each primitive is a pure SVG group (`<g>`) positioned at local origin, ~120x160 viewBox. Colors derived from tier:
- Wood: `hsl(30, 50%, 35%)` range
- Brick: `hsl(15, 60%, 40%)` range
- Stone: `hsl(0, 0%, 50%)` range
- Marble: `hsl(210, 15%, 85%)` range
- Gold: `hsl(var(--gold))` with shimmer gradient

## Task 2: 9 Building Composers (`monument-buildings.tsx`)

Each building is a function component returning an SVG that composes primitives. All share the same viewBox (`0 0 200 160`) for consistent card sizing.

| Building | Visual Description |
|----------|-------------------|
| **Amphitheatrum** | Elliptical/circular outline, 3 tiers of arches stacked, open top |
| **Basilica** | Long rectangular nave, tall apse on right, row of columns along sides |
| **Tabularium** | Wide fortified facade, 2 rows of arched windows, heavy cornice |
| **Rostra** | Elevated platform with stepped front, 3 prow-shapes (triangles) on facade |
| **Curia** | Tall rectangular hall, large triangular roof, single grand entrance |
| **Macellum** | Circular market outline, central domed tholos, surrounding colonnade |
| **Argentaria** | Classic portico: 4-6 columns, triangular pediment, symmetrical |
| **Templum** | Grand temple: wide staircase, 6+ columns, massive pediment with relief |
| **Arcus** | Single triumphal arch, central large arch + 2 smaller flanking, attic on top |
| **Insula** | Simple 3-story building with rectangular windows (fallback) |

A single `<MonumentSVG buildingType={type} tier={tier} />` component switches between them.

## Task 3: Dynamic Effects (`monument-effects.tsx`)

Overlay SVG elements rendered on top of the building based on monument data:

| Effect | Condition | Visual |
|--------|-----------|--------|
| **Cracks** | `crumbling === true` | Dark SVG path lines across the facade, opacity scales with leech ratio |
| **Ivy/Moss** | `avgStability < 10` | Green organic SVG paths creeping up from base |
| **Torches** | `mastery > 30` | Golden radial gradient circles in window/portico areas, count = tier level |
| **Scaffolding** | `material === "wood"` or upgrading | Crossed wooden beam lines overlaying the structure |
| **Fountain** | `avgStability > 30 && mastery > 60` | Simple animated water droplet below building (CSS pulse) |

Rendered as `<MonumentEffects monument={monument} />` — a single SVG overlay group.

## Task 4: Construction Animation

Already partially implemented (shimmer + particles in MonumentCard). Enhance:
- When tier changes, cross-fade the old SVG building to the new one using `AnimatePresence` with `mode="wait"`
- The existing particle burst + shimmer remain as the celebration layer
- Add a brief "dust cloud" effect: 6 small grey circles that expand and fade at the building base during transition

## Task 5: Building Type Picker

**In CategoryManager.tsx**: Add a small icon button next to each category name that opens a popover with a 3x3+1 grid of building silhouette thumbnails. Clicking one saves to `codex-monument-types` in localStorage.

**In MonumentCard**: Read building type from localStorage, pass to `<MonumentSVG>`.

**In forum-logic.ts**: Add `buildingType: BuildingType` to `Monument` interface, populated from localStorage during `calculateForumState`.

## MonumentCard Update

Replace the current "pillar visualization" section (the `flex items-end` div with bar divs) with:
```
<div className="flex items-center justify-center h-32">
  <MonumentSVG buildingType={monument.buildingType} tier={monument.material} />
  <MonumentEffects monument={monument} />
</div>
```

Keep all existing card chrome (header, progress bar, stats row, shimmer/particle animations).

## Files Changed

| File | Change |
|------|--------|
| `src/components/gamification/monument-svg.tsx` | NEW: SVG primitives + tier color system |
| `src/components/gamification/monument-buildings.tsx` | NEW: 9+1 building composers |
| `src/components/gamification/monument-effects.tsx` | NEW: Dynamic overlay effects |
| `src/lib/forum-logic.ts` | Add `BuildingType` type, `buildingType` to Monument, read from localStorage |
| `src/components/gamification/MonumentCard.tsx` | Replace pillar bars with `<MonumentSVG>` + `<MonumentEffects>` |
| `src/components/CategoryManager.tsx` | Add building type picker popover per category |

## Guardrails
- All SVG is inline React — no external image files
- Uses `hsl(var(--gold))` for all gold/marble highlights
- `glass-card` remains as the card foundation
- Responsive: SVG scales via viewBox
- No FSRS math changes
- No new dependencies
- Standard barrel imports for any icons used

