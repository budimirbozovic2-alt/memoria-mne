

# Phase 5: Feature Restoration & UI Refinement

## Overview

Four tasks restoring orphaned features into the new Category-Centric architecture. No new dependencies needed.

---

## Task 1: Settings Overhaul — Export/Import + Predmeti Tab

### 1A: Wire ExportImportDialog into Settings "Sistem" tab

**`src/components/SRSettingsPanel.tsx`**
- Import `ExportImportDialog` and `useCardContext` (for `exportData`, `exportTemplate`, `importData`, `cards`)
- Add state `exportImportOpen` 
- In the "Sistem" tab (`TabsContent value="system"`), add a "Backup & Restore" card with a button that opens `ExportImportDialog`
- Render `<ExportImportDialog>` at bottom of component, passing through the export/import callbacks from context

The export logic in `useCardExport.ts` already reads fresh data from IDB (`db.cards.toArray()`, `db.sources.toArray()`) and exports `CategoryRecord[]` as `categories`. It also exports sources with `categoryId`. **Schema is already v7-compliant.** The import in `useCardImport.ts` does migration with `migrateImported()` which adds all required FSRS fields. No schema audit changes needed.

### 1B: Add "Predmeti" tab for main category CRUD

**`src/components/SRSettingsPanel.tsx`**
- Change grid from `grid-cols-4` to `grid-cols-5`
- Add new `TabsTrigger value="subjects"` → "Predmeti"
- Add new `TabsContent value="subjects"` that renders `CategoryManager`
- Import `CategoryManager` and wire it with `useCardContext()` actions: `addCategory`, `renameCategory`, `deleteCategory`, `addSubcategory`, `renameSubcategory`, `deleteSubcategory`, `categories`, `subcategories`, `cardCountByCategory`
- The `CategoryManager` already handles rename/delete/add/monument-type/subcategories — just needs proper wiring

---

## Task 2: Localized Structure CRUD in CardOrgMode

**`src/components/category/CardOrgMode.tsx`**

Add rename/delete for subcategories and chapters within the org mode UI:

- Add props: `renameSubcategory`, `deleteSubcategory` (from context actions)
- **Subcategory header**: Add inline edit (pencil icon) and delete (trash icon) buttons next to each subcategory name
- **Chapter header**: Add rename (inline edit) and delete buttons next to each chapter name. Deleting a chapter unassigns all its cards (`patchCard(id, c => ({...c, chapter: undefined}))`)
- Renaming a chapter: batch `patchCard` all cards in that chapter to the new name

---

## Task 3: 3-Tier Filter System in CardViewMode

**`src/components/category/CardViewMode.tsx`**

Add filter state and toolbar above the card list:

- State: `filterSubcategory: string`, `filterChapter: string`, `filterType: "all" | "essay" | "flash"`, `filterTag: string`
- Build unique subcategories/chapters/tags from `cards` array using `useMemo`
- Filter toolbar row with:
  1. **Subcategory dropdown** → on select, populate chapter dropdown with chapters from that subcategory
  2. **Type toggle**: All / Essay / Flash (3 small buttons or select)
  3. **Tag dropdown**: populated from `CARD_TAGS`
- Apply all filters with `useMemo` on cards before mapping
- Add a "Reset filters" button when any filter is active

---

## Task 4: SourceEditor Power-Ups

**`src/components/category/SourceEditor.tsx`**

### 4A: Width toggle
- Add state `wide: boolean` (default false)
- Toggle button in toolbar (Expand/Contract icon)
- When wide: content div uses `max-w-none`; when narrow: `max-w-prose mx-auto`

### 4B: Extracted cards panel
- Filter `cards` prop by `sourceId === source.id` to get linked cards
- Show a collapsible sidebar/panel listing linked card questions with count badge
- Position: inside the grid layout, as an additional column or below outline

### 4C: Auto-Split tool button
- Import `AutoSplitDialog` (already exists at `src/components/AutoSplitDialog.tsx`)
- Add state `autoSplitOpen`
- Add "Auto Split" button (Wand2 icon) in toolbar, next to Save
- Render `<AutoSplitDialog open={autoSplitOpen} onClose={() => setAutoSplitOpen(false)} source={source} />`

---

## File Changes Summary

| File | Change |
|---|---|
| `src/components/SRSettingsPanel.tsx` | Add ExportImport trigger in Sistem tab + new "Predmeti" tab with CategoryManager |
| `src/components/category/CardOrgMode.tsx` | Add rename/delete UI for subcategories and chapters |
| `src/components/category/CardViewMode.tsx` | Add 3-tier filter toolbar (subcategory, type, tag) |
| `src/components/category/SourceEditor.tsx` | Add width toggle, extracted cards panel, AutoSplit button |
| `src/views/CategoryView.tsx` | Pass `renameSubcategory`, `deleteSubcategory` to CardOrgMode |

