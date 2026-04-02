

# Sljedeće stavke iz deep audita

## Pregled urađenog
- ✅ K4: db.ts reload race condition
- ✅ K2: dupli ready timer
- ✅ K5: localStorage → IDB za backup timestamp
- ✅ db.ts razdvojen na 3 modula
- ✅ MindMapCanvas dekompozicija
- ✅ Diamond handle + textarea fix
- ✅ event-bus.ts cleanup
- ✅ notification optimizacija
- ✅ SRSettingsPanel dekompozicija (4 tab komponente)
- ✅ useCardContext → granularni hookovi
- ✅ CardOrgMode dekompozicija

## Preostale stavke (3 za ovu iteraciju)

### 1. Zamjena `useLiveQuery` sa categoryRecords prop-om (9 fajlova)

**Problem**: 9 komponenti koristi `useLiveQuery` za čitanje kategorija direktno iz Dexie-a, iako su `categoryRecords` već učitani pri boot-u i dostupni kroz kontekst/props. Svaki `useLiveQuery` poziv kreira nezavisni observer koji re-renderuje komponentu na svaku IDB promjenu.

**Pristup**: Zamijeniti `useLiveQuery(() => db.categories...)` sa prop-om ili kontekst hookom `useCategoryData()`. Za komponente koje samo trebaju `catNameMap` — koristiti prop drilling ili memo lookup.

| Fajl | Trenutno | Zamjena |
|------|----------|---------|
| `GlobalSearch.tsx` | `useLiveQuery(() => db.categories.toArray())` | Prima `categoryRecords` kao prop (već prima `cards`) |
| `CardList.tsx` | `useLiveQuery(() => db.categories.toArray())` | Prima `categoryRecords` kao prop |
| `SessionHeader.tsx` | `useLiveQuery(() => db.categories.get(id))` | Prima `categoryRecords` kao prop |
| `ReviewCard.tsx` | `useLiveQuery(() => db.categories.get(id))` | Prima `categoryRecords` kao prop |
| `WorkshopCardItem.tsx` | `useLiveQuery(() => db.categories.get(id))` | Prima `categoryRecords` kao prop |
| `LinkToExistingCardModal.tsx` | `useLiveQuery(() => db.categories.get(id))` | Prima `categoryRecords` kao prop |
| `CategoryMindMaps.tsx` | `useLiveQuery(() => db.mindMaps.where...)` | Zadržati — specifičan query koji nije u boot-u |
| `CategoryView.tsx` | 5× `useLiveQuery` | Zadržati — page-level query za specifičan categoryId |

**Rezultat**: 6 fajlova gubi `dexie-react-hooks` zavisnost. CategoryView i CategoryMindMaps zadržavaju jer rade specifične filtrirane upite.

### 2. Lazy loading RichTextEditor i recharts (bundle optimizacija)

**Problem**: `recharts` (~200KB) se importuje statički u `MetacognitiveCenter.tsx`, `DashboardChart.tsx`, i `OverviewTab.tsx`. `RichTextEditor` (~150KB sa TipTap) se importuje statički u `CardForm.tsx`.

**Pristup**: Zamotati u `lazy()` + `Suspense` sa skeletonom. `OverviewTab` i `DashboardChart` već koriste lazy — samo `MetacognitiveCenter` treba popraviti.

| Fajl | Promjena |
|------|----------|
| `MetacognitiveCenter.tsx` | Zamijeniti statički import recharts komponenti sa `LazyChart` wrapperom ili izdvojiti chart dio u lazy komponentu |
| `CardForm.tsx` | Lazy load `RichTextEditor` sa Suspense fallback |

### 3. Dekomponuj MetacognitiveCenter.tsx (306 linija)

**Problem**: Spaja dnevnik, kalibraciju, time distribution chart, i tab navigaciju u jednu komponentu.

**Pristup**: Izdvojiti diary sekciju i calibration chart u zasebne komponente. Glavni fajl ostaje orchestrator sa Tabs shellom.

| Novi modul | Sadržaj | ~Linije |
|------------|---------|---------|
| `metacognitive/DiarySection.tsx` | Forma za dnevnik, prikaz prethodnih unosa | ~80 |
| `metacognitive/CalibrationChart.tsx` | Time distribution recharts (lazy loaded) | ~60 |
| `MetacognitiveCenter.tsx` | Orchestrator sa Tabs | ~120 |

## Promjene po fajlovima

| Fajl | Promjena |
|------|----------|
| `src/components/GlobalSearch.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| `src/components/CardList.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| `src/components/learn/SessionHeader.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| `src/components/review/ReviewCard.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| `src/components/workshop/WorkshopCardItem.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| `src/components/LinkToExistingCardModal.tsx` | Dodati `categoryRecords` prop, ukloniti useLiveQuery |
| Parent komponente (6 fajlova) | Proslijediti `categoryRecords` prop |
| `src/components/MetacognitiveCenter.tsx` | Dekompozicija + lazy recharts |
| `src/components/CardForm.tsx` | Lazy load RichTextEditor |

## Scope
- ~15 fajlova, ~5-10 linija po fajlu za useLiveQuery zamjenu
- 2 nova fajla za MetacognitiveCenter dekompoziciju
- Eliminacija 6 nezavisnih IDB observera
- Smanjenje initial bundle-a za ~200KB (recharts lazy)
- Nema promjene ponašanja

