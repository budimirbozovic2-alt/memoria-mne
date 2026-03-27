

# Phase 4: Architectural Blueprint & Construction Evolution

## Overview
Replace the 5-material-tier system (Wood→Gold) with a 5-phase construction evolution (Temelji→Imperijalna) driven by mastery %. Redesign all SVG primitives and buildings as high-end architectural line art — gold lines on slate-950 background, frosted glass surfaces, no filled colored shapes.

## Architecture Changes

### 1. Type System — `src/lib/forum-logic.ts`
- Rename `MaterialTier` to `ConstructionPhase` (type alias kept for backward compat)
- Values: `"foundation" | "skeleton" | "construction" | "complete" | "imperial"`
- Update `getMaterialTier()` → `getConstructionPhase()`:
  - 0-10% → `"foundation"`
  - 11-30% → `"skeleton"`
  - 31-60% → `"construction"`
  - 61-90% → `"complete"`
  - 91-100% → `"imperial"`
- Update `MATERIAL_LABELS` → `PHASE_LABELS`:
  - `foundation: "Temelji"`, `skeleton: "Skele"`, `construction: "Građenje"`, `complete: "Kompletna"`, `imperial: "Imperijalna"`
- Update `MATERIAL_ICONS`:
  - `foundation: "📐"`, `skeleton: "🏗️"`, `construction: "🔨"`, `complete: "🏛️"`, `imperial: "✨"`
- Keep `MaterialTier` as a type alias: `export type MaterialTier = ConstructionPhase;` for backward compat
- Keep `material` field on `Monument` interface (references same type)

### 2. SVG Primitives — `src/components/gamification/monument-svg.tsx`
Full rewrite. New color system:
- `TIER_FILLS` replaced with `PHASE_PALETTE`:
  - `foundation`: very faint gold lines (`hsl(45,60%,40%)` at 30% opacity), dashed strokes
  - `skeleton`: medium gold lines, scaffolding style, dotted structural hints
  - `construction`: solid gold primary lines, partial fills with `white/8` glass
  - `complete`: full gold lines, clean glass surfaces (`white/10` → `white/5` gradient), sharp geometry
  - `imperial`: bright gold (`hsl(45,90%,55%)`), decorative details, subtle glow filter

Primitives redesigned:
- **Column**: Line-art only for foundation/skeleton; partial fill for construction; full entasis for complete/imperial
- **Wall**: Dashed outline (foundation) → scaffolding grid (skeleton) → partial solid (construction) → full with glass fill (complete) → decorated (imperial)
- **Roof**: Blueprint lines only until construction phase; solid from complete onward
- **Base**: Excavation marks (foundation) → stepped outline (skeleton onward)
- **Arch**: Dotted arc (foundation) → wireframe (skeleton) → voussoir detail (complete+)

All strokes use `hsl(var(--gold))` or gold HSL values. Fills use `rgba(255,255,255,0.05-0.1)` frosted glass. Borders use `border-gold/20`.

### 3. Building Compositions — `src/components/gamification/monument-buildings.tsx`
Each of the 10 buildings gets phase-aware rendering. Instead of 50 separate components (10×5), each building function receives `phase` and conditionally renders:

- **Phase 1 (Temelji)**: Only the `Base` primitive + dashed outline of the building footprint
- **Phase 2 (Skele)**: Base + scaffolding lines + column bases (no capitals, no walls)
- **Phase 3 (Građenje)**: Columns rising, walls at 60% height, no roof, construction marks
- **Phase 4 (Kompletna)**: Full geometry — all walls, columns, roof, arches — but no decorative details
- **Phase 5 (Imperijalna)**: Full + tympanum reliefs, acroteria, inscription panels, statue placeholders

The `MonumentSVG` component signature stays the same (`buildingType`, `tier`) — `tier` now maps to construction phase internally.

### 4. Effects — `src/components/gamification/monument-effects.tsx`
Update effect triggers to match new phase system:
- **Foundation/Skeleton**: No effects (no torches, no fountain)
- **Construction**: Scaffolding overlay active (new: thin diagonal cross-bracing lines)
- **Complete**: Torches active (count based on phase)
- **Imperial**: Torches (4) + Fountain + Golden glow overlay (new: subtle radial gradient behind building)
- **Cracks**: Same trigger (leech ratio > 0.2), but rendered as crisp gold-tinted structural fault lines
- **Ivy**: Same trigger (stability < 10), rendered with `border-gold/30` tinted lines instead of green

### 5. MonumentCard — `src/components/gamification/MonumentCard.tsx`
- Update `TIER_ORDER` → `PHASE_ORDER`: `["foundation", "skeleton", "construction", "complete", "imperial"]`
- Update `PARTICLE_COLORS` to gold spectrum (all phases use gold variants)
- Update `SHIMMER_COLORS` to gold
- Update `MATERIAL_STYLES` → `PHASE_STYLES`:
  - All phases use gold-based border/glow/accent classes
  - `foundation`: `border-gold/10`, no glow
  - `imperial`: `border-gold/50`, `shadow-lg shadow-gold/20`
- References to `MATERIAL_LABELS`/`MATERIAL_ICONS` updated to new exports

### 6. Downstream Consumers
Files that reference `MaterialTier`, `MATERIAL_LABELS`, `MATERIAL_ICONS`:
- `MonumentInterior.tsx` — uses `MATERIAL_LABELS[monument.material]` → works via alias
- `ForumContext.tsx` — building type selector → labels unchanged
- `MonumentCard.tsx` — primary consumer, updated above

The type alias `MaterialTier = ConstructionPhase` ensures all existing imports compile without changes.

## Files Changed

| File | Scope |
|------|-------|
| `src/lib/forum-logic.ts` | New `ConstructionPhase` type, phase thresholds, Serbian labels |
| `src/components/gamification/monument-svg.tsx` | Full rewrite — blueprint line-art primitives |
| `src/components/gamification/monument-buildings.tsx` | Phase-aware rendering for all 10 buildings |
| `src/components/gamification/monument-effects.tsx` | Phase-synced effects, gold-tinted decay |
| `src/components/gamification/MonumentCard.tsx` | Phase-based styles, particles, shimmer |

## Guardrails
- `MaterialTier` kept as type alias — zero breaking changes downstream
- `Monument.material` field name unchanged
- `BuildingType` enum values unchanged
- viewBox stays `0 0 200 160`
- No FSRS changes
- All Phase 1-3 audit fixes preserved
- Serbian Latin for all labels

