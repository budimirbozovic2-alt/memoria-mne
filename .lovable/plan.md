

# Fix: Org Mode, Edit 404, UUID Display, Source Reader Scroll

## Confirmed Bugs

| # | Bug | Root Cause | Files |
|---|-----|-----------|-------|
| 1 | Edit → Save → 404 | `EditPage` defaults to `setView("cards")` but no `/cards` route exists in `App.tsx` | `EditPage.tsx` |
| 2 | UUID shown in card form dropdowns | `MetadataSection` renders `categories` (UUID array) raw — no name resolution | `MetadataSection.tsx`, `useCardActions.ts`, `CardForm.tsx` |
| 3 | UUID shown in Learn session header | `SessionHeader.tsx` line 85: `{card.categoryId}` — raw UUID | `SessionHeader.tsx` |
| 4 | UUID shown in Review session header | `ReviewCard.tsx` line 196: `{card.categoryId}` — raw UUID | `ReviewCard.tsx` |
| 5 | UUID shown in CardList, WorkshopCardItem, LearnModal | Multiple components display `card.categoryId` without name lookup | `CardList.tsx`, `WorkshopCardItem.tsx`, `LearnModal.tsx` |
| 6 | Unassigned cards can't be moved between subcategories in Org Mode | Unassigned cards are NOT in a `SortableContext` — only have a chapter select dropdown, no DnD | `CardOrgMode.tsx` |
| 7 | Source Reader heading click not scrolling | Likely works but needs verification — code path exists (`handleClick` + `scrollToHeading`) | Verify first |

## Plan

### Fix 1: Edit → 404 (EditPage.tsx)

The `previousViewRef` defaults to `"cards"` which maps to `/cards` — a route that doesn't exist. When editing from CategoryView, `sr-edit-return-view` is set to `"learn"` (from LearnPage) but **CategoryView sets no return view**.

**Solution:**
- `CategoryView.tsx` line 205: Add `sessionStorage.setItem("sr-edit-return-view", "category:" + categoryId)` before navigating
- `EditPage.tsx`: Change default fallback from `"cards"` to `"dashboard"`. Also handle the `"category:UUID"` format by navigating to `/category/UUID`

### Fix 2: UUID in Card Form Dropdowns (MetadataSection.tsx)

`categories` prop is `string[]` of UUIDs. `MetadataSection` renders them raw on line 68.

**Solution:**
- Pass `categoryRecords` to `MetadataSection` (already available via `useCardActions`)
- Add `categoryRecords` prop to `MetadataSection` interface
- Use `categoryRecords.find(r => r.id === c)?.name ?? c` for display in the category dropdown
- `useCardActions.ts`: pass `categoryRecords` through to hook return so form can access it

### Fix 3-5: UUID in SessionHeader, ReviewCard, CardList, etc.

These components display `card.categoryId` raw. They need a `categoryRecords` prop (or a lookup map) to resolve UUID → name.

**Files to fix:**
- `SessionHeader.tsx` (line 85): Add `categoryRecords` prop, resolve name
- `ReviewCard.tsx` (line 196): Add `categoryRecords` prop, resolve name
- `CardList.tsx` (line 97): Add `categoryRecords` prop, resolve name
- `WorkshopCardItem.tsx` (line 83): Add `categoryRecords` prop, resolve name
- `LearnModal.tsx` (line 113): Add `categoryRecords` prop, resolve name

Each component gets a small helper: `const catName = categoryRecords?.find(r => r.id === card.categoryId)?.name ?? card.categoryId`

Must also update parent components to pass `categoryRecords` down.

### Fix 6: Org Mode — Cross-Subcategory Assignment

Currently unassigned cards (no chapter) are rendered as plain divs, not inside `SortableContext`. They can't be dragged at all.

**Solution in `CardOrgMode.tsx`:**
- Wrap unassigned cards in a `SortableContext` with `useSortable`
- Make them draggable so they can be dropped on chapter headers in any subcategory
- Add a "move to subcategory" select dropdown for cards that need to change subcategory (not just chapter)
- Add a Select dropdown per subcategory header to allow moving all unassigned cards or individual cards to another subcategory

### Fix 7: Source Reader Heading Scroll

The code path exists and appears correct. The outline sidebar calls `logic.scrollToHeading(h.id)` which calls `document.getElementById(id).scrollIntoView()`. The in-content heading click also works via `handleClick`. Will verify during implementation — if broken, likely a timing issue with `dangerouslySetInnerHTML` rendering.

## Implementation Order

1. **Fix 1** — Edit 404 (2 files, ~10 lines)
2. **Fix 2** — Category form UUID display (3 files, ~15 lines)
3. **Fix 3-5** — UUID in session/card displays (5+ files, ~30 lines)
4. **Fix 6** — Org Mode DnD for unassigned cards (~30 lines)
5. **Fix 7** — Verify Source Reader scroll, fix if needed

## Scope
- ~10 files modified
- ~100 lines changed
- No IDB schema changes
- No FSRS/context provider changes

