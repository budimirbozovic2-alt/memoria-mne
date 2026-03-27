

# The Polishing Act — Performance & Visual Refinement

## 1. Performance: Pre-compute avgStability in useSourceHierarchy

**Problem**: `MonumentInterior` line 158 does `catCards.filter(...)` per node in Mode B render loop — O(n*m). Mode A calls `computeAvgStability(child.cards)` which iterates sections per render.

**Fix in `src/hooks/useSourceHierarchy.ts`**:
- Add `avgStability` field to both `HierarchyNode` and `HierarchyLeaf` interfaces
- Compute it inside the `useMemo` during tree construction (single pass)
- New helper: `computeAvgStability(cards)` that averages section stability

**Fix in `src/components/gamification/MonumentInterior.tsx`**:
- Remove the standalone `computeAvgStability` function
- Pass `node.avgStability` and `child.avgStability` directly to `ArchNode` props
- Remove the O(n^2) `catCards.filter(...)` call on line 158

## 2. SVG ID Sanitization

**Add `slugify` helper** in `src/components/gamification/monument-effects.tsx`:
```ts
function slugify(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
}
```

- Use in `TorchOverlay`: `id={`torch-glow-${slugify(id)}`}`
- Use in `MonumentEffects`: pass `slugify(monument.category)` to TorchOverlay

## 3. Visual Refinement — "Modern Stele" ArchNode

**Update `src/components/gamification/ArchNode.tsx`**:
- Add subtle `inset` shadow to make text feel engraved: `shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.08)]`
- Add a 12px decorative SVG column line on the left edge using `hsl(var(--gold)/0.3)`
- Replace flat background with glassmorphic gradient: `linear-gradient(to bottom right, hsl(var(--card)/0.5), hsl(var(--card)/0.3))`
- Gold tier gets a subtle gold-tinted gradient instead

**Update `src/components/gamification/ForumAtmosphere.tsx`**:
- Add `backdrop-filter: blur(2px)` to the sky gradient layer for premium color blending

**Update `src/index.css`**:
- Enhance `forum-tablet` with `box-shadow: inset 0 1px 2px hsl(0 0% 0% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.04)`

## 4. Zombie Removal

**Delete** `src/components/gamification/MonumentDetailDialog.tsx`

**Verify** no imports remain — search confirms it's only self-referencing (no imports in RomanForumPage or elsewhere).

## 5. Reverse Transition

**Current state**: `MonumentInterior` has `layoutId={`monument-${monument.category}`}` matching `MonumentCard`. The `AnimatePresence` in `RomanForumPage` wraps both. Clicking back sets `selectedCategory = null`, which should trigger the reverse layout animation.

**Fix**: Add `exit` props on the forum grid's `motion.div` wrapper (currently just a plain `<div key="forum-grid">`). Change it to `motion.div` with `initial/animate/exit` opacity so `AnimatePresence` can orchestrate the crossfade properly during the reverse `layoutId` morph.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSourceHierarchy.ts` | Add `avgStability` to interfaces, pre-compute in useMemo |
| `src/components/gamification/MonumentInterior.tsx` | Remove `computeAvgStability`, use pre-computed props, remove O(n^2) filter |
| `src/components/gamification/monument-effects.tsx` | Add `slugify`, sanitize gradient IDs |
| `src/components/gamification/ArchNode.tsx` | Engraved inset shadow, gold column accent, glassmorphic gradient |
| `src/components/gamification/ForumAtmosphere.tsx` | Add subtle backdrop-blur to sky layer |
| `src/index.css` | Enhanced `forum-tablet` inset shadow |
| `src/views/RomanForumPage.tsx` | Wrap forum grid in `motion.div` for reverse transition |
| `src/components/gamification/MonumentDetailDialog.tsx` | **DELETE** |

## Guardrails
- No FSRS math changes
- No new dependencies
- Source registry logic untouched
- All existing functionality preserved

