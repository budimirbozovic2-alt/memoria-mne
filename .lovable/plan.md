

# Fix Build Errors + Add Source Reader Width Control

## Part 1: Fix Build Errors (stale/cached)

The 7 files all have correct barrel imports now. The errors are from a stale TypeScript cache. A simple rebuild will clear them — no code changes needed for the errors themselves.

## Part 2: Source Reader Width Selector

### Design
Add a width toggle to `SourceToolbar` (same row as existing controls). Use 5 options: S, M, L, XL, Full. State lives in `SourceReader.tsx`, persisted to `localStorage` key `codex-source-reader-width`, default `M`.

### Width mapping
| Label | Class | Approx width |
|-------|-------|-------------|
| S | `max-w-2xl` | 672px |
| M | `max-w-4xl` | 896px |
| L | `max-w-6xl` | 1152px |
| XL | `max-w-7xl` | 1280px |
| Full | `max-w-none` | 100% |

### File changes

**`src/components/SourceReader.tsx`**
- Add `ReaderWidth` type and width class map
- Add `readerWidth` state initialized from `localStorage`, default `"M"`
- `useEffect` to persist changes to localStorage
- Wrap the content `<div className="flex-1 min-w-0 relative">` in a constraining div with `mx-auto px-6` + the dynamic `max-w-*` class
- Pass `readerWidth` + `setReaderWidth` to `SourceToolbar`

**`src/components/source-reader/SourceToolbar.tsx`**
- Add `readerWidth` and `setReaderWidth` to Props
- Add a small button group (5 buttons, S/M/L/XL/Full) between the view-mode toggle and the Pitanja button
- Active button gets `bg-background shadow-sm` styling (same pattern as the Čitanje/Pokrivenost toggle)

### No other files changed
- No changes to auto-split, source loading, FSRS, or DnD-kit
- Standard barrel imports only

