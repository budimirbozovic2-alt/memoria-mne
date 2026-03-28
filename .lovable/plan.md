

# Phase 3: Domain UI Implementation (Step 1 + Step 2)

## Scope

Implement two major subsystems inside `CategoryView.tsx`:
1. **Unified Source Editor** (Izvori tab) — full metadata panel + content reader with scoped extraction
2. **Dual-Mode Cards Manager** (Kartice tab) — Mode A (View/Edit) + Mode B (Organization)

Parts 3 (Mnemonic Workshop) and 4 (Forum cleanup) are deferred to a follow-up step.

---

## Architecture

```text
CategoryView.tsx
├── Tab: "Kartice"
│   ├── ModeToggle (Switch: "Pregled" / "Organizacija")
│   ├── Mode A: CardListViewMode (read/edit card content, FSRS stats)
│   └── Mode B: CardTreeOrganizer (DnD subcategory → chapter → card)
├── Tab: "Izvori"
│   ├── Source list (existing) + "Dodaj izvor" button
│   └── SourceEditorFullscreen (new)
│       ├── Top: MetadataPanel (title, SL, date, isExclusive)
│       └── Bottom: Content reader + scoped extraction tools
└── Tab: "Mnemonička radionica" (placeholder — Phase 3b)
```

---

## Step 1: Unified Source Editor

### New file: `src/components/category/SourceEditor.tsx`

Full-screen overlay within the "Izvori" tab. Contains:

**Top Panel — Legal Metadata:**
- `title` — text input (full legal name)
- `slMarkings` — text input (SL gazette markings)
- `officialGazetteInfo` — auto-populated or editable
- `date` — date input
- `isExclusive` — Switch toggle with label "Ovo je isključivi/glavni izvor za ovu kategoriju"
- Save button persists to IDB via `saveSource()`

**Bottom Panel — Content + Extraction:**
- Reuse existing `SourceContent` component (memoized HTML renderer with heading navigation)
- Reuse existing outline sidebar
- Text selection popup with two actions:
  - **"Smart Split"** — calls `splitSelection()`, implicitly assigns `categoryId` from the current category scope (no dropdown)
  - **"Poveži sa postojećim"** — opens `LinkToExistingCardModal` filtered by `categoryId === currentCategoryId`
- Key difference from old `SourceReader`: category is always implicit from the URL param, never shown as a dropdown

**Data flow:**
- `useSourceLogic(source)` hook already exists and handles selection, smart split, link-to-existing
- The essay creation dialog (`handleCreateEssay`) currently uses `essayCategory` state with a dropdown — we remove the dropdown and hardcode `source.categoryId`
- `LinkToExistingCardModal` already filters by `sourceLabel` which maps to `categoryId` — we pass `source.categoryId` directly

### Changes to existing files:

1. **`src/hooks/useSourceLogic.ts`** — Remove `essayCategory` state and dropdown logic. Replace with `source.categoryId` hardcoded in `handleCreateEssay`. Remove the category `<select>` from the essay dialog render data.

2. **`src/views/CategoryView.tsx`** — Replace the simple source list in the "Izvori" tab with:
   - A source list with click-to-open behavior
   - An "Dodaj izvor" (import) button that handles DOCX upload, auto-assigns `categoryId`
   - When a source is selected, render `SourceEditor` as a full-width panel (replaces the list)

---

## Step 2: Dual-Mode Cards Manager

### New file: `src/components/category/CardViewMode.tsx` (Mode A)

Content-focused card list:
- Each card row shows: question text, type badge (Flash/Esej), FSRS stability indicator, tag badges
- Click to expand inline: shows sections, allows editing question/answer text
- **Locked fields**: subcategory and chapter are displayed as read-only badges (greyed out)
- **Tags**: toggle "Često na ispitu" etc. via existing `toggleTag`
- **Escape hatch**: "Premjesti u drugu Kategoriju" button opens a small modal with a category select dropdown → calls `patchCard(id, { categoryId: newCategoryId })`
- Uses existing `CardForm` component for editing (adapted to hide structural fields)

### New file: `src/components/category/CardOrgMode.tsx` (Mode B)

Structural tree view (no DnD library in Phase 3 Step 2 — use simple move-up/move-down buttons first, DnD can be added later):
- Tree structure: Subcategory headers → Chapter headers → Card tiles
- Each card tile shows only: question snippet + position number
- Move buttons: ↑↓ to reorder within chapter, dropdown to move between subcategories/chapters
- "Dodaj podkategoriju" and "Dodaj glavu" inline creation
- Content editing is disabled — card text is not shown/editable
- All mutations update `card.subcategory`, `card.chapter`, `card.chapterOrder`, `card.sortOrder` via `patchCard`

### Changes to `src/views/CategoryView.tsx`:

The "Kartice" tab gets:
- A `Switch` or segmented toggle at the top right: **"Pregled"** (Mode A) / **"Organizacija"** (Mode B)
- Conditionally renders `CardViewMode` or `CardOrgMode`
- Both receive `cards` and `categoryId` as props

---

## File Plan

| File | Action |
|---|---|
| `src/components/category/SourceEditor.tsx` | **CREATE** — metadata panel + content reader |
| `src/components/category/CardViewMode.tsx` | **CREATE** — Mode A read/edit |
| `src/components/category/CardOrgMode.tsx` | **CREATE** — Mode B organization |
| `src/views/CategoryView.tsx` | **REWRITE** — integrate all three components |
| `src/hooks/useSourceLogic.ts` | **EDIT** — remove category dropdown, hardcode `source.categoryId` |
| `src/components/SourceReader.tsx` | No changes — reused via SourceEditor |

## What This Does NOT Touch
- Mnemonic Workshop deep implementation (Phase 3b)
- Forum DnD stripping (Phase 3b)
- No new npm dependencies (no dnd-kit yet — using simple buttons for reordering)

