

# Point 1: Extract DraggableCardTile + ChapterBox

## New files

### `src/components/mental-skeleton/DraggableCardTile.tsx`
- Extract lines 61-124 from `MentalSkeleton.tsx`
- Wrap with `React.memo` with custom comparator (`card.id`, `mode`, `card.sections`)
- Export `Mode` type and `UNASSIGNED_CHAPTER` constant from a shared types location (or re-export from this file)
- Deep imports for lucide-react: `import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical'`
- Imports: `useDraggable` from `@dnd-kit/core`, `Tooltip/TooltipTrigger/TooltipContent`, `getCardMasteryLevel/getMasteryColor/MASTERY_LEVELS` from `KnowledgeMap`

### `src/components/mental-skeleton/ChapterBox.tsx`
- Extract lines 127-272 from `MentalSkeleton.tsx`
- Wrap with `React.memo`
- Deep imports for lucide-react:
  - `import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'`
  - `import BookOpen from 'lucide-react/dist/esm/icons/book-open'`
  - `import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up'`
  - `import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down'`
  - `import Edit3 from 'lucide-react/dist/esm/icons/edit-3'`
  - `import Trash2 from 'lucide-react/dist/esm/icons/trash-2'`
- Imports `DraggableCardTile` from sibling file, `useDroppable` from `@dnd-kit/core`, `Collapsible` components, `Tooltip` components
- Imports `Card`, `SectionState` from spaced-repetition, mastery helpers from `KnowledgeMap`

### `src/components/mental-skeleton/types.ts`
- Shared `Mode` type and `UNASSIGNED_CHAPTER` constant used by both extracted components and the parent

## Changes to `MentalSkeleton.tsx`
- Remove lines 60-273 (DraggableCardTile + ChapterBox definitions)
- Add imports for `DraggableCardTile`, `ChapterBox`, `Mode`, `UNASSIGNED_CHAPTER` from `./mental-skeleton/`
- Remove `GripVertical`, `ChevronDown`, `BookOpen`, `ArrowUp`, `ArrowDown`, `Edit3`, `Trash2` from the lucide barrel import (line 26) — keep only icons still used in the main component body (lines 478+)
- Remove `useDroppable`, `useDraggable` from dnd-kit import if no longer used in main body (need to verify — `useDraggable` is only in DraggableCardTile, but `useDroppable` may be used elsewhere)

## Guardrails
- `restrictToWindowEdges`, `dropAnimation={null}`, `pointer-events-none` — untouched (those are in main component body)
- No FSRS/SM-2 logic modified
- All lucide icons in new files use deep imports
- `useMemo` on `sortedCards` and `levelCounts` preserved exactly as-is inside ChapterBox

