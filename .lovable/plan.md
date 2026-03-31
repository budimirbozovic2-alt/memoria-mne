

# Pod-faza 2B: UUID migracija svih UI komponenti i hookova

## Rezime
Sve komponente i hookovi koji čitaju `card.subcategory` / `card.chapter` (string nazive) prelaze na `card.subcategoryId` / `card.chapterId` (UUID). Za prikaz imena koriste se helperi iz `category-service.ts`. Filtriranje i grupisanje rade po UUID-u.

**Ukupno**: ~25 fajlova, ~350 linija promjena. Podjela na 4 grupe.

---

## Grupa 1: Forme, Liste i CRUD

### `useCardActions.ts`
- L109: `subcategory` init → `editCard?.subcategoryId ?? ""`
- L110: `chapter` init → `editCard?.chapterId ?? ""`
- L125: `availableSubs` — vraća UUID-ove umjesto imena: lookup iz `categoryRecords` → `node.id` umjesto `node.name`
- L139-151: `availableChapters` — vraća chapter UUID-ove: `ch.id` umjesto `ch.name`
- L148: `node = nodes.find(n => n.name === sub)` → `nodes.find(n => n.id === sub)` (jer sub sada sadrži UUID)
- L188-192: `resolvedMeta` — `subcategory`/`chapter` sadrže UUID-ove, ne imena. Kad je `showNewSub`, treba kreirati node i dobiti UUID (ili proslijediti ime za CRUD da kreira)

### `useCardCRUD.ts`
- L52: `createCard(question, sections, category, subcategory)` — već šalje string; sada to je UUID
- L54: `card.chapter = chapter` → `card.chapterId = chapter` (i staro deprecated polje za kompatibilnost)
- L104: `newCard.subcategory = updates.subcategory` → dodati i `newCard.subcategoryId = updates.subcategory`
- L105: `newCard.chapter = updates.chapter` → dodati i `newCard.chapterId = updates.chapter`
- L156: `splitCard` — proslijediti `subcategoryId` u novi card

### `MetadataSection.tsx`
- `availableSubs` sada prima `{id: string, name: string}[]` umjesto `string[]`
- Dropdown value = `id`, display = `name`
- `availableChapters` isto: `{id: string, name: string}[]`
- Chapter dropdown value = `id`, display = `name`

### `CardList.tsx`
- L100-105: Prikaz subcategory/chapter — koristi `getSubcategoryName(categoryRecords, card.subcategoryId)` i `getChapterName(categoryRecords, card.chapterId)`
- L159: `TextSelectionTooltip` — proslijeđuje `subcategoryId` umjesto `subcategory`
- L261-263: Filter logika: `c.subcategory === filterSubcategory` → `c.subcategoryId === filterSubcategory`; isto za chapter

### `CardViewMode.tsx`
- L64-77: `uniqueSubcategories` / `uniqueChapters` — gradi set iz `c.subcategoryId` / `c.chapterId`
- L80-83: Filter po `c.subcategoryId` / `c.chapterId`
- L230-250: Select dropdown — value = UUID, display = ime (lookup)
- L368-377: Badge prikaz — koristi `getSubcategoryName` / `getChapterName`

### `CardOrgMode.tsx`
- L39-89: `buildTree()` — grupiše po `card.subcategoryId` umjesto `card.subcategory`, `card.chapterId` umjesto `card.chapter`
- L44: chapters koristi `ch.id` umjesto `ch.name`
- L53: `card.subcategory` → `card.subcategoryId`
- L254-256: `assignChapter` — patchCard sa `chapterId` umjesto `chapter`
- L272-278: drag-drop `subcategory` → `subcategoryId`
- L316-320: drag-drop cross-container — `subcategoryId`

### `useCardAnnotations.ts`
- L170-186: `bulkUpdateChapter` — koristi `chapterId` umjesto `chapter`

### `useChapterManagement.ts`
- Ovaj hook čuva chapters u zasebnom IDB key (`chapters-{cat}-{sub}`). Ovo je **zastarjeli** pattern — chapters su sada u `CategoryRecord.subcategories[].chapters[]`. Međutim, ne brišemo ga u ovoj fazi, samo ažuriramo da radi sa UUID-ovima gdje je potrebno.

---

## Grupa 2: Sesije i Filteri

### `SessionFilters.tsx`
- L50: `availableSubs` — sada vraća `{id, name}[]` za prikaz. Alternativa: ostaje `string[]` ali su to sada UUID-evi, a prikaz koristi lookup
- L53-57: `chaptersInSub` — filter po `c.subcategoryId === selectedSubcategory` i `c.chapterId`
- L149-161: subcategory pill prikaz — value je UUID, display name iz lookup
- L188-200: chapter pill prikaz — value je UUID, display name iz lookup

### `LearnSession.tsx`
- L41-51: `positionMaps` — koristi `node.id` za subPos key umjesto `node.name`; koristi `ch.id` za chapPos key umjesto `ch.name`
- L63: `c.subcategory === selectedSubcategory` → `c.subcategoryId === selectedSubcategory`
- L64: `c.chapter === selectedChapter` → `c.chapterId === selectedChapter`
- L73-78: sort logika — `subPos[a.subcategoryId ?? ""]`, `chapPos[a.chapterId ?? ""]`
- L48: chapters loop — `(node.chapters ?? []).forEach((ch: any, i: number)` → koristi `ch.id` za key

### `FilterSetup.tsx` — samo proslijeđuje props, nema filtriranja. Nema promjene.

### `SessionHeader.tsx`
- L89: `card.subcategory` → koristi `getSubcategoryName(records, card.subcategoryId)` (treba dohvatiti records)

### `ReviewSetup.tsx`
- L60: `c.subcategory === selectedSubcategory` → `c.subcategoryId`
- L61: `c.chapter === selectedChapter` → `c.chapterId`
- L71-72: isto za `filteredAllCards`

### `ReviewSession.tsx` — ne sadrži direktno filtriranje po subcategory, proslijeđuje u ReviewSetup. Nema promjene.

---

## Grupa 3: Organizacija i Prikaz

### `MentalSkeleton.tsx`
- L70: `c.subcategory === subcategory` → `c.subcategoryId === subcategory` (props bi trebao biti UUID)
- L76: `!c.chapter` → `!c.chapterId`
- L80+: `cardsByChapter` — gradi se po `c.chapterId`

### `KnowledgeMap` komponente
- `CategoryList.tsx` L39: `c.subcategory === s` → `c.subcategoryId === s` (ako su subcategories sada UUID-evi)
- `SubcategoryList.tsx` L103: `c.subcategory === sub` → `c.subcategoryId` filter; L111: `!c.subcategory` → `!c.subcategoryId`
- Ove komponente koriste `subcategories: Record<string, string[]>` — ovo je derivat koji vraća **nazive**. Treba promjeniti derivat u `useCards.ts` da vraća UUID-ove, ili koristiti `categoryRecords` direktno.

### `useSourceHierarchy.ts`
- L69: `card.subcategory || "Ostalo"` → `card.subcategoryId || "ostalo-id"`, ali prikaz koristi lookup
- L72: `card.chapter || "Ostalo"` → `card.chapterId`

### `MonumentInterior.tsx`
- L41: `card.subcategory || "Ostalo"` → `card.subcategoryId`

---

## Grupa 4: Specijalni moduli

### `MnemonicWorkshop.tsx`
- L42: `c.subcategory` → `c.subcategoryId` (MnemonicCard ne koristi Card interfejs, ali ima isto polje)
- L54: filter po `c.subcategory === selectedSubcategory` → `c.subcategoryId`

### `MnemonicTest.tsx`
- L37: `c.subcategory` → `c.subcategoryId`
- L52: filter po `c.subcategory === filterSubcategory` → `c.subcategoryId`

### `SpeedReader.tsx`
- L226: `c.subcategory === selSub` → `c.subcategoryId === selSub`

### `GlobalSearch.tsx`
- L83: subtitle `c.subcategory` → koristi `getSubcategoryName`

### `useCardExport.ts` / `useCardImport.ts`
- Export: uključiti `subcategoryId` / `chapterId` pored deprecated `subcategory` / `chapter`
- Import: čitati `subcategoryId` / `chapterId` ako postoje, inače migrirati iz string naziva

---

## Ključna odluka: `subcategories` derivat u `useCards.ts`

Trenutno: `subcategories[catId]` vraća `string[]` naziva.

**Problem**: Mnogi filteri koriste `subcategories[cat]` da izlistaju opcije, a onda porede sa `card.subcategory` (imenom). Nakon migracije, treba porediti sa UUID-om.

**Rješenje**: Promjeniti derivat da vraća UUID-ove:
```ts
const subcategories = useMemo(() => {
  const map: Record<string, string[]> = {};
  for (const r of categoryRecords) {
    map[r.id] = (r.subcategories || []).map((n: any) =>
      typeof n === "string" ? n : n.id  // ← id umjesto name
    );
  }
  return map;
}, [categoryRecords]);
```

Ovo znači da sve komponente koje koriste `subcategories[cat]` za **prikaz** moraju koristiti lookup za ime. Ali to je upravo cilj — UUID za identifikaciju, name za prikaz.

Za prikaz dodati helper `subNameMap` u komponentama koje prikazuju pills:
```ts
const subNameMap = useMemo(() => {
  const m: Record<string, string> = {};
  for (const r of categoryRecords) 
    for (const n of r.subcategories || []) 
      if (typeof n === 'object') m[n.id] = n.name;
  return m;
}, [categoryRecords]);
```

---

## Fajlovi koji se mijenjaju

| Fajl | Grupa |
|------|-------|
| `src/hooks/useCards.ts` | 1 — derivat |
| `src/hooks/useCardActions.ts` | 1 |
| `src/hooks/useCardCRUD.ts` | 1 |
| `src/hooks/useCardAnnotations.ts` | 1 |
| `src/hooks/useCardExport.ts` | 1 |
| `src/hooks/useCardImport.ts` | 1 |
| `src/components/card-form/MetadataSection.tsx` | 1 |
| `src/components/CardList.tsx` | 1 |
| `src/components/category/CardViewMode.tsx` | 3 |
| `src/components/category/CardOrgMode.tsx` | 3 |
| `src/components/SessionFilters.tsx` | 2 |
| `src/components/LearnSession.tsx` | 2 |
| `src/components/learn/SessionHeader.tsx` | 2 |
| `src/components/review/ReviewSetup.tsx` | 2 |
| `src/components/MentalSkeleton.tsx` | 3 |
| `src/components/knowledge-map/CategoryList.tsx` | 3 |
| `src/components/knowledge-map/SubcategoryList.tsx` | 3 |
| `src/hooks/useSourceHierarchy.ts` | 3 |
| `src/components/gamification/MonumentInterior.tsx` | 3 |
| `src/components/MnemonicWorkshop.tsx` | 4 |
| `src/components/MnemonicTest.tsx` | 4 |
| `src/components/SpeedReader.tsx` | 4 |
| `src/components/GlobalSearch.tsx` | 4 |
| `src/components/TextSelectionTooltip.tsx` | 1 |

## Guardrails
- FSRS logika: netaknuta
- `@deprecated` polja: NE brišemo — to je za 2C
- CSS/styling: bez promjena
- Backward-compatible export (stara polja se i dalje pišu)

## Scope
- ~25 fajlova, ~350 linija promjena
- Predlažem implementaciju po grupama: Grupa 1+2 pa Grupa 3+4

