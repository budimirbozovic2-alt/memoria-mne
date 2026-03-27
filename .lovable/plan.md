

# Material Transition Animation for MonumentCard

## Overview
Track each monument's previous material tier and, when it changes (e.g., wood → stone → marble), play a shimmer + particle burst animation on the card. Uses `useRef` to remember prior material and `AnimatePresence` for the overlay effect.

## Approach

### 1. `src/components/gamification/MonumentCard.tsx`
- Add a `useRef<MaterialTier>` to track previous material
- On render, compare `monument.material` with `prevMaterialRef.current`
- When material upgrades (tier index increases), set a local `upgraded` state to `true` for ~2 seconds
- When `upgraded` is true, render two overlay layers inside the card:
  - **Shimmer sweep**: A full-width gradient div that translates left-to-right once using framer-motion (`x: ["-100%", "100%"]`), with the new material's accent color. Duration ~1s.
  - **Particle burst**: 8-12 small circular `motion.div` elements that scatter outward from center with random angles, fade out, and scale down. Gold particles for gold tier, white/silver for marble, grey for stone, etc. Duration ~1.2s.
- After animation completes (~2s), reset `upgraded` to false
- Update `prevMaterialRef` to current material after comparison

### 2. Tier ordering for comparison
Define a simple array: `["wood", "brick", "stone", "marble", "gold"]` — compare indices to detect upgrade vs. downgrade. Only trigger animation on upgrade.

### 3. Particle implementation
- No external library needed — just 8-12 `motion.div` elements with randomized:
  - `x` and `y` endpoints (spread 40-80px from center)
  - `opacity: [1, 0]`
  - `scale: [1, 0]`
  - `duration: 0.8-1.2s` with staggered delays
- Each particle is a 4px rounded-full div colored per material tier

### 4. No new CSS needed
The existing `shimmer` keyframe in tailwind.config.ts won't be used directly — framer-motion handles the sweep animation inline for better control over timing and color.

## Files Changed
| File | Change |
|------|--------|
| `src/components/gamification/MonumentCard.tsx` | Add material transition detection + shimmer/particle overlay |

## Guardrails
- No FSRS, DB, or layout changes
- No new dependencies
- Standard barrel imports
- Animation is purely visual, no state persistence

