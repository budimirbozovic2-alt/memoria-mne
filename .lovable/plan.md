

# Deep Audit Tier 2: Lazy Recharts, Pruning, Dekompozicija

## Trenutno stanje

### Recharts — 13 fajlova importuje direktno
Recharts je već lazy-loaded u nekim mjestima (DashboardChart, OverviewTab), ali **11 fajlova** ga još uvijek importuje statički:
- `RetentionChart.tsx`, `ForgettingCurve.tsx`, `DashboardChart.tsx`
- `PredictionTab.tsx`, `EfficiencyTab.tsx`, `LatencyTab.tsx`, `CalibrationTab.tsx`, `ResistanceTab.tsx`
- `RoadmapTab.tsx`, `DisciplineTab.tsx`
- `WeeklyChart.tsx`

Međutim, svi ovi fajlovi su već **lazy-loaded na ruta nivou** (Stats → MyStats → lazy tabovi, Planner → lazy tabovi, Metacognitive → lazy). Dakle recharts se **ne učitava u initial bundle** — tree-shaking i code-splitting već funkcionišu. Jedini problem bi bio ako se `RetentionChart` ili `ForgettingCurve` importuju statički iz eagerly-loaded komponenti.

`OverviewTab` statički importuje `RetentionChart` i `ForgettingCurve` — ali sam OverviewTab je lazy. Zaključak: **recharts lazy-loading je već efektivan** na ruta nivou. Nema potrebe za dodatnim lazy wrapping-om.

### Nekorištene zavisnosti — `dexie-react-hooks`
- Koristi se samo u **2 fajla**: `CategoryView.tsx` i `CategoryMindMaps.tsx`
- Ovo je identifikovano u deep auditu kao SSoT narušavanje (useLiveQuery zaobilazi centralni state)
- Ne može se ukloniti bez zamjene sa event-bus pristupom

### Komponente iznad 400 LOC
- `CardViewMode.tsx` — 503 linija (jedina iznad 400)
- `CardList.tsx` — 455 linija

## Plan

### 1. Dekompozicija `CardViewMode.tsx` (503 LOC → ~3 fajla)

Razdvojiti na:
- **`CardViewMode.tsx`** (~200 LOC) — orkestracija, stanje, filteri
- **`CardViewTable.tsx`** (~150 LOC) — tabela kartica sa expand/collapse
- **`CardViewDialogs.tsx`** (~150 LOC) — Add Card, Bulk Import, Move/Link dijalozi

### 2. Dekompozicija `CardList.tsx` (455 LOC → ~3 fajla)

Razdvojiti na:
- **`CardList.tsx`** (~200 LOC) — virtualizacija, filtriranje, sortiranje
- **`CardRow.tsx`** (~150 LOC) — memo-ized row renderer (trenutno inline)
- **`useCardListFilters.ts`** (~80 LOC) — filter/sort logika (useMemo izvlačenje)

### 3. Eliminacija `useLiveQuery` iz `CategoryMindMaps.tsx`

Trenutno koristi `useLiveQuery` za mind map listu. Zamijeniti sa:
- Direktan `db.mindMaps.where()` poziv u useEffect
- Event bus listener za `MINDMAPS_UPDATED`
- Lokalni state umjesto reactive query

(CategoryView `useLiveQuery` je kompleksniji — ostaviti za zasebnu iteraciju)

### 4. Pruning `dexie-react-hooks`

**Ne može se ukloniti** dok CategoryView koristi useLiveQuery. Ali nakon eliminacije iz CategoryMindMaps, ostaje samo 1 potrošač — priprema za buduće uklanjanje.

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `CardViewMode.tsx` | Smanjiti na ~200 LOC, ekstraktovati tabelu i dijaloge |
| `CardViewTable.tsx` | **NOVI** — tabela kartica |
| `CardViewDialogs.tsx` | **NOVI** — dijalozi za add/bulk/move |
| `CardList.tsx` | Smanjiti na ~200 LOC, ekstraktovati row i filtere |
| `CardRow.tsx` | **NOVI** — memo row renderer |
| `useCardListFilters.ts` | **NOVI** — filter/sort hook |
| `CategoryMindMaps.tsx` | Zamijeniti useLiveQuery sa event-bus |

## Šta se NE radi (i zašto)
- **Lazy recharts**: Već efektivno lazy-loaded kroz ruta code-splitting
- **Uklanjanje `dexie-react-hooks`**: Ostaje 1 potrošač (CategoryView) — premalo za breaking change

## Scope
- 4 postojeća fajla modificirana, 3 nova kreirana
- ~0 LOC neto (redistribucija, ne novi kod)
- Nema promjene ponašanja

