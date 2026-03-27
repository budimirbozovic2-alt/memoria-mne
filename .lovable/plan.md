

# Fix: DnD-Kit Offset in Centered Layout

## Problem
The `DndContext` + `DragOverlay` inside a `max-w-6xl mx-auto` container causes coordinate mismatch. The `DragOverlay` renders inside the offset container, so the drag ghost appears shifted from the cursor.

## Fix (2 changes in `MentalSkeleton.tsx`)

### 1. DragOverlay via Portal
Wrap the `DragOverlay` content in `createPortal(..., document.body)` so it renders at the document root, escaping the centered container's offset.

### 2. Add `dropAnimation={null}` to DragOverlay
Prevents the snap-back animation which also suffers from the offset calculation.

### Files modified
- **`src/components/MentalSkeleton.tsx`** only
  - Add `import { createPortal } from "react-dom"` at top
  - Replace lines 333-339: wrap existing `DragOverlay` in `createPortal`
  - Add `dropAnimation={null}` prop to `DragOverlay`

### What stays untouched
- `MainLayout.tsx` — no changes to `max-w-6xl mx-auto`
- `DraggableCardTile.tsx` — no changes
- `ChapterBox.tsx` — no changes (useDroppable stays as-is)
- No FSRS/SM-2 logic touched

