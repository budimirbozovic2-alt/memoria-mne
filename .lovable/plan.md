

## Plan: SubjectDashboard sa Workflow karticama, Prikazom Znanja i Kontekstualnim Alatima

### Pregled

Proširiće se `SubjectDashboard.tsx` iz placeholder-a u funkcionalni dashboard za jedan predmet, sa tri sekcije:

1. **Integrisani Workflow Učenja** — 5 vizuelno distinktnih kartica
2. **Prikaz Znanja** — progress barovi po potkategorijama/glavama iz postojećih podataka
3. **Kontekstualni Alati** — pristupne tačke za Speed Reader, Mentalne mape i Mnemoničke kuke, scoped na `categoryId`

### Sekcija 1: Integrisani Workflow Učenja

Pet `glass-card` kartica u gridu (`grid-cols-5` na desktop-u, `grid-cols-2` + `col-span-full` na manjim):

| # | Naziv | Ikona | Link | Opis |
|---|-------|-------|------|------|
| 1 | Slobodno istraživanje | `Compass` | `/category/{categoryId}` (postojeći CategoryView sa izvorima) | "Čitaj izvore, pravi kartice" |
| 2 | Pasivno čitanje | `/subject/{categoryId}/speed-reader` (nova ruta) | `BookOpen` | "Brzo čitanje kartica i izvora" |
| 3 | Aktivno prisjećanje | `/learn?cat={categoryId}` | `Brain` | "Učenje i testiranje znanja" |
| 4 | Lokalna Konsolidacija | `/review?cat={categoryId}` | `RefreshCw` | "Ponavljanje dospjelih kartica" |
| 5 | Globalna Konsolidacija | `/review` | `Globe` | "Ponavljanje svih predmeta" |

Korake 3, 4 i 5 linkuju na postojeće `/learn` i `/review` rute. Kategorija se prosljeđuje kao query parametar `cat` koji se može koristiti za automatski pre-select filtera (odvojena buduća iteracija — za sada samo navigira).

### Sekcija 2: Prikaz Znanja

Koristi `useCardData()` i `useCategoryData()` za izračunavanje progresa po potkategorijama i glavama za dati `categoryId`:

- Filtriraj `cards` po `card.categoryId === categoryId`
- Grupiši po `subcategoryId` (mapiraj UUID na ime iz `categoryRecords`)
- Za svaku grupu izračunaj:
  - Ukupan broj kartica
  - Prosječni mastery level koristeći `getCardMasteryLevel()` iz `src/lib/mastery.ts`
  - Procenat "naučenih" sekcija (state !== New)
- Renderuj `Progress` bar za svaku potkategoriju sa brojem kartica i procentom
- Ako potkategorija ima glave, prikažu se ugniježdeno (indent) ispod
- Koristi boje iz `getMasteryColor()` za progress indikator

### Sekcija 3: Kontekstualni Alati

Tri kartice u `grid-cols-3`:

| Alat | Ikona | Akcija |
|------|-------|--------|
| Speed Reader | `Zap` | Navigira na `/subject/{categoryId}/speed-reader` |
| Mentalne mape | `GitBranch` | Navigira na `/subject/{categoryId}/mind-maps` |
| Mnemoničke kuke | `Brain` | Navigira na `/subject/{categoryId}/mnemonics` |

Za sada, ove rute će biti registrovane u `App.tsx` kao wrapper stranice koje proslijeđuju `categoryId` kao prop ili ga čitaju iz URL-a. Postojeće globalne rute (`/speed-reader`, `/mind-map`, `/mnemonics`) ostaju netaknute.

### Nove rute u App.tsx

Tri nove rute koje renderuju postojeće komponente sa pre-selected `categoryId`:

```
/subject/:categoryId/speed-reader → SpeedReaderPage sa initialCategoryId prop
/subject/:categoryId/mind-maps → MindMapPage sa categoryId filter
/subject/:categoryId/mnemonics → MnemonicPage sa categoryId filter
```

Wrapper komponente čitaju `categoryId` iz `useParams()` i proslijeđuju ga kao prop.

### Izmjene u postojećim komponentama

**`SpeedReader.tsx` / `useSpeedReaderEngine.ts`:**
- Dodati opcioni `initialCategoryId?: string` prop u `useSpeedReaderEngine`
- Ako je proslijeđen, `selCat` se inicijalizuje na tu vrijednost umjesto `null`
- Postojeće globalno ponašanje ostaje kad prop nije proslijeđen

**`MindMapList.tsx`:**
- Dodati opcioni `categoryId?: string` prop
- Kad je proslijeđen, filtrirati `maps` po `categoryId` polju (ako MindMapDoc ima categoryId)
- Pošto MindMapDoc nema `categoryId`, za sada proslijediti kao naslovnu informaciju i prikazati "Mape za {categoryName}" header

**`MnemonicModule.tsx`:**
- Ne treba promjena — mnemoničke kartice su globalne po dizajnu
- Wrapper stranica samo dodaje back navigaciju na `/subject/{categoryId}`

### Fajlovi

| Fajl | Akcija |
|------|--------|
| `src/views/SubjectDashboard.tsx` | Potpuni redizajn — 3 sekcije, ~200 linija |
| `src/App.tsx` | +3 nove rute za kontekstualne alate |
| `src/hooks/useSpeedReaderEngine.ts` | +1 opcioni prop `initialCategoryId`, 2 linije |
| `src/components/SpeedReader.tsx` | Proslijediti prop iz page → engine |
| `src/views/SpeedReaderPage.tsx` | Dodati opcioni `categoryId` prop, proslijediti |

**Ukupno: 5 fajlova. 0 uklonjenih funkcionalnosti. Globalni alati ostaju netaknuti.**

