

# Dekompozicija CardList i CardViewMode

## Trenutno stanje
Obe komponente su već djelimično dekomponovane (CardRow, useCardListFilters, CardViewTable, CardViewDialogs), ali sadrže 270 i 298 linija respektivno. Postoji prostor za dalje izdvajanje.

## Plan

### 1. CardList — izdvojiti drag-and-drop logiku

**Novi fajl: `src/hooks/useCardListDnd.ts`** (~50 linija)

Izdvaja sve drag-and-drop callback-ove i state iz CardList-a:
- `dragIndex`, `dragOverIndex` state
- `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`
- `handleContainerDragOver` (auto-scroll pri rubovima ekrana)
- `scrollRafRef`

Hook prima `filtered` kartice i `onReorder` callback, vraća state i handlere.

**Izmjena `CardList.tsx`**: Zamijeniti ~45 linija DnD koda sa jednim `useCardListDnd()` pozivom. Komponenta pada na ~225 linija.

### 2. CardViewMode — izdvojiti filter toolbar u komponentu

**Novi fajl: `src/components/category/CardViewFilterBar.tsx`** (~110 linija)

Izdvaja kompletnu filter traku (linije 155-249) uključujući:
- Subcategory, chapter, type, tag select-ove
- Mastery filter badge
- Reset dugme
- Action dugmad (Izaberi, Masovni Import, Nova kartica)

Props: filter state + setteri, counts, nameMap, akcije.

**Novi fajl: `src/hooks/useCardViewFilters.ts`** (~60 linija)

Izdvaja filter logiku iz CardViewMode (linije 39-106):
- Filter state (`filterSubcategory`, `filterChapter`, `filterType`, `filterTag`)
- Izvedene vrijednosti (`nameMap`, `subcategoryCounts`, `uniqueSubcategories`, `chapterCounts`, `uniqueChapters`, `filteredCards`, `hasActiveFilters`)
- `resetFilters` callback

Hook prima `cards`, `allCategories`, `categoryId`, `masteryFilter`.

**Izmjena `CardViewMode.tsx`**: Zamijeniti ~70 linija filter logike + ~95 linija filter JSX-a sa hook pozivom i `<CardViewFilterBar />`. Komponenta pada na ~130 linija.

## Scope
- 3 nova fajla (2 hook-a + 1 komponenta)
- 2 izmjene (CardList, CardViewMode)
- Bez funkcionalnih promjena

