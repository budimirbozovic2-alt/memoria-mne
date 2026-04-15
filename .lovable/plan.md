

# Deep Audit: Kompletna Arhitektura — Runda 4

## Rezime

Fokus ove runde su aspekti koji do sada NISU bili predmet analiza: metacognitive/planner storage pattern, coverage analysis, import transakcijski integritet, HealthMonitor, TTS modul, useStatsData performanse, i nepokriven runtime error. Pronašao sam **9 konkretnih problema** — 3 integritetna, 2 performansna, 2 logička, 1 memory leak, i 1 reliability.

---

## RUNTIME ERROR (AKTIVAN)

### E1. HMR izaziva "useCardData must be used within CardProvider"
**Problem:** Runtime errors pokazuju da `AppSidebar` i `Breadcrumbs` padaju prilikom HMR refresha jer React Refresh remountira komponente van CardProvider stabla. Ovo se dešava samo u dev modu (stack trace sadrži `performReactRefresh`), ali za razvoj je ometajuće — svaki save u `AppContext.tsx` razbija UI.

**Fix:** Dodati defensive check u `useCardData` i `useCategoryData` hookove — umjesto throw-a, vratiti fallback vrijednosti kad je context `null`:
```ts
export function useCardData() {
  const ctx = useContext(CardStateContext);
  if (!ctx) {
    if (import.meta.env.DEV) console.warn("useCardData: no provider, returning empty fallback");
    return EMPTY_CARD_STATE; // { cards: [], dueCards: [], stats: ... }
  }
  return ctx;
}
```
Alternativa: zaštititi samo u DEV modu da se sačuva strictnost u produkciji.

---

## INTEGRITET PODATAKA

### I1. `importData` — nema transakcije oko kartica + kategorija + izvora
**Fajl:** `useCardImport.ts:77-246`

**Problem:** Import obavlja 6 odvojenih IDB operacija: (1) clear cards, (2) bulkPut cards, (3) clear categories, (4) bulkPut categories, (5) bulkPut sources, (6) clear/add review log. Ako browser crash-ne ili korisnik zatvori tab između koraka 2 i 4, baza ostaje u nekonzistentnom stanju — kartice referišu kategorije koje ne postoje.

**Fix:** Wrapovati kritične korake u jednu Dexie transakciju:
```ts
await db.transaction("rw", [db.cards, db.categories, db.sources, db.reviewLog], async () => {
  // All clears + puts inside single transaction
});
```

### I2. `HealthMonitor.handleCleanOrphans` — direktno piše u IDB, zaobilazi in-memory cardMap
**Fajl:** `HealthMonitor.tsx:114-136`

**Problem:** `db.cards.update(id, { categoryId: fallbackId })` mijenja IDB direktno, bez ažuriranja React state-a u `useCards`. `eventBus.emit(CARDS_UPDATED)` triggeruje full reload koji popravlja stvar, ali postoji vremenski prozor (dok reload ne završi) u kojem in-memory cardMap ima stare `categoryId` vrijednosti. Ako korisnik u tom prozoru napravi review, `patchCard` će zapisati stari `categoryId` nazad u IDB — poništavajući cleanup.

**Fix:** Umjesto direktnog `db.cards.update`, koristiti `patchCard` iz AppContext (zahtijeva refaktor da HealthMonitor primi akcije), ili dodati `await` na eventBus handler da sačeka reload.

### I3. Metacognitive cache-ovi rastu neograničeno tokom sesije
**Fajl:** `metacognitive-storage.ts:100,126,265`

**Problem:** `addCalibrationEntry`, `addLatencyEntry`, i `addActivityEntry` sve rade `_cache = [..._cache, entry]` — nikad ne trimaju. Za korisnika koji napravi 200+ review-ova u jednoj sesiji, `_calibrationCache` i `_latencyCache` rastu linearno. Bootstrap učitava samo 90 dana, ali jednodnevna sesija može dodati stotine entryja. Ovo pogađa `getTimeDistribution` i `getDeepWorkStats` koji iteriraju cijeli cache.

**Fix:** Dodati cap (npr. 2000 entryja) ili trimovati entryje starije od 90 dana iz cache-a:
```ts
export function addCalibrationEntry(entry: CalibrationEntry) {
  _calibrationCache.push(entry);
  if (_calibrationCache.length > 2000) _calibrationCache = _calibrationCache.slice(-2000);
  db.calibrationLog.add(entry).catch(...);
}
```

---

## PERFORMANSE

### P1. `useStatsData.activityData` — O(n×14) iteracija za svaki dan
**Fajl:** `useStatsData.ts:59-69`

**Problem:** Za svaki od 14 dana, `reviewLog.filter()` i `cards.filter()` skeniraju CIJELI array. Sa 10K review entryja × 14 dana = 140K iteracija. Plus `cards.filter()` za `createdAt` (5K × 14 = 70K).

**Fix:** Pre-buildati Map po danu u jednom prolazu:
```ts
const reviewByDay = new Map<string, number>();
for (const r of reviewLog) {
  const day = format(new Date(r.timestamp), "dd.MM");
  reviewByDay.set(day, (reviewByDay.get(day) || 0) + 1);
}
```

### P2. `getMnemonicStats` — 4 odvojena filtera umjesto jednog prolaza
**Fajl:** `mnemonic-storage.ts:263-273`

**Problem:** `cards.filter()` se poziva 4 puta za isti array (new, in-workshop, ready, testCount>0). Za 500+ mnemoničkih kartica, to je 2000 iteracija umjesto 500.

**Fix:** Jedan prolaz sa switch:
```ts
let newCount=0, workshopCount=0, readyCount=0;
for (const c of cards) {
  if (c.mnemonicStatus === "new") newCount++;
  else if (c.mnemonicStatus === "in-workshop") workshopCount++;
  else readyCount++;
}
```

---

## LOGIČKE GREŠKE

### G1. `loadSources` vraća stale cache nakon `saveSource` u drugom tabu
**Fajl:** `sources-storage.ts:55-60`

**Problem:** `loadSources()` koristi in-memory `_cache`. Kad se izvor sačuva u tabu A, `_cache` se nullira i `_notify()` obavještava lokalne listenere. Ali tab B nikad ne nullira svoj `_cache` — nema cross-tab invalidaciju za sources. EventBus ima `CARDS_UPDATED` ali ne i `SOURCES_UPDATED`.

**Rizik:** Nizak za Electron (uglavnom jedan prozor), ali ako korisnik otvori dva taba u browseru, tab B vidi stale izvore dok se ne refreshuje.

**Fix:** Dodati `SOURCES_UPDATED` event u EventBus i subscribovati se u sources-storage za invalidaciju. Ili prihvatiti kao known limitation za desktop-only app.

### G2. `coverage-analysis.ts` cache nikad ne invalidira po promjeni kartica
**Fajl:** `coverage-analysis.ts:121-127`

**Problem:** Cache key koristi `sourceId + htmlContent.length + coverageSignature`. `coverageSignature` se gradi od linked kartica. Kad korisnik obriše karticu ili promijeni `originalSourceSnippet`, coverage se ne re-kalkuliše dok se ne promijeni `sourceHtmlContent` ili dok se ne pozove `invalidateCoverageCache`. Ali `invalidateCoverageCache` se nigdje ne poziva automatski nakon card delete/update.

**Fix:** Pozivati `invalidateCoverageCache(sourceId)` u `deleteCard` kad obrisana kartica ima `sourceId`, i u `patchCard` kad se mijenja `originalSourceSnippet`.

---

## MEMORY LEAK

### M1. `EventBus.beforeunload` listener se nikad ne čisti
**Fajl:** `event-bus.ts:64-66`

**Problem:** `window.addEventListener("beforeunload", ...)` u konstruktoru se ne čisti u `destroy()`. U HMR scenariju, svaki hot reload kreira novi EventBus (star se destroyira), ali `beforeunload` handler ostaje jer `destroy()` ne uklanja window listener.

**Fix:** Sačuvati referencu i ukloniti u `destroy()`:
```ts
private _beforeUnloadHandler: (() => void) | null = null;
// u konstruktoru:
this._beforeUnloadHandler = () => this.emit(EVENT_TYPES.TAB_LEAVING, { sourceTabId: TAB_ID });
window.addEventListener("beforeunload", this._beforeUnloadHandler);
// u destroy():
if (this._beforeUnloadHandler) window.removeEventListener("beforeunload", this._beforeUnloadHandler);
```

---

## RELIABILITY

### R1. `useDeferredCompute` guta greške iz async computacija
**Fajl:** `useDeferredCompute.ts:18-19`

**Problem:** `val.then((resolved) => { ... })` nema `.catch()`. Ako `compute()` vrati rejected Promise, greška se gubi — `result` ostaje `null` zauvijek. Komponente koje koriste ovu vrijednost (Dashboard widgeti) prikazuju loading stanje koje nikad ne nestane.

**Fix:** Dodati catch handler:
```ts
val.then((resolved) => { if (!cancelled) setResult(resolved); })
   .catch((err) => { console.warn("[useDeferredCompute] async error", err); });
```

---

## Šta je DOBRO (neauditivno do sada)

- Planner storage ima čist cache/IDB dual-write pattern
- Mnemonic migration je transakcijska (all-or-nothing)
- DOCX import koristi Web Workere — ne blokira UI
- Coverage analysis ima bounded cache (max 20)
- Source delete koristi transakciju za atomsko brisanje
- TTS modul pravilno sanitizira HTML prije govorenja
- Export koristi chunked JSON serialization za velike backupe

---

## Scope implementacije

**Prioritet 1 (kritično, ~30min):**
- E1: Defensive fallback u context hookovima za HMR stabilnost (~10 linija)
- R1: Error handling u useDeferredCompute (1 linija)
- I3: Cap metacognitive cache-ove (3×2 linije)
- M1: Cleanup beforeunload u EventBus.destroy (~5 linija)

**Prioritet 2 (integritet, ~30min):**
- I1: Transakcija za import (wrap existing code u `db.transaction`)
- G2: Auto-invalidacija coverage cache-a nakon card mutacija (~5 linija)

**Prioritet 3 (optimizacija, ~15min):**
- P1: Single-pass Map u useStatsData.activityData
- P2: Single-pass u getMnemonicStats

**Prioritet 4 (nice-to-have):**
- I2: HealthMonitor cleanup kroz AppContext akcije (veći refaktor)
- G1: Cross-tab source invalidacija (low priority za Electron)

Ukupno: **6-7 fajlova** za Prioritet 1+2.

