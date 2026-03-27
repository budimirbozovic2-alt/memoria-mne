

# Fix: Exclude Headings and Titles from Auto-Split Card Body

## Problem
Both split engines correctly identify headings and titles for metadata, but during **content collection** they include those same lines in the card body text. The filters only apply to article boundary detection, not to content gathering.

## Root Cause (2 files)

### `auto-split-engine.ts` (lines 138-143)
Content loop collects every non-empty line between `i+1` and `nextBoundary`. It does NOT check if a line is a heading element (H1/H2/H3). Structural headings that appear between two "Član" markers get dumped into `contentParts`/`plainParts`.

### `selection-split-engine.ts` (lines 115-118)
Same issue: content loop collects all non-empty lines without checking if they match `HEADING_LINE_REGEX` or are the detected title.

## Fix

### File 1: `src/lib/auto-split-engine.ts`

**Add an `isHeading` flag to the `Line` interface** and set it during parsing (line 65 already computes this). Then in the content collection loop (line 138-143), skip lines where `isHeading` is true.

Changes:
1. Extend `Line` interface to include `isHeading: boolean` (add field)
2. Store `isHeading` when building the lines array (line 67-72) — already computed, just needs to be stored
3. In content loop (line 138-139), add condition: `if (lines[j].text && !lines[j].isHeading)`
4. Same filter applied to the title-exclusion `contentLinesBetween` scan (lines 121-124) so title-counting logic is also correct

### File 2: `src/lib/selection-split-engine.ts`

The selection engine works with plain text lines (no DOM). It already has `HEADING_LINE_REGEX` for boundary detection but doesn't filter content.

Changes:
1. In content collection loop (lines 115-118), add: skip lines matching `HEADING_LINE_REGEX`
2. Also skip the line that was identified as the title (index `lineIndex - 1` when title was found) — this is already naturally excluded since content starts at `lineIndex + 1`, but needs verification for edge cases

## What stays untouched
- Title detection logic (backward scan) — unchanged
- `essayName` / `formattedTitle` metadata — still uses detected title
- `plainSnippet` format — still includes `Član X` prefix
- FSRS/SM-2 logic — not involved
- `heading-promotion.ts` — not modified

## Execution
Two file edits in a single response — both are small, surgical changes (adding 1-2 filter conditions each).

