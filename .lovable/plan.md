

# UUID prikaz umjesto naslova — Audit

## Pronađena narušavanja

Pronašao sam **5 fajlova** gdje se UUID prikazuje korisniku umjesto čitljivog naziva:

### 1. `MnemonicTest.tsx` — 3 mjesta (KRITIČNO)

- **L178**: Dugme za filter kategorije prikazuje `{cat}` — sirovi UUID
- **L203**: Dugme za filter potkategorije prikazuje `{sub}` — sirovi UUID  
- **L355**: Breadcrumb prikazuje `{currentCard.categoryId} / {currentCard.subcategoryId}` — sirovi UUID-ovi

**Fix**: Dodati `useCategoryData()` hook, napraviti `uuidToName` mapu, koristiti za lookup na sva 3 mjesta.

### 2. `CardContextMenu.tsx` — 3 mjesta (SREDNJE)

- **L107**: Kategorija dugme prikazuje `{cat}` — `categories` prop sadrži UUID-ove
- **L118**: Naslov podmjenija prikazuje `{selectedCat}` — UUID
- **L133**: Potkategorija dugme prikazuje `{sub}` — UUID
- **L153**: Glava dugme prikazuje `{ch}` — UUID

**Fix**: Dodati `categoryRecords` prop, napraviti name lookup za sve nivoe.

### 3. `CardViewMode.tsx` — 1 mjesto (NISKO)

- **L389**: Fallback `Glava: {card.chapterId}` kada nema subcategoryId — prikazuje UUID

**Fix**: Koristiti `allCategories` (već dostupan) za chapter name lookup u tom fallback bloku.

### 4. `TextSelectionTooltip.tsx` — prima `category` kao string

- Prop `category` prima UUID iz `card.categoryId` (L82, L96, L158 u CardList/StudyModeFree/StudyModeRecall)
- Koristi se interno za kreiranje mnemonic kartice, **ne prikazuje se korisniku** — ali metadata se čuva sa UUID-om

**Status**: Ne prikazuje UUID korisniku — ali čuva sirove UUID-ove u mnemonic karticama. Nema vizualnog problema, ali treba razmotriti.

## Fajlovi koji ISPRAVNO rade lookup

- `CardList.tsx` — koristi `catNameMap` sa `__sub_` i `__ch_` prefiksima ✅
- `SessionHeader.tsx` — koristi `useCategoryData()` + lookup ✅
- `ReviewCard.tsx` — koristi `useCategoryData()` + lookup ✅
- `WorkshopCardItem.tsx` — koristi `useCategoryData()` + lookup ✅
- `GlobalSearch.tsx` — koristi `uuidToName` mapu ✅
- `SpeedReader.tsx` — koristi `engine.uuidToName` ✅
- `CognitiveAnalytics.tsx` — koristi `catNameMap` prop ✅

## Plan promjena

| Fajl | Promjena | ~Linije |
|------|----------|---------|
| `MnemonicTest.tsx` | Dodati `useCategoryData()`, napraviti uuidToName, zamijeniti 3 prikaza | ~15 |
| `CardContextMenu.tsx` | Dodati `categoryRecords` prop, name lookup za kategorije/potkategorije/glave | ~20 |
| `CardList.tsx` | Proslijediti `categoryRecords` u `CardContextMenu` | ~2 |
| `CardViewMode.tsx` | Fix fallback chapter display L386-391 | ~5 |

## Scope
- 4 fajla, ~40 linija promjena
- Eliminacija svih UUID prikaza u UI-u
- Nema promjene ponašanja

