

# Pod-faza 2C: Uklanjanje @deprecated polja `subcategory` i `chapter`

## Rezime
Brišemo `subcategory` i `chapter` sa `Card` interfejsa i svih fajlova. Svuda gdje se koristi `card.subcategory` zamjenjujemo sa `card.subcategoryId`, a `card.chapter` sa `card.chapterId`. Import migracija zadržava backward compatibility za stare JSON fajlove.

---

## Promjene po fajlovima (~20 fajlova, ~120 linija)

### 1. Interfejs — `src/lib/spaced-repetition.ts`
- Obrisati `subcategory?: string` i `chapter?: string` sa `Card` interfejsa
- U `createCard` i `createFlashCard`: ukloniti pisanje u `subcategory`, zadržati `subcategoryId`

### 2. CRUD — `src/hooks/useCardCRUD.ts`
- `addCard`: ukloniti `card.chapter = chapter`, zadržati samo `card.chapterId = chapter`
- `updateCard`: preimenovati `updates.subcategory` → `updates.subcategoryId`, `updates.chapter` → `updates.chapterId`; ukloniti dual-write (`newCard.subcategory = ...`)
- `splitCard` (L162): `card.subcategory` → `card.subcategoryId`

### 3. Form state — `src/hooks/useCardActions.ts`
- L109: `editCard?.subcategoryId ?? editCard?.subcategory` → `editCard?.subcategoryId ?? ""`
- L110: `editCard?.chapterId ?? editCard?.chapter` → `editCard?.chapterId ?? ""`

### 4. Import migracija — `src/hooks/useCardImport.ts`
- L56: dodati `subcategoryId: c.subcategoryId || c.subcategory || ""` i `chapterId: c.chapterId || c.chapter || ""`
- Ukloniti `subcategory: c.subcategory || ""`

### 5. Bootstrap migracija — `src/hooks/useCardBootstrap.ts`
- L169: `card.subcategory` → `card.subcategoryId` (orphan scan)
- L170: `card.chapter` → `card.chapterId`

### 6. UI komponente — zamjena `card.subcategory` → `card.subcategoryId`, `card.chapter` → `card.chapterId`:

| Fajl | Promjena |
|------|----------|
| `src/components/CardList.tsx` | L100-101, L105, L159, L261-263: ukloni fallback na `.subcategory`/`.chapter` |
| `src/components/card-list/CardContextMenu.tsx` | L130, L134, L149, L154: `.subcategory` → `.subcategoryId`, `.chapter` → `.chapterId` |
| `src/components/category/CardViewMode.tsx` | L73-74, L82-83, L373, L376: ukloni fallback |
| `src/components/category/CardOrgMode.tsx` | L54, L59, L288-291, L333-336: ukloni dual-write, koristi samo `subcategoryId`/`chapterId` |
| `src/components/learn/SessionHeader.tsx` | L89: `.subcategory` → `.subcategoryId` |
| `src/components/learn/StudyModeRecall.tsx` | L96: ukloni fallback |
| `src/components/GlobalSearch.tsx` | L83: `.subcategory` → `.subcategoryId` |
| `src/components/LinkToExistingCardModal.tsx` | L91-94: `.subcategory` → `.subcategoryId` |
| `src/components/mental-skeleton/LearnModal.tsx` | L117-118: `.subcategory` → `.subcategoryId`, `.chapter` → `.chapterId` |
| `src/components/gamification/MonumentInterior.tsx` | L41: ukloni fallback |
| `src/hooks/useSourceHierarchy.ts` | L69, L72: ukloni fallback |
| `src/pages/FrequentErrors.tsx` | L114: `.subcategory` → `.subcategoryId` |
| `src/lib/mnemonic-storage.ts` | L94: ukloni fallback na `.subcategory` |

### 7. Prikaz imena umjesto UUID-a
Gdje god se UUID prikazuje korisniku (SessionHeader, CardList, LearnModal, GlobalSearch, FrequentErrors, LinkToExistingCardModal), koristiti `resolveSubcategoryName` / `resolveChapterName` iz `category-service.ts` za lookup. Komponente koje već imaju `catNameMap` ili `categoryRecords` prop koriste ih za lookup.

---

## Guardrails
- FSRS logika: netaknuta (samo `Card` interfejs, ne `Section` ni algoritam)
- Import backward compatibility: stari JSON sa `subcategory`/`chapter` stringovima se migrira u `subcategoryId`/`chapterId` pri importu
- Export: `subcategoryId`/`chapterId` se eksportuju — stari format više nije podržan za pisanje

## Scope
- ~20 fajlova, ~120 linija promjena
- Nema novih zavisnosti, nema schema promjena

