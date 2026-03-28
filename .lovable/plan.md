

# Fix: Rogue Auto-Split Categories & Missing Card CRUD Buttons

## Task 1: Stop Auto-Split from creating fake categories

### Root Cause
**`src/components/AutoSplitDialog.tsx` line 178**: `const category = source.title || "Opšte"` passes the source *title* as the category. Then `addCard()` in `useCardCRUD.ts` (lines 71-73) checks `if (!categoriesRef.current.includes(category))` — since the source title is never in the categories list, it calls `setCategories(prev => [...prev, category])`, creating a rogue category named after the law.

**`src/hooks/useSourceLogic.ts` line 122**: Same pattern — `const category = source.categoryId || categories[0] || "Opšte"` — the `categories[0]` fallback is a name string, not a UUID. If `source.categoryId` is somehow empty, this creates a name-based category.

### Fix

**`src/components/AutoSplitDialog.tsx`**:
- Line 178: Change `const category = source.title || "Opšte"` → `const category = source.categoryId`
- The `source` prop always has `categoryId` (it comes from CategoryView which scopes by category)

**`src/hooks/useSourceLogic.ts`**:
- Line 122: Change fallback chain to `const category = source.categoryId` (remove the name-based fallbacks)
- Line 156 (handleCreateEssay): Already uses `source.categoryId` — verify no fallback needed
- Line 175 (handleMapSelection): Change `const category = source.categoryId || categories[0] || "Opšte"` → `const category = source.categoryId`

**`src/hooks/useCardCRUD.ts`** (lines 71-73 and 87-89):
- Remove the auto-create-category logic: delete `if (!categoriesRef.current.includes(category)) { setCategories(...) }` from both `addCard` and `addFlashCard`. Categories are now managed exclusively through the CategoryManager in Settings. Cards must use an existing `categoryId` UUID.

---

## Task 2: Restore "Nova kartica" and "Importuj" buttons in Kartice tab

### Current State
`CardViewMode.tsx` and `CardOrgMode.tsx` have filter toolbars but no "Add" or "Import" buttons. The old `CreatePage.tsx` exists but navigates via the legacy `setView("cards")` pattern.

### Fix

**`src/components/category/CardViewMode.tsx`** — Add toolbar buttons:
- "Nova kartica" button → opens a Dialog containing `CardForm` with `categoryId` pre-filled and locked (no category dropdown)
- "Importuj" button → opens `ExportImportDialog` scoped to current category
- Props interface: add `addCard`, `addFlashCard`, `updateCard` callbacks (passed from CategoryView)

**`src/views/CategoryView.tsx`**:
- Pass `addCard`, `addFlashCard`, `updateCard` down to `CardViewMode` and `CardOrgMode`
- The `categoryId` is already available from `useParams`

**`CardForm` integration**:
- Wrap in a Dialog inside `CardViewMode`
- Pre-fill category with `categoryId`, hide the category selector
- On save: call `addCard(question, sections, categoryId, subcategory, chapter)`

---

## File Changes

| File | Change |
|---|---|
| `src/components/AutoSplitDialog.tsx` | Line 178: `source.title` → `source.categoryId` |
| `src/hooks/useSourceLogic.ts` | Lines 122, 175: remove name-string fallbacks, use `source.categoryId` only |
| `src/hooks/useCardCRUD.ts` | Lines 71-73, 87-89: remove auto-category-creation logic |
| `src/components/category/CardViewMode.tsx` | Add "Nova kartica" + "Importuj" toolbar buttons with embedded dialogs |
| `src/views/CategoryView.tsx` | Pass CRUD actions to CardViewMode/CardOrgMode |

