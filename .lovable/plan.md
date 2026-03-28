

# Phase 5: Feature Restoration & UX Split (Revised)

## Overview

4 tasks: Split Reader/Editor in Izvori tab, restore global Mnemonic Pipeline, Settings overhaul, and filter/CRUD refinements in Kartice tab.

---

## Task 1: Split Source Reader & Source Editor (Izvori Tab)

**Current state:** `SourceEditor.tsx` is a monolith handling both metadata editing AND full reading/extraction. A separate `SourceReader.tsx` already exists with rich reader features (width toggle S/M/L/XL/Full, coverage view, outline sidebar, exam sidebar, auto-split). It's just not wired from `CategoryView`.

**The fix in `CategoryView.tsx` (Izvori tab):**
- Each source in the list gets TWO buttons: **"Čitaj"** (opens `SourceReader`) and **"Uredi"** (opens `SourceEditor` as a Dialog/Drawer for metadata only)
- Add state: `readerSource: Source | null` for full-screen reader mode
- When `readerSource` is set, render `<SourceReader source={readerSource} onBack={...} />`
- Keep `selectedSource` for the editor, but change it to a **Dialog** (not full-screen) containing only the metadata panel (title, SL markings, date, isExclusive) + a "Paste new source text" textarea for updating HTML content

**Refactor `SourceEditor.tsx`:**
- Strip out the reader/content panel, outline sidebar, selection tooltip, Smart Split, AutoSplit — all of that stays in `SourceReader`
- Keep only: metadata fields (title, SL, date, exclusive toggle), Save button, and a new "Update source text" collapsible textarea
- Render as a `<Dialog>` from `CategoryView`

**Wire `SourceReader` in `CategoryView`:**
- Import existing `SourceReader` from `@/components/SourceReader`
- Note: `SourceReader` uses `useSourceLogic` which pulls `cards` from `useAppContext()` — it's already self-contained
- Pass `source` and `onBack`

**Files changed:**
- `src/views/CategoryView.tsx` — add reader state, two-button source list, SourceReader import, SourceEditor as Dialog
- `src/components/category/SourceEditor.tsx` — strip to metadata-only Dialog content

---

## Task 2: Restore Mnemonic Workshop as Global Pipeline

**Current state:** `MnemonicModule.tsx` at route `/mnemonic` already has the full global workshop with menu, test, major system. `CategoryMnemonicWorkshop.tsx` is the scoped version in CategoryView tab.

**The fix:**
1. **Remove mnemonic tab from `CategoryView.tsx`** — delete the 3rd TabsTrigger and TabsContent, remove `CategoryMnemonicWorkshop` import
2. **Add sidebar link** — in `AppSidebar.tsx`, add `{ path: "/mnemonic", icon: Brain, label: "Memorizacija" }` to either STATIC_NAV or TOOLS_NAV (fits best in TOOLS_NAV alongside other learning tools)
3. **MnemonicModule already exists** at `/mnemonic` route — no route changes needed
4. **Delete `src/components/category/CategoryMnemonicWorkshop.tsx`** — now orphaned

**Graduation logic (marking cards as "done"):**
- In `MnemonicWorkshop.tsx`, when user marks a card as "ready" (status = "ready"), add logic to stamp the original card with tag `"mnemonic"` via `patchCard`
- This requires `MnemonicWorkshop` to gain access to `patchCard` from context — wire through `MnemonicModule` → `MnemonicWorkshop`
- The `mnemonic` tag gets treated like existing tags in the card system

**Files changed:**
- `src/views/CategoryView.tsx` — remove mnemonic tab
- `src/components/AppSidebar.tsx` — add Memorizacija to TOOLS_NAV
- `src/components/MnemonicWorkshop.tsx` — add graduation logic (tag original card)
- `src/components/MnemonicModule.tsx` — pass `patchCard` through
- Delete `src/components/category/CategoryMnemonicWorkshop.tsx`

---

## Task 3: Settings Overhaul (Backup & Category CRUD)

**Current state:** Already implemented in previous Phase 5. `SRSettingsPanel.tsx` already imports `ExportImportDialog` and `CategoryManager`, has `exportImportOpen` state, and uses `useCardContext()` for all CRUD actions.

**Verify & confirm:** This task is already done. The "Sistem" tab has the backup button, and there's a "Predmeti" tab with CategoryManager. No additional work needed unless the previous implementation had issues.

---

## Task 4: Localized Structure CRUD & 3-Tier Filters

**Current state:** Already implemented in previous Phase 5. `CardOrgMode.tsx` has rename/delete for subcategories and chapters. `CardViewMode.tsx` has filter dropdowns for subcategory, chapter, type, and tag.

**Addition needed:** Add `"mnemonic"` as a filter option in the Type filter alongside `"essay"` and `"flash"`. Currently the type filter has `"all" | "essay" | "flash"` — extend to `"all" | "essay" | "flash" | "mnemonic"`.

- In `CardViewMode.tsx`, update `filterType` state type and filter logic to check for cards with `tags?.includes("mnemonic")`
- Add a "Mnemo" button/option in the type filter UI

**Files changed:**
- `src/components/category/CardViewMode.tsx` — add mnemonic type filter option

---

## Implementation Order

Due to size, I'll implement **Tasks 1 & 2 first**, then Tasks 3 & 4.

## File Change Summary

| File | Change |
|---|---|
| `src/views/CategoryView.tsx` | Remove mnemonic tab, split source list into Read/Edit buttons, add SourceReader |
| `src/components/category/SourceEditor.tsx` | Strip to metadata-only Dialog content |
| `src/components/AppSidebar.tsx` | Add Memorizacija link to TOOLS_NAV |
| `src/components/MnemonicModule.tsx` | Pass patchCard to Workshop |
| `src/components/MnemonicWorkshop.tsx` | Add graduation logic (tag original card on "ready") |
| `src/components/category/CardViewMode.tsx` | Add "Mnemo" to type filter |
| **DELETE** `src/components/category/CategoryMnemonicWorkshop.tsx` | Orphaned |

