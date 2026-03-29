

# Core UI Restoration & Workflow Migration

## Current State Assessment

After full audit, here's what's actually broken vs already working:

| Feature | Status | Notes |
|---------|--------|-------|
| Rich Text Editor | **WORKING** | Full toolbar: Bold, Italic, Underline, Heading, Lists, Color. Markdown auto-format. Image paste. NOT dummied out. |
| Single card delete | **WORKING in CardList** | Trash icon exists (line 143). But **MISSING in CardViewMode** (the CategoryView card list). |
| Batch card delete | **PARTIALLY WORKING** | CardList has selectionMode/selectedIds props, but CardViewMode has NO selection or batch delete UI. |
| Edit button in CardViewMode | **MISSING** | No way to navigate to edit a card from CategoryView's card list. |
| Source linkage badge | **MISSING** | CardViewMode doesn't show sourceId indicator. |
| Subcategory in Settings | **EXISTS** | Both SRSettingsPanel (Sistem tab) and CategoriesPage render CategoryManager with full subcategory UI. |
| Subcategory in CardOrgMode | **ALREADY EXISTS** | Full add/rename/delete subcategory UI with DnD. |

## Plan (4 Actions)

### Action 1: Skip Rich Text Editor — Already Working
No changes needed. The RichTextEditor has Bold, Italic, Underline, Heading, Bullet List, Ordered List, and Red Color. Markdown auto-format works. Image paste works.

### Action 2: Add Delete, Edit & Batch Selection to CardViewMode
**File: `src/components/category/CardViewMode.tsx`**

- Add `onDelete: (id: string) => void` and `onEdit: (card: Card) => void` to Props interface
- Add batch selection state: `selectedIds: Set<string>`, `selectionMode: boolean`
- On each card row (the expanded section, ~line 301): add Edit (pencil) and Delete (trash) buttons
- Add a batch toolbar that appears when cards are selected: "X izabrano" + "Obriši izabrane" button
- Add checkbox on each card row when in selection mode
- Add "Izaberi" toggle button in the filter toolbar

**File: `src/views/CategoryView.tsx`**
- Pass `deleteCard` and an edit handler to CardViewMode
- For edit: use `useNavigate` to navigate to `/edit/:cardId`

### Action 3: Add Source & Chapter Badges to CardViewMode
**File: `src/components/category/CardViewMode.tsx`**

In the expanded card detail section (~line 300-356), add:
- If `card.sourceId` exists: show a `<Badge>` "Povezano sa izvorom"
- Ensure `card.chapter` badge is visually distinct (already partially there at line 309, but make it more prominent with an icon)

### Action 4: Remove Subcategory UI from Settings
**File: `src/components/SRSettingsPanel.tsx`**
- Remove `onAddSub`, `onRenameSub`, `onDeleteSub` props from the CategoryManager instance (lines 470-472)
- Remove `addSubcategory`, `renameSubcategory`, `deleteSubcategory` from the destructured context (line 33)

**File: `src/components/CategoryManager.tsx`**
- Make subcategory props optional (`onAddSub?`, `onRenameSub?`, `onDeleteSub?`)
- Conditionally render subcategory section only when those props are provided
- This way CategoriesPage (standalone page) can still pass them if needed, but Settings won't

**File: `src/views/CategoriesPage.tsx`**
- Also remove subcategory props — subcategory management lives exclusively in CardOrgMode now

## Files Modified
1. `src/components/category/CardViewMode.tsx` — Add delete, edit, batch select, source badge
2. `src/views/CategoryView.tsx` — Pass deleteCard + edit handler to CardViewMode
3. `src/components/CategoryManager.tsx` — Make subcategory props optional, hide when absent
4. `src/components/SRSettingsPanel.tsx` — Remove subcategory props from CategoryManager
5. `src/views/CategoriesPage.tsx` — Remove subcategory props

## Constraints Respected
- No IDB schema changes
- No Context provider logic changes (only consuming existing actions)
- CardOrgMode subcategory management: untouched
- Export/Import pipeline: untouched

