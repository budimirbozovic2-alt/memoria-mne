

# Clickable MonumentCards with Category Detail Panel

## Overview
Make each MonumentCard clickable to open a Dialog showing all cards in that category with their FSRS status (state, stability, next review, leech flag).

## Changes

### 1. `src/components/gamification/MonumentCard.tsx`
- Add `onClick` prop to the component interface
- Add `cursor-pointer` to the motion.div and call `onClick` on click

### 2. `src/components/gamification/MonumentDetailDialog.tsx` (NEW)
- A Dialog component that receives `category: string`, `open: boolean`, `onClose: () => void`
- Imports `useCardContext` to get all cards, filters by `card.category === category`
- Renders a scrollable list of cards showing:
  - Card question (truncated)
  - Per-section FSRS state badge (New / Learning / Review / Relearning) with color coding
  - Stability value (days)
  - Next review date (relative: "za 3 dana" / "kasni 2 dana")
  - Leech warning icon if `lapses >= 5`
  - Mastery indicator (all sections in Review = gold checkmark)
- Header shows monument material icon + category name + overall stats
- Uses glass-card styling, gold accents for mastered items
- Sorted: leeches first, then by next review date (most urgent first)

### 3. `src/views/RomanForumPage.tsx`
- Add state: `selectedCategory: string | null`
- Pass `onClick={() => setSelectedCategory(monument.category)}` to each MonumentCard
- Render `MonumentDetailDialog` with `open={!!selectedCategory}` and `onClose={() => setSelectedCategory(null)}`

### State Badge Colors
| State | Label | Color |
|-------|-------|-------|
| New | Novus | `bg-muted text-muted-foreground` |
| Learning | Discens | `bg-blue-500/20 text-blue-500` |
| Review | Peritus | `bg-green-500/20 text-green-500` |
| Relearning | Rediscens | `bg-orange-500/20 text-orange-500` |

### Files Changed
| File | Change |
|------|--------|
| `src/components/gamification/MonumentCard.tsx` | Add onClick prop |
| `src/components/gamification/MonumentDetailDialog.tsx` | New: detail dialog component |
| `src/views/RomanForumPage.tsx` | Add selectedCategory state, wire onClick + dialog |

### Guardrails
- No FSRS math changes
- Standard barrel imports
- Uses existing Dialog, Badge, ScrollArea components

