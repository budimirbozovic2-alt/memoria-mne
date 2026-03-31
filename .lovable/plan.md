

# Virtualizacija MnemonicWorkshop liste sa react-window

## Rezime
`CardList.tsx` već koristi `react-window` virtualizaciju (aktivira se iznad praga). `MnemonicWorkshop.tsx` koristi plain `.map()` — prebacujemo ga na isti pattern sa `VariableSizeList` iz `react-window` v2 (već instaliran kao `List`).

## Kontekst
- `react-window@2.2.7` je instaliran i koristi se u `CardList.tsx` sa `List` komponentom i `RowComponentProps`
- `WorkshopCardItem` je memo-izirana komponenta sa expand/collapse stanjem — visina reda varira
- Workshop kartice imaju ~80px collapsed, ~400px+ expanded (zavisno od sadržaja)
- Nema dnd-kit integracije u Workshop-u (guardrail kaže da to ostavljamo za kasnije)

## Plan

### Fajl: `src/components/MnemonicWorkshop.tsx`

**1. Import `List` i `RowComponentProps`** iz `react-window` (isti pattern kao CardList)

**2. Definisati konstante visina:**
```
COLLAPSED_HEIGHT = 72
EXPANDED_BASE = 400
VIRTUALIZATION_THRESHOLD = 30
```

**3. Kreirati `VirtualWorkshopRow` komponentu** koja prima `RowComponentProps` i renderuje `WorkshopCardItem`:
- Čita `card` iz `props.data.filteredCards[props.index]`
- Prosljeđuje `isExpanded`, `onToggle`, `onUpdateCard`, `onDeleteCard`, `majorSystem` iz `rowProps`

**4. Dinamička visina reda** — `getRowHeight(index)` callback:
- Collapsed: `COLLAPSED_HEIGHT + 8` (gap)
- Expanded: `EXPANDED_BASE + 8`

**5. Zamijeniti `.map()` blok** (L271-281) sa uslovnim renderovanjem:
- Ako `filtered.length >= VIRTUALIZATION_THRESHOLD`: renderuj `<List>` sa `rowComponent={VirtualWorkshopRow}`
- Inače: zadrži postojeći `.map()` za male liste (do 30 kartica)

**6. Resetovati `listRef` pri expand/collapse** — pozovi `listRef.current?.resetAfterIndex(expandedIndex)` kad se promijeni `expandedId` (jer se visina reda mijenja)

**7. Wrapper div** oko `<List>` treba imati `max-h-[700px]` ili `height: min(count * ROW_H, 700)` da lista ne bude beskonačno visoka

### Bez promjena
- `WorkshopCardItem.tsx` — ostaje nepromjenjen
- `CardList.tsx` — već virtualizovan, bez promjena
- Nema novih zavisnosti
- CSS/styling ostaje isti unutar kartica

## Scope
- 1 fajl: `src/components/MnemonicWorkshop.tsx` (~40 linija promjena)
- Nema novih dependency-ja (`react-window` v2 već instaliran)
- Nema schema promjena

