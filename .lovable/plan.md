
# Konsolidacija SSOT: Sources & MindMaps (C1 + C2 + W5 + W6)

## Cilj
Jedan izvor istine za `Source` i `MindMapDoc` listu, sa pull-listenerima koji invalidiraju sve potrošače pri svakoj mutaciji. Eliminisati paralelne `useState` kopije i pogrešne event-bus invalidatore.

---

## 1. `src/lib/mindmap-storage.ts` — dodati cache + listener (parnjak Sources)

Refaktor po šablonu `sources-storage.ts`:

- Dodati `_cache: MindMapDoc[] | null` (po-upisu invalidiran).
- Dodati `_listeners: Set<() => void>`, export `onMindMapsChanged(fn): () => void`.
- `loadMindMaps()` koristi `_cache`; ako je null → `db.mindMaps.orderBy("updatedAt").reverse().toArray()` i napuni cache.
- `saveMindMap` / `deleteMindMap`: `_cache = null;` → `await db...` → notify svih listenera.
- Dodati `invalidateMindMapsCache()` (za eksterne mutacije: import/restore).

## 2. Novi hook `src/hooks/useCategorySources.ts` (W5 fix)

```ts
export function useCategorySources(categoryId: string | undefined): Source[]
```

- Interno: `useState<Source[]>([])`, `useEffect(...)` koji:
  - poziva `loadSourcesByCategory(categoryId)` na mount/promijenjeni id,
  - subscribe na `onSourcesChanged(reload)`,
  - cleanup unsubscribe + `cancelled` flag.
- Vraća uvijek svjež scope-ovan niz.

## 3. Novi hook `src/hooks/useMindMaps.ts` (C2 fix)

```ts
export function useMindMaps(): { mindMaps: MindMapDoc[]; ready: boolean }
export function useMindMapsByCategory(categoryId?: string): MindMapDoc[]
```

- `useMindMaps`: `useState<MindMapDoc[]>([])` + subscribe na `onMindMapsChanged`. Inicijalni `loadMindMaps()`.
- `useMindMapsByCategory`: derivat preko `useMemo(filter by categoryId)`.
- (Bez Context-a — module-level cache + listener već daje SSOT semantiku, jeftinije od dodatnog providera.)

## 4. Migrirati potrošače (C2)

Zamijeniti lokalni `useState<MindMapDoc[]>([])` + ručni `loadMindMaps()` poziv sa hookom u sljedećim fajlovima:

- `src/views/SubjectMindMapPage.tsx`
- `src/components/zettelkasten/MindMapPickerDialog.tsx`
- `src/components/zettelkasten/EmbeddedMindMap.tsx` (ostaje per-id `getMindMap`, ali se i ona invalidira preko listener-a → mali helper `useMindMap(id)` koji koristi listener za reload)
- `src/components/category/SourcesTab.tsx`
- `src/components/mindmap/MindMapList.tsx`
- `src/components/subject-cards/MindMapSidePanel.tsx`
- `src/components/GlobalSearch.tsx`

## 5. Migrirati potrošače Sources (W5)

Zamijeniti lokalni `useState<Source[]>` + `loadSourcesByCategory` ručni `useEffect`:

- `src/views/CategoryView.tsx` (linije 31-41) → `const sources = useCategorySources(categoryId);`
- `src/views/SubjectCardsView.tsx` (linije 122, 130-135) → isto. Time `SubjectCardsView` automatski dobija invalidaciju.

## 6. `src/components/GlobalSearch.tsx` — popraviti event domen (W6)

- Ukloniti `cachedSources` / `cachedMindMaps` / `cacheTimestamp` / TTL i `eventBus.subscribe(CARDS_UPDATED, ...)` blok.
- Zamijeniti sa:
  ```ts
  const { mindMaps } = useMindMaps();
  // sources: jednostavan `useState` + onSourcesChanged subscribe (samo kada `open`),
  // ili novi hook `useAllSources()` po istom šablonu kao mindmaps.
  ```
- Bonus: dodati `useAllSources()` (analog `useMindMaps`) u `useCategorySources.ts` da `GlobalSearch` ne mora znati za invalidate detalje.

## 7. Brisanje "ručnog" `invalidateSourcesCache()` poziva nakon save-a

`CategoryView` linije 58-59, 74: `handleSourceUpdated` postaje no-op (notify već šalje `saveSource`/`deleteSource`). Ostaviti samo gdje se zovu eksterne (non-`saveSource`) mutacije.

---

## Tehnički detalji

- Bez novog Context provider-a: module-level cache + Set-listener je već utvrđen šablon (`sources-storage.ts`). Manje preklapanja sa `AppContext`.
- Listener API je **sinkron notify** (postojeći obrazac u `_notify()`); React `setState` inside listener je siguran.
- TTL od 60s u `GlobalSearch` se uklanja — listener garantuje svježinu, cache je permanentan dok ne stigne mutacija.
- `EmbeddedMindMap` koristi `getMindMap(id)`; novi `useMindMap(id)` interno: subscribe na `onMindMapsChanged` → re-load po promjeni.
- Tipovi: `MindMapDoc` već postoji (`@/lib/db`).

## Rizici

- **`MindMapList`** (i drugi) trenutno radi optimističke lokalne update-ove (npr. `setMindMaps(prev => [...])` poslije save). Treba ih ukloniti — listener će sam re-load-ovati. Provjera u svakoj migraciji.
- `EmbeddedMindMap` u render listi (Zettelkasten) — listener može prouzrokovati N re-fetch-ova; mitigacija: jedan modul-cache hit po pozivu `getMindMap` ne ide u IDB ako koristimo `_cache.find(...)`. Dodati helper `getMindMapCached(id)` u `mindmap-storage.ts`.

## Bez izmjena

- `db.ts`, schema, sync, FSRS, AppContext, CardData/CardActions provider.
- Osim popravki `handleSourceUpdated`, semantika sačuvana 1:1.

## Acceptance

- Preimenovanje izvora u `SourcesTab` se vidi odmah u `SubjectCardsView` source filteru bez remount-a.
- Brisanje mind mape u `MindMapList` nestaje iz `MindMapPickerDialog` i `MindMapSidePanel` bez zatvaranja.
- Pretraga `Ctrl+K` poslije rename source-a vraća novi naslov bez čekanja 60s.
- Nema više `cachedSources` / `cachedMindMaps` / `CACHE_TTL` u `GlobalSearch`.
