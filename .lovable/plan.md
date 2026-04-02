

# Dekompozicija CardOrgMode.tsx (503 → ~200 linija)

## Struktura razdvajanja

| Novi modul | Sadržaj | ~Linije |
|------------|---------|---------|
| `src/hooks/useCardOrgDnd.ts` | DnD logika: `handleDragStart`, `handleDragEnd`, `findCardContainer`, `assignChapter`, `activeCard` state | ~90 |
| `src/components/category/org-mode/OrgSubcategoryPanel.tsx` | Subcategory accordion panel (L369-491) — header + expanded content sa chapters i unassigned | ~130 |
| `src/components/category/org-mode/OrgCardTiles.tsx` | `SortableCardTile`, `UnassignedCardRow`, `CardDragOverlay`, `DroppableChapterZone` — 4 prezentacione komponente (L107-234) | ~130 |
| `src/components/category/org-mode/org-mode-utils.ts` | `buildTree`, `TreeNode` tip, `chapterDropId`, `parseChapterDropId` helper funkcije (L24-104) | ~85 |
| `src/components/category/CardOrgMode.tsx` | Orchestrator — state, DndContext wrapper, legend, map over tree | ~80 |

## Detalji po modulu

### `org-mode-utils.ts` (L24-104)
- `TreeNode` interfejs
- `chapterDropId()` i `parseChapterDropId()` helperi
- `buildTree()` funkcija
- Čist utility — nema React zavisnosti

### `OrgCardTiles.tsx` (L107-234)
- `SortableCardTile` — sortable kartica u chapter-u
- `DroppableChapterZone` — droppable zona za glavu
- `CardDragOverlay` — ghost pri drag-u
- `UnassignedCardRow` — kartica bez glave sa assign kontrolama
- Sve su prezentacione komponente, bez poslovne logike

### `useCardOrgDnd.ts` (L239-341)
- Prima: `cards`, `subcategoryNodes`, `patchCard`, `tree`
- Vraća: `activeId`, `activeCard`, `handleDragStart`, `handleDragEnd`, `assignChapter`
- Sadrži `findCardContainer`, `cardMap` memo, svu reorder logiku
- Enkapsulira kompletnu DnD interakciju

### `OrgSubcategoryPanel.tsx` (L369-491)
- Prima: `node: TreeNode`, `isExpanded`, `onToggle`, `tree` (za otherSubs lookup), `assignChapter`, `patchCard`
- Renderuje header button + expanded sadržaj (chapters + unassigned)
- Koristi `OrgCardTiles` komponente

### `CardOrgMode.tsx` (orchestrator)
- `expandedSubs` state + auto-expand effect
- `buildTree` poziv
- `useCardOrgDnd` hook
- `DndContext` wrapper + legend + `tree.map(node => <OrgSubcategoryPanel>)`
- `DragOverlay` portal

## Scope
- 3 nova fajla + 1 novi hook
- 1 refaktorisan fajl
- 0 promjena u potrošačima (`CategoryView.tsx`)
- Nema novih zavisnosti

