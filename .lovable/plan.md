

# FAZA 2: UUID Taksonomija za Potkategorije i Glave

## Rezime
Prebacujemo identifikaciju potkategorija i glava sa mutable string naziva na UUID-ove. Kartice će čuvati `subcategoryId` i `chapterId` umjesto `subcategory` i `chapter` stringova. Tiha migracija pri boot-u mapira postojeće podatke bez gubitka.

**Obim**: ~33 fajlova, ~500 linija promjena. Predlažem podjelu na 3 pod-faze radi stabilnosti.

---

## Pod-faza 2A: Schema + Service Layer + Migracija (Temelj)

### 1. Ažuriranje `SubcategoryNode` i dodavanje `ChapterNode` u `db.ts`
```ts
export interface SubcategoryNode {
  id: string;          // UUID (NOVO)
  name: string;
  chapters: ChapterNode[];  // zamjena za string[]
  sortOrder: number;
}

export interface ChapterNode {
  id: string;          // UUID (NOVO)
  name: string;
  sortOrder: number;
}
```

### 2. Ažuriranje `Card` interfejsa u `spaced-repetition.ts`
- Dodati `subcategoryId?: string` i `chapterId?: string`
- Zadržati stare `subcategory` i `chapter` polja kao `@deprecated` tokom migracije — uklanjamo ih tek u pod-fazi 2C
- `createCard()` i `createFlashCard()` primaju `subcategoryId` umjesto `subcategory`

### 3. Kreiranje `src/lib/category-service.ts` — Oficir za vezu
Centralni service layer koji:
- Re-exportuje `optimisticCategoryUpdate` (premjesti iz `useCategoryManagement.ts`)
- Sadrži helpere za UUID lookup:
  ```ts
  findSubcategoryById(records: CategoryRecord[], subId: string): SubcategoryNode | null
  findChapterById(records: CategoryRecord[], chapId: string): ChapterNode | null
  findSubcategoryByName(records: CategoryRecord[], catId: string, name: string): SubcategoryNode | null
  getSubcategoryName(records: CategoryRecord[], subId: string): string
  getChapterName(records: CategoryRecord[], chapId: string): string
  ```
- Ovi helperi eliminišu potrebu da 33 UI komponenti ručno pretražuju niz

### 4. IDB Schema bump (v9) u `db.ts`
```ts
this.version(9).stores({
  cards: "id, categoryId, subcategoryId, type, createdAt, sourceId, [categoryId+subcategoryId]",
}).upgrade(tx => {
  // Migracija se radi u useCardBootstrap, ne ovdje — samo schema indeksi
});
```

### 5. Tiha migracija u `useCardBootstrap.ts`
Pri boot-u, nakon učitavanja `categoryRecords` i `cards`:
1. Za svaki `SubcategoryNode` bez `id` polja: dodijeli `crypto.randomUUID()`
2. Za svaki `chapter` string u `SubcategoryNode.chapters`: konvertuj u `ChapterNode { id, name, sortOrder }`
3. Za svaku karticu sa `subcategory` (string) ali bez `subcategoryId`:
   - Nađi odgovarajući `SubcategoryNode` po imenu unutar iste kategorije
   - Postavi `card.subcategoryId = node.id`
   - Isto za `chapter` → `chapterId`
4. Persisti ažurirane `categoryRecords` i kartice nazad u IDB

### 6. Ažuriranje `useCategoryManagement.ts`
- `optimisticCategoryUpdate` premjestiti u `category-service.ts`, uvesti odatle
- Svi CRUD-ovi (addSubcategory, renameSubcategory, deleteSubcategory, addChapter, renameChapter, deleteChapter) rade sa UUID-ovima
- `addSubcategory` generira UUID za novi node
- `addChapter` generira UUID za novi `ChapterNode`
- `renameSubcategory` / `renameChapter`: O(1) — ažurira samo `name` polje u nodu, **ne dira kartice** (ovo je cijela poenta migracije!)
- `deleteSubcategory` / `deleteChapter`: kartice dobijaju `subcategoryId: ""` / `chapterId: ""`

---

## Pod-faza 2B: Ažuriranje svih potrošača (UI komponente + hookovi)

Ovo je najobimniji dio. Svaka komponenta koja čita `card.subcategory` mora preći na `card.subcategoryId` + lookup ime iz `categoryRecords`.

### Hookovi
| Fajl | Promjena |
|------|----------|
| `useCardCRUD.ts` | `addCard`/`updateCard` koriste `subcategoryId`/`chapterId` |
| `useCardAnnotations.ts` | `bulkUpdateChapter` koristi `chapterId`/`chapterOrder` |
| `useChapterManagement.ts` | Prelazi na `chapterId` |
| `useCardImport.ts` | Migracija importovanih kartica (stari format → UUID) |
| `useCardExport.ts` | Export uključuje i `subcategoryId`/`chapterId` |

### Komponente (ključne)
| Fajl | Promjena |
|------|----------|
| `CardForm.tsx` + `MetadataSection.tsx` | Dropdown koristi UUID, prikazuje name |
| `CardList.tsx` | Prikaz: lookup ime iz categoryRecords |
| `SessionFilters.tsx` | Filter po subcategoryId |
| `LearnSession.tsx` | Sort po subcategoryId, hronološki sort lookup |
| `CategoryView.tsx` | Filter/grupiranje po UUID |
| `CardViewMode.tsx` + `CardOrgMode.tsx` | Grupiranje po UUID, drag-drop sa UUID |
| `MentalSkeleton.tsx` + `ChapterBox.tsx` | UUID za filtriranje i sortiranje |
| `KnowledgeMap` komponente | Statistike po UUID |
| `MonumentInterior.tsx` | Forum drill-down po UUID |
| `MnemonicWorkshop.tsx` + `MnemonicTest.tsx` | Filter po UUID |
| `SpeedReader.tsx` | Filter po UUID |
| `SessionHeader.tsx` | Prikaz imena iz lookup-a |
| `CardContextMenu.tsx` | Move-to koristi UUID |

### Context
| Fajl | Promjena |
|------|----------|
| `AppContext.tsx` | `subcategories` derivat: `Record<string, {id: string, name: string}[]>` umjesto `Record<string, string[]>` |

---

## Pod-faza 2C: Čišćenje + Planner fix

- Ukloniti `@deprecated` polja `subcategory` i `chapter` sa `Card` interfejsa
- Potvrditi da `StudyPhase.categories` koristi UUID-ove (već koristi — dodati JSDoc komentar)
- Ukloniti legacy fallback logiku iz bootstrap-a

---

## Guardrails
- FSRS logika: **netaknuta** — `Section`, `reviewSection`, `getCardScore` ne zavise od subcategory/chapter
- UUID kategorija: **netaknut** — ovo proširuje isti pattern na niži nivo hijerarhije
- Ready Guard: svi `if (!ready)` ostaju
- Backward compatibility za export: stari JSON format (sa `subcategory` string) se i dalje može importovati — migracija u `useCardImport`
- `chapterOrder` ostaje na kartici (sortiranje unutar glave)

## Procjena
- Pod-faza 2A: ~150 linija (5 fajlova) — može u jednom koraku
- Pod-faza 2B: ~300 linija (20+ fajlova) — treba 2-3 koraka
- Pod-faza 2C: ~30 linija (2 fajla) — trivijalno

Predlažem da krenemo sa **Pod-fazom 2A** prvo, pa nakon potvrde čistog builda nastavimo sa 2B.

