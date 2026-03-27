

# Source Breakdown in MonumentDetailDialog

## Overview
Add a collapsible "source mastery breakdown" section in the MonumentDetailDialog header area, showing per-Master-Source mastery bars when `monument.sources` data exists.

## Changes

### `src/components/gamification/MonumentDetailDialog.tsx`
- After the DialogTitle and before the ScrollArea, add a source breakdown section
- Only renders when `monument.sources` exists and has more than 1 entry (no point showing breakdown for a single source)
- Each source row shows: Master Source name, card count badge, mastery percentage, and a thin progress bar colored by mastery tier (gold ≥95, green ≥60, amber ≥30, red <30)
- Sorted by mastery descending
- Styled with `text-xs`, compact layout, separated by a subtle `border-b`
- Uses existing `Progress` component with inline color override

### No other files changed
- `Monument.sources` is already populated by `calculateForumState` in `forum-logic.ts`
- No new dependencies

