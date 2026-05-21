# Plan: IDB kao jedini SSOT, RAM kao per-view keš

## Cilj

Preokrenuti trenutnu invariantu: umjesto „RAM (`cardMapStore` + `categoryRecords`) drži cijelu bazu, IDB je log za persist", uvodimo „IDB je istina, RAM je samo materijalizovani prozor za trenutno aktivni view". Time padaju četiri cijela podsistema (cardCommandBus mutex, useCardSyncEffects sa BroadcastChannel sinhronizacijom, useCardAggregates+bucketFingerprint, persistQueue.cleanup() prije čitanja) jer postaju nepotrebni.

Migracija je **inkrementalna, 6 faza, sa feature flag-om**, bez razbijanja postojećeg koda. Svaka faza je samostalno mergable i revertable.

---

## Faza 0 — Temelj: indeksi i query layer (1-2 sedmice)

**Cilj:** dati IDB-u sve indekse koje view-ovi trebaju, da Dexie liveQuery može biti brz koliko i RAM filter.

1. **`db-schema.ts` v12+**: dodati indekse na `cards`:
   - `categoryId`, `subcategoryId`, `chapterId`, `sourceId`
   - kompozitni: `[categoryId+nextReview]`, `[categoryId+status]`, `[categoryId+type]`
   - MultiEntry: `*tags`, `*links`
2. **Novi modul `src/lib/db/queries/cards.ts`**: čisti named queries (`cardsByCategory(id)`, `cardsBySource(id)`, `dueCards(categoryId, limit)`, `cardCount(filter)`). Svaki vraća `liveQuery()` Observable + sinkroni `.toArray()` varijantu.
3. **Migracija postojećeg `db-queries.ts`** — ostaje, ali se interno preusmjerava na nove queries.
4. **Relaksirati Core pravilo**: „No `useLiveQuery` in primary views" → „No `useLiveQuery` for unbounded reads bez indeksa ili `.limit()`". Bez ovoga faze 2-4 su blokirane.
5. **Bench harness** (`src/test/perf/`): script koji puni IDB sa 5k, 20k, 50k kartica i mjeri `cardsByCategory` (liveQuery) vs trenutni `useCardData().cards.filter()`. Cilj: <16ms na 20k kartica.

**Izlaz:** indeksi mergovani, ali nijedan view još ne koristi liveQuery. Zero behavior change.

---

## Faza 1 — Granularni selektori iz RAM-a (1 sedmica)

**Cilj:** prestati koristiti `useCardData().cards.filter(...)` u view-ovima, ali bez napuštanja `cardMapStore`. Ovo je "vežbanje" arhitekture prije nego što IDB postane SSOT.

Dodati u `src/store/` (analogno postojećem `useCardsBySource`):
- `useCardsByCategory(categoryId)`
- `useCardsByChapter(chapterId)`
- `useCardsBySubcategory(subId)`
- `useCardCount(filter)` — vraća samo broj
- `useDueCards(categoryId, limit)` — već filtrirano i sortirano

Svaki koristi `useSyncExternalStore` sa selector funkcijom + stable reference (kao postojeći `useCardsBySource`). Re-render samo kad se *matched set* mijenja.

**Migracioni rad:** zamijeniti sve `useCardData().cards.filter(...)` pozive (oko 30-40 mjesta) na granularne selektore. `useCardData()` ostaje samo za: Backup, GlobalSearch, dijagnostika.

**Izlaz:** view-ovi i dalje čitaju iz RAM-a, ali sa granularnom reaktivnošću. Mjerljivo: re-render count po mutaciji pada 5-10x.

---

## Faza 2 — Dexie-backed selektori iza feature flag-a (2 sedmice)

**Cilj:** paralelna implementacija svakog selektora iz Faze 1, ali sa `liveQuery` iz IDB. Flag `USE_DB_LIVE_SELECTORS` u `app-settings.ts`.

Za svaki Faza-1 selektor, `*FromDb` varijanta:
```ts
// useCardsByCategoryFromDb.ts
export function useCardsByCategory(categoryId: string) {
  const flag = useFeatureFlag("USE_DB_LIVE_SELECTORS");
  return flag ? useLiveQueryCards(categoryId) : useCardsByCategoryRam(categoryId);
}
```

`useLiveQueryCards` koristi `dexie-react-hooks.useLiveQuery` sa kompozitnim indeksom + `.limit(500)`.

**Validacija:** 7-dnevni stability window. Tokom toga, oba sistema rade paralelno; dev tools provjeravaju da li RAM i IDB selektor vraćaju identičan rezultat (shallow-equal po id+updatedAt). Razilaženja logovati u IDB log table.

**Izlaz:** flag default `false` u prod-u, `true` u dev-u. Posle 7 dana bez razilaženja, prebaciti na `true` globalno.

---

## Faza 3 — Pisanja kroz `cardRepository` direktno (1 sedmica)

**Cilj:** uklanjanje `cardMapStore` mutacije iz pisanja. Pisanje ide samo u IDB; `cardMapStore` postaje *cache koji se invalidira*, ne SSOT.

1. **`cardRepository`** dobija `emit(CARDS_UPDATED, {ids})` poslije svake commit operacije (već postoji preko event-bus).
2. **`cardMapStore`** dobija pasivnu subscription na `CARDS_UPDATED`:
   - ako su id-jevi „vrući" (u trenutnom view-u), refetch tih kartica i ažuriraj store
   - ako nisu, samo ih obriši iz store-a (lazy refill kad ih view zatraži)
3. **Ukloniti** sve `setCardMap(prev => ...)` pozive iz `CardActionsProvider`, `useCardCRUD`, `useAutoSplitImport` itd. — sve mutacije idu samo kroz `cardRepository`.
4. **`useCardSyncEffects`** se uprošćava: više nema `persistQueue.cleanup() → bulkGet → applySyncDelta` dance. Postoji samo „IDB changed → invalidate hot ids".

**Izlaz:** RAM je dokazano cache. Ako bi se `cardMapStore` resetovao u runtime-u, view-ovi bi se sami napunili iz IDB.

---

## Faza 4 — Penzionisanje `cardCommandBus` i `useCardAggregates` (1 sedmica)

Sada kad pisanja ne diraju RAM, mutex per-cardId više ne čuva ništa.

1. **`cardCommandBus.dispatch(cmd)`** → `cardRepository.<op>(...)` direktno. Fajl ostaje kao thin shim (jedan red po command type) dok se call sites ne migriraju, pa se briše.
2. **`applySyncDelta` "updatedAt newer-wins"** logika premjestiti u `cardRepository.bulkPut` (već polu-postoji) — to je jedina vrijednost koju bus pruža.
3. **`useCardAggregates` → `useCardCounts`**: agregati (count by category, count by status) idu na Dexie `.count()` sa indeksom, cached za 500ms. `bucketFingerprint`, `buildCardBuckets`, `card-buckets.test.ts` brisati.

**Izlaz:** `src/lib/repositories/cardCommandBus.ts` (116 LOC), `src/contexts/cards/useCardSyncEffects.ts` (90 LOC), `src/contexts/cards/useCardAggregates.ts` (164 LOC), `src/lib/card-buckets.ts` — sve obrisano. ~500 LOC manje + 4 cijele klase grešaka eliminisane.

---

## Faza 5 — Isto za `categoryRecords` i ostale satellite stores (2 sedmice)

Ista logika za:
- `CategoryStateProvider` → `useCategoriesFromDb`, `useCategory(id)`, `useSubcategoriesByParent(catId)`
- `mindmap-storage`, `sources-storage`, `zettelkasten-storage` — već imaju subscribe pattern, samo verifikovati da nigde nema dvostrukog SSOT-a
- `planner-storage` — već ima write mutex, dobro je; samo preraditi čitanja na liveQuery gdje ima smisla

`categoryRecords` Proxy iz `AppContext` se uklanja — distributed actions sada commit-uju u IDB i emit-uju event.

---

## Faza 6 — Branded ID tipovi (paralelno sa fazama 3-5, 1 sedmica)

Ne mijenja runtime, ali zatvara cijelu klasu bug-ova prije nego što arhitektura sazri:

```ts
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type CardId = string & { readonly __brand: "CardId" };
export type SourceId = string & { readonly __brand: "SourceId" };
```

Repository funkcije i selektori uzimaju brandirane tipove. Konverzija `asCategoryId(uuid)` na rubovima (parsing, URL params, IDB read). Postojeći kod nastavlja raditi jer su to subtypes od `string`.

---

## Šta NE diramo

- `categoryDeletionService` (atomska kaskada — radi savršeno)
- `backup-restore` migration ladder, FK remap, per-domain tx
- `cardRepository.applySyncDelta` newer-wins logika (premiješta se, ne briše)
- FSRS algoritam, cramming guard
- Electron `app://localhost`, CSP, DOMPurify
- Vizualni identitet, DM Sans, layout, Zettelkasten UX
- Sve testove osim `card-buckets.test.ts` (taj se briše sa bucketima)

## Rizici i mitigacije

| Rizik | Mitigacija |
|---|---|
| Dexie liveQuery sporiji nego očekivano na velikim dataset-ima | Faza 0 bench prije svega ostalog; ako ne prođe — stajemo |
| Razilaženje RAM ↔ IDB tokom Faze 2 | 7-dnevni dual-read window sa diff log-om |
| Regresije u write-heavy putanjama (auto-split import 1000+ kartica) | Faza 3 zadržava `bulkPut` kao atom; samo se uklanja RAM mutacija |
| `useLiveQuery` u listama sa scroll-om uzrokuje jank | Sve liveQuery sa `.limit()` + virtualizacija (već postoji u `CardList`) |

## Trajanje i isporuke

Ukupno **8-10 sedmica** kalendarski (sa testovima, validacijom, code review).

Svaka faza je mergable samostalno. Posle Faze 1 već ima vidljive performansne dobitke; posle Faze 4 padaju ~500 LOC i 4 podsistema; posle Faze 6 tip-sistem hvata UUID mismatch greške kompajl-time.

## Šta tražim od tebe za odluku

1. **Da li relaksiramo Core pravilo "No `useLiveQuery` in primary views"** na "samo sa indeksom i `.limit()`"? Bez toga staje na Fazi 1.
2. **Faze 0+1 sada, ostalo po dokazanim benchmark-ima?** Ili idemo cijelom putanjom od starta?
3. **Branded ID tipovi (Faza 6)** — vrijedi ti ili je over-engineering za ovaj projekat?
