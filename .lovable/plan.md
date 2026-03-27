

# Architectural Vector Overhaul — Sophisticated 2D

## Overview
Replace the current primitive SVG buildings (flat rectangles, basic ellipses, uniform strokes) with sophisticated, premium 2D vector illustrations. Redesign the color system to use sleek gradients (gold-to-brass, frosted-glass), varied stroke weights, and negative space. Also: localize the last Latin string, and remove "Laboratorija" mega-menu from TopNav.

## Scope

### 1. `src/components/gamification/monument-svg.tsx` — Premium Primitives (Full Rewrite)

**Color palette overhaul** — each tier gets a `linearGradient` definition (defined inline via `<defs>`) instead of flat fills:
- `wood`: warm walnut gradient (dark-to-medium brown), thin 0.3px strokes
- `brick`: terracotta-to-sienna gradient, subtle mortar texture via 0.15px lines
- `stone`: cool grey gradient with a frosted-glass inner glow
- `marble`: pearlescent white-to-ice-blue gradient, faint veining paths
- `gold`: rich gold-to-brass gradient with a subtle specular highlight

**Column** — redesigned with:
- Entasis (subtle belly curve via `path` instead of `rect`)
- Proper capital proportions: Tuscan (wood), Doric (brick/stone), Ionic (marble), Corinthian (gold)
- Fluting drawn as 3–5 subtle parallel curves (not straight lines)
- Varied stroke weights: 0.3px for fluting detail, 0.6px for outline, 0.8px for capital

**TriangularRoof** — pediment with:
- Slight overhang (cornice extends 3–4px beyond columns)
- Tympanum gets an abstract relief circle/wreath for marble+gold tiers
- Acroteria as clean geometric finials (not crude triangles)

**DomeRoof** — smooth cubic bezier dome with:
- Ribbing lines (3 meridian curves) for stone+ tiers
- Lantern finial for gold tier

**Base** — stepped stylobate with:
- Slight perspective trapezoid for each step (not flat rectangles)
- Subtle drop shadow via a faded grey ellipse below

**Arch** — proper voussoir arch:
- Keystone accent block at crown
- Imposts (small rectangles at spring points)
- Inner shadow gradient for depth

**Wall** — refined with:
- Inner margin/molding line for marble+gold
- Ashlar block pattern for stone (offset rectangles with 0.15px gaps)
- Opus reticulatum hint for brick (diagonal grid)

### 2. `src/components/gamification/monument-buildings.tsx` — Refined Compositions (Full Rewrite)

Each building recomposed with better proportions, more negative space, and architectural accuracy:

- **Templum**: 6 columns with proper intercolumniation, deep pronaos (porch), wide stylobate with 5 steps
- **Basilica**: Elongated nave with clerestory windows, apse semicircle, colonnade along sides
- **Amphitheatrum**: 3 tiers with diminishing arch sizes, proper elliptical plan, cornice bands between tiers
- **Tabularium**: Rusticated ground floor, arcaded upper gallery, heavy entablature
- **Curia**: Tall austere facade, single grand portal, minimal decoration (emphasizes authority)
- **Macellum**: Circular tholos with ring of columns, low enclosure wall
- **Arcus**: Triple-bay triumphal arch with attic inscription panel, engaged columns
- **Rostra**: Low platform with rostral prows, balustrade
- **Argentaria**: Portico with deep colonnade, strong horizontal cornice
- **Insula**: Multi-story with regular window grid, arched ground-floor entrance

### 3. `src/components/gamification/monument-effects.tsx` — Refined Effects

- **CrackOverlay**: Thinner, more organic crack paths with slight randomization
- **IvyOverlay**: Bezier curves for vines, smaller leaf clusters
- **TorchOverlay**: Softer radial gradient glow, smaller flame
- **Remove ScaffoldingOverlay** — visually clashes with premium aesthetic; replace with a subtle "under construction" opacity reduction on the building itself
- **FountainOverlay**: Cleaner basin shape, subtler animation

### 4. `src/components/gamification/MonumentInterior.tsx` — Last Latin String

- Line 160: `"Nulla structura in hoc monumento."` → `"Nema strukture u ovom monumentu."`

### 5. `src/components/TopNav.tsx` — Remove Laboratorija

- Remove the `LAB_ANALYTICS` and `LAB_TOOLS` arrays and the entire "Laboratorija" mega-menu trigger/dropdown
- Move essential tools (Statistika, Mentalne mape) to a simple "Alati" dropdown or keep only in Database/Forum paths
- Keep `/stats`, `/mind-map`, etc. routes alive in App.tsx for deep links

## Files Changed

| File | Change |
|------|--------|
| `src/components/gamification/monument-svg.tsx` | Full rewrite: gradient defs, entasis columns, voussoir arches, refined walls/roofs/bases |
| `src/components/gamification/monument-buildings.tsx` | Full rewrite: all 10 buildings with premium compositions |
| `src/components/gamification/monument-effects.tsx` | Refined crack/ivy/torch effects, remove scaffolding |
| `src/components/gamification/MonumentInterior.tsx` | Localize last Latin string |
| `src/components/TopNav.tsx` | Remove Laboratorija mega-menu, simplify nav |

## Guardrails
- No FSRS math changes
- `BuildingType` and `MaterialTier` enums unchanged
- `MonumentSVG` component signature unchanged (drop-in replacement)
- `TIER_FILLS` export kept for backward compatibility (used by effects)
- viewBox stays `0 0 200 160`
- No new dependencies

## Implementation Approach
This is a large visual rewrite (two full file rewrites). Will be done in 2 batches:
- **Batch 1**: `monument-svg.tsx` (primitives) + `monument-effects.tsx` (effects) + `MonumentInterior.tsx` (string fix)
- **Batch 2**: `monument-buildings.tsx` (compositions) + `TopNav.tsx` (nav cleanup)

