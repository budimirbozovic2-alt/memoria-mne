

# Forum Gateway: Persistent Entry Points

## Overview
Add two persistent entry points for the Forum once unlocked: a gateway card on the Dashboard and a subtle golden icon in the TopNav.

## Changes

### 1. `src/components/Dashboard.tsx`
- Import `useForumContext`, `Link` from react-router-dom, `Landmark` from lucide-react
- After the `StatusIconsRow` block (end of the component), add a conditional gateway card:
  - Renders only when `unlocked === true`
  - Uses `glass-card` class + `border border-gold/30`
  - `Link to="/forum"` wrapping the card content
  - Golden `Landmark` icon (Roman column)
  - "ENTER THE FORVM" text in Cinzel font (`font-display`) with `text-gold`
  - Subtle `motion.div` fade-in animation

### 2. `src/components/TopNav.tsx`
- Import `Landmark` from lucide-react, already has `useForumContext`
- Read `unlocked` from `useForumContext()` (currently only destructures `enterForum`)
- **Desktop** (line ~223, the right-side icon group): Before the mapping flash badge, add a conditional `Link` to `/forum` with a golden `Landmark` icon (`text-gold h-4 w-4`), tooltip "Forum Iustitiae", only visible when `unlocked`
- **Mobile** (line ~269, mobile menu): Add a Forum link at the bottom of the mobile nav, also conditional on `unlocked`, with gold styling

### Files Changed
| File | Change |
|------|--------|
| `src/components/Dashboard.tsx` | Add Forum gateway card (conditional on `unlocked`) |
| `src/components/TopNav.tsx` | Add golden Landmark icon shortcut (conditional on `unlocked`) |

### Guardrails
- Standard barrel imports for icons
- No FSRS, DB, or layout changes
- Gold accents + Cinzel font consistent with unified design

