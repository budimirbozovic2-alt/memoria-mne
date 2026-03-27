

# Imperial Standardization — Phase 1: Global CSS, Typography, Scrollbars & Dashboard

This is the first of 3 phases. Phase 1 establishes the visual foundation that all subsequent phases build on.

## Scope (Phase 1)

| Area | What changes |
|------|-------------|
| **1. Global CSS & Typography** | Cinzel for page headers, gold accent standardization, glass-card base class, shimmer button hover, gold-tinted scrollbars |
| **2. Dashboard Alignment** | Glass-card widgets, subtle golden radial glow, Forum gateway with layoutId |
| **3. Dialog & ScrollArea Kit** | Backdrop-blur + glassmorphic paneling for all dialogs, gold scrollbar thumbs |

Phase 2 (next): Sidebar evolution + Nav decommissioning + Source Manager rebranding
Phase 3 (after): Study interface mastery sync + achievement glow

---

## Technical Details

### 1. Global CSS (`src/index.css`)

**New utility classes** (appended after `forum-tablet`):

- `.glass-card` — `bg-card/60`, `backdrop-blur(12px)`, `border border-border/40`, `shadow-sm`. Replaces plain `bg-card border` across Dashboard widgets.
- `.gold-shimmer` — `@keyframes shimmer` that sweeps a subtle `hsl(var(--gold)/0.08)` highlight left-to-right on hover. Applied to primary buttons via `.btn-imperial`.
- `.btn-imperial` — extends default button with `border-color: hsl(var(--gold)/0.3)`, applies `gold-shimmer` on hover.

**Scrollbar override** (global):
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: hsl(var(--gold) / 0.25); border-radius: 3px; }
::-webkit-scrollbar-track { background: transparent; }
```
Also style the Radix ScrollArea thumb in `scroll-area.tsx` with `bg-[hsl(var(--gold)/0.25)]`.

**Typography rule**:
```css
h1, h2, .font-display { font-family: var(--font-display); }
```
This leverages the existing `--font-display: 'Cinzel'` variable. All `<h1>` tags across the app automatically get Cinzel. Body text stays DM Sans (already set).

### 2. Dashboard (`src/components/Dashboard.tsx` + sub-components)

- Replace `rounded-xl bg-card border` with `glass-card` on all widget containers (ExamProgressBar, CoreStats cards, DailyBriefing, IdealFocus, VelocityWidget, StatusIconsRow).
- Add a subtle golden radial glow behind the first widget area: a `div` with `background: radial-gradient(ellipse at 50% 0%, hsl(var(--gold)/0.06) 0%, transparent 70%)` as an absolute positioned layer.
- **Forum gateway** (`Dashboard.tsx` line ~112): Add `layoutId="forum-gateway"` to the "Enter Forum" Link card. In `RomanForumPage.tsx`, add a matching `layoutId="forum-gateway"` on the forum header wrapper so navigating Dashboard → Forum triggers a smooth morph.

### 3. CoreStats (`src/components/dashboard/CoreStats.tsx`)

- Replace `rounded-xl bg-card border` with `glass-card` class on both stat cards.

### 4. ScrollArea (`src/components/ui/scroll-area.tsx`)

- Change ScrollAreaThumb className from `bg-border` to `bg-[hsl(var(--gold)/0.25)]`.

### 5. Dialog (`src/components/ui/dialog.tsx`)

- Add `backdrop-blur-md` to `DialogOverlay` (likely already has it, verify and ensure).
- Add `glass-card` styling to `DialogContent`: replace `bg-background` with `bg-card/80 backdrop-blur-xl border-border/40`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `glass-card`, `btn-imperial`, `gold-shimmer` keyframes, scrollbar override, `h1/h2` font rule |
| `src/components/ui/scroll-area.tsx` | Gold-tinted thumb |
| `src/components/ui/dialog.tsx` | Glassmorphic content + blur overlay |
| `src/components/Dashboard.tsx` | `glass-card` on widget wrappers, golden radial glow, layoutId on Forum card |
| `src/components/dashboard/CoreStats.tsx` | `glass-card` class |
| `src/components/dashboard/DailyBriefing.tsx` | `glass-card` class |
| `src/components/dashboard/IdealFocus.tsx` | `glass-card` class |
| `src/components/dashboard/VelocityWidget.tsx` | `glass-card` class |
| `src/components/dashboard/StatusIconsRow.tsx` | `glass-card` class |
| `src/components/dashboard/ExamProgressBar.tsx` | `glass-card` class |
| `src/views/RomanForumPage.tsx` | Add matching `layoutId="forum-gateway"` |

## Guardrails
- No FSRS math changes
- No navigation structure changes (that's Phase 2)
- No study interface changes (that's Phase 3)
- Existing themes (Amber, Steel, Forest, etc.) preserved — gold scrollbars use `--gold` which is theme-aware
- No new dependencies

