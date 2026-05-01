# Dashboard layout refactor — lock action buttons, surface warnings, contain dynamic widgets

## File being modified

**`src/components/Dashboard.tsx`** is the actual layout authority. `DashboardPage.tsx` only wires data; the broken layout (warnings at the bottom, planner data pushing buttons off-screen, mismatched card heights) lives in `Dashboard.tsx`. No other dashboard file needs structural changes.

`StatusIconsRow.tsx` (warnings strip) and `ToolCards.tsx` (Strateški planer + Statistika buttons) are reused as-is — only their **placement** in the parent layout changes.

## Important scoping note

The user mentioned a "Diagnostics" button on this dashboard. Per the project's **Domain-Scoping** core rule, Diagnostics is intentionally per-subject only (`/subject/:id/diagnostics`) — there is no global `/diagnostics` route, and adding one would violate the architecture. Diagnostics already lives on `SubjectDashboard.tsx` exactly where it belongs. On this **global** dashboard, the locked action set therefore stays as **Strateški planer + Statistika** (the two existing `ToolCards`).

## New layout structure

```text
┌─ Header (Početna tabla) ─────────────────────────────────────────┐
├─ ⚠ StatusIconsRow  (warnings — MOVED from bottom to top) ────────┤
├─ ExamProgressBar (full-width when shown) ────────────────────────┤
│                                                                   │
│ ┌─────── lg:grid-cols-3, items-start ────────────────────────┐   │
│ │  LEFT (col-span-2)                  │ RIGHT (col-span-1)   │   │
│ │  ───────────────────────────────    │ ──────────────────── │   │
│ │  • CoreStats                        │ ┌─ STICKY ─────────┐ │   │
│ │  • Phase progress (planner)         │ │ Akcije           │ │   │
│ │    [bounded: max-h-72 overflow-y]   │ │ ───────────────  │ │   │
│ │  • StudyFlowWidget                  │ │ QuickActions     │ │   │
│ │  • DailyBriefing                    │ │ ToolCards (2x1)  │ │   │
│ │  • IdealFocus                       │ │ — Strateški pl.  │ │   │
│ │  • VelocityWidget                   │ │ — Statistika     │ │   │
│ │  • ActivityHeatmap                  │ │ (sticky top-4)   │ │   │
│ │                                     │ └──────────────────┘ │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## How each rule is satisfied

### 1. Warnings prioritised at the top

`<StatusIconsRow>` is moved out of its current bottom position (line 136–138) and rendered immediately after the `<h2>` header, before `<ExamProgressBar>`. Its container becomes `w-full` with a slight panel treatment (border, padded glass-card-style row) so it reads as a true alert strip rather than a footer afterthought. Animation slide direction flipped from `slide-in-from-bottom-2` → `slide-in-from-top-2` to match the new position (one-line change inside `StatusIconsRow.tsx` — minimal edit, no API change).

### 2. Immutable action area (sticky right rail)

The current `lg:grid-cols-2` is replaced with `lg:grid-cols-3 items-start`:

- **Left** = `lg:col-span-2` — all analytics + dynamic widgets.
- **Right** = `lg:col-span-1` — a `<aside class="lg:sticky lg:top-4 self-start space-y-4">` wrapper around `<QuickActions>` + `<ToolCards>`.

`items-start` on the grid + `self-start` on the aside guarantees the right column never stretches to match the (potentially huge) left column. `lg:sticky lg:top-4` keeps the action buttons pinned in the viewport while the user scrolls the analytics. On `< lg` (mobile/narrow) the sticky disengages and the actions fall under the analytics in a single column — acceptable since the overflow problem only manifests on desktop layouts.

`ToolCards` keeps its internal `grid-cols-2` so Strateški planer and Statistika sit as two equal squares inside the rail.

### 3. Bounded planner widget — no more push-off

The "Progres faze" panel (currently lines 65–91) is the culprit that grows unpredictably with planner data. It gets:

- A fixed structural shell: `glass-card p-5 flex flex-col`.
- Inner ring container wrapped in `<div class="max-h-72 overflow-y-auto pr-1">` so a long redistributed-quota note or future planner additions scroll **inside** the card instead of expanding it.
- The redistribution warning line keeps its in-card placement but no longer dictates card height.

### 4. Equal-height visual consistency

The 2-column grid becomes `items-start` (no forced equal heights — required for the sticky rail to work). Within each column, every widget already uses `glass-card` with consistent padding; we add `h-full` to the planner phase card and `flex flex-col` so its inner content aligns predictably regardless of payload. `ToolCards` cards inside the rail get `h-full` so the two squares remain equal even if one description wraps.

## Code change summary (file-by-file)

**`src/components/Dashboard.tsx`** — full rewrite of the JSX return block (logic / hooks unchanged):

1. Remove `<StatusIconsRow>` from line 136 and move it to between the `<h2>` and `<ExamProgressBar>`.
2. Change outer grid from `grid-cols-1 lg:grid-cols-2 gap-6` → `grid-cols-1 lg:grid-cols-3 gap-6 items-start`.
3. Wrap analytics column in `lg:col-span-2 space-y-6`.
4. Move `<QuickActions>` and `<ToolCards>` out of the left column into a new `<aside class="lg:col-span-1 lg:sticky lg:top-4 self-start space-y-4">`.
5. Wrap the inner ring/redist content of the "Progres faze" card in a `max-h-72 overflow-y-auto pr-1` div, and add `h-full flex flex-col` to the card itself.

**`src/components/dashboard/StatusIconsRow.tsx`** — one-line cosmetic update:

- Change wrapper class from `flex items-center gap-2 flex-wrap` (with `slide-in-from-bottom-2`) → `flex items-center gap-2 flex-wrap rounded-lg border border-border/60 bg-card/60 px-3 py-2 w-full` and `slide-in-from-top-2`. Now reads as a top alert bar.

**`src/components/dashboard/ToolCards.tsx`** — one-line update:

- Change root `grid grid-cols-2 gap-3` → `grid grid-cols-2 gap-3` (kept) and add `h-full` to each `<Link>` so the two action cards in the sticky rail remain equal-height.

**`src/components/dashboard/QuickActions.tsx`** — unchanged.

No new components, no route changes, no behavioural changes to data hooks, no dependency on the per-subject `Diagnostics` module (which correctly stays scoped to `SubjectDashboard`).

## Acceptance check (visual, after build)

- At `lg+` viewport, scrolling the analytics column does not move "Strateški planer" / "Statistika" buttons — they stay pinned `top-4` from the viewport top.
- Warnings strip is visible the moment the page loads, above all widgets.
- Activating a long Strategic Planner phase no longer changes the height of any other card; the planner panel itself caps at `max-h-72` and scrolls internally.
- Below `lg` breakpoint, layout collapses to a single column with warnings → analytics → actions, all natural-flow (sticky disabled).
