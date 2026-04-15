

# Deep Audit: Kompletna Arhitektura — Runda 3

## Rezime

Prethodne runde su pokrile Electron, renderer memory leakove, i prvu grupu arhitektonskih nalaza (I1, I2, G1-G3, B1, O1-O3). Ova runda fokusira se na **nove probleme** koji su prethodno preskočeni. Pronašao sam **7 konkretnih problema** — 2 integritetna, 2 logička, 2 performansna, i 1 sigurnosni.

---

## INTEGRITET PODATAKA

### I1. `deleteCategory` — `fallbackId` se koristi asinhrono PRIJE nego što `optimisticCategoryUpdate` garantovano izvrši updater

**Fajl:** `useCategoryManagement.ts:67-119`

**Problem:** `deleteCategory` poziva `optimisticCategoryUpdate` koji interno koristi `setCategoryRecords(prev => ...)` — React odlaže izvršavanje ovog updatera. Odmah nakon toga, kod koristi `fallbackId` (linija 80-118) za prebacivanje kartica i izvora. Ali `fallbackId` se postavlja UNUTAR React updater-a (linija 75), koji se možda još nije izvršio kad se dođe do linije 84-118.

**Rizik:** U praksi React obično izvršava updater sinhrono unutar event handlera, ali u `useCallback` koji se poziva iz async konteksta (npr. nakon confirm dialoga), React može batchovati i odložiti. U tom slučaju `fallbackId` ostaje prazan string, i sve kartice dobiju `categoryId: ""` — postaju siročad.

**Fix:** Izračunati `fallbackId` PRIJE poziva `optimisticCategoryUpdate`, čitanjem iz `getCategoryRecords()`:
```ts
const deleteCategory = useCallback((categoryId: string, purgeCards = false) => {
  const currentRecs = getCategoryRecords();
  const remaining = currentRecs.filter(r => r.id !== categoryId);
  const fallbackId = remaining.length > 0 ? remaining[0].id : "";
  
  optimisticCategoryUpdate(setCategoryRecords, prev => prev.filter(r => r.id !== categoryId), "deleteCategory");
  // ... rest uses pre-computed fallbackId
}, [...]);
```

### I2. `optimisticCategoryUpdate` rollback koristi stale snapshot

**Fajl:** `category-service.ts:17-41`

**Problem:** `rollbackSnapshot` se hvata unutar `setCategoryRecords(prev => ...)`. Ako mutex zadatak kasni (npr. IDB je spor), a korisnik napravi DRUGU mutaciju u međuvremenu, `rollbackSnapshot` je zastarjeli state. Rollback bi vratio stanje PRIJE obje promjene — gubeći drugu promjenu koja je uspješno prošla.

**Fix:** Rollback treba koristiti fresh read iz IDB-a umjesto snapshotovanog React stanja:
```ts
catch (e) {
  console.error(`[${label}] IDB persist failed, rolling back`, e);
  const freshFromIdb = await idbLoadCategories();
  setCategoryRecords(freshFromIdb);
  toast.error("Greška", { description: "Promjena nije sačuvana." });
}
```

---

## LOGIČKE GREŠKE

### G1. `reviewLog` raste neograničeno u React stanu — nikad se ne trunca

**Fajl:** `useCardAnnotations.ts:60`

**Problem:** Svaki review dodaje entry u `reviewLog` state array:
```ts
setReviewLog((log) => [...log, entry]);
```
Bootstrap učitava samo 90 dana (`idbLoadRecentReviewLog(90)`), ali tokom jedne sesije korisnik može napraviti stotine review-ova. Array se nikad ne čisti dok se aplikacija ne restartuje. Za korisnika sa 3000+ kartica koji radi intenzivne sesije, ovaj array može narasti na 10K+ entryja u memoriji, usporavajući sve `useMemo` derivacije koje ga koriste.

**Fix:** Dodati cap na in-memory reviewLog — držati max 5000 entryja, trimovati najstarije:
```ts
setReviewLog((log) => {
  const next = [...log, entry];
  return next.length > 5000 ? next.slice(-5000) : next;
});
```

### G2. `mapToArray` cache se invalidira globalno — nema per-consumer granularnosti

**Fajl:** `persist-queue.ts:17-29`

**Problem:** `_mapVersion` i `_cachedArray` su module-level singletoni. `bumpMapVersion()` se poziva nakon SVAKE mutacije (add, delete, patch, bulk). Ali `mapToArray()` vraća `Object.values(map)` — novi array svaki put kad se version promijeni. Ovo znači da `useMemo(() => mapToArray(cardMap), [cardMap])` u `useCards.ts:57` UVIJEK kreira novi array jer `cardMap` se mijenja na svaku mutaciju (spread operator u `patchCard`).

Cache je efektivno beskoristan jer se `cardMap` referenca mijenja istovremeno sa `_mapVersion`. Jedini slučaj kad bi cache pomogao je višestruki poziv `mapToArray` sa istim mapom u istom renderingu — ali to se ne dešava.

**Rizik:** Nizak — ovo je propuštena optimizacija, ne bug. Ali za 5000+ kartica, `Object.values()` na svaki render košta ~1ms.

**Fix:** Koristiti `useMemo` sa deep comparison umjesto cache-a, ili prihvatiti da je O(n) neizbježan pri promjeni mape.

---

## PERFORMANSE

### P1. `getCategoryStats` u `spaced-repetition.ts` je O(n) po kategoriji — ali se ne koristi

**Fajl:** `spaced-repetition.ts:366-372`

**Problem:** `getCategoryStats()` filtrira SVE kartice za jednu kategoriju. Ali u `useCards.ts:158-231`, postoji optimizirani single-pass koji računa `categoryStats` za sve kategorije odjednom. `getCategoryStats` se exportuje ali se NE KORISTI nigdje u aplikaciji (pretraga po projektu potvrđuje). Ovo je mrtav kod.

**Fix:** Ukloniti `getCategoryStats` i `getStats` iz exporta — već su zamijenjeni inline single-pass implementacijom.

### P2. `cardCountByCategory` se rekonstruiše na svaku mutaciju kartica

**Fajl:** `useCards.ts:165-177`

**Problem:** `useMemo` blok (linija 158-232) se re-evaluira na svaku promjenu `cards` ili `categories`. Unutra se gradi `countByCategory` Record. Za operacije poput `patchCard` (koja samo mijenja jednu karticu), cijeli single-pass se restartuje — uključujući sortiranje `dueCards`, iteraciju svih sekcija, itd. Za 5000 kartica ovo je ~5-10ms na svaku ocjenu.

**Fix:** Razdvojiti `dueCards` (koje ovise o `cards`) od `cardCountByCategory` (koji se može cachirati separatno). Alternativno, koristiti incremental update pattern za count.

---

## SIGURNOST

### S1. `localStorageData` import ne filtrira ključeve

**Fajl:** `useCardImport.ts:292-296`

**Problem:**
```ts
if (data.localStorageData && typeof data.localStorageData === "object") {
  for (const [key, value] of Object.entries(data.localStorageData as Record<string, unknown>)) {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  }
}
```
Ovo piše BILO KOJI ključ u localStorage iz importovanog JSON fajla. Napadač može pripremiti backup fajl sa malicioznim ključevima koji prepisuju:
- `sidebar-state` → prisilno zatvaranje sidebara
- Bilo koji custom ključ koji aplikacija čita na boot-u

**Fix:** Dozvoliti samo whitelistane ključeve:
```ts
const ALLOWED_LS_KEYS = new Set([
  "codex-app-settings", "codex-source-registry", "codex-monument-types",
  "sr-planner", "sr-mnemonic-system",
]);
for (const [key, value] of Object.entries(data.localStorageData)) {
  if (!ALLOWED_LS_KEYS.has(key)) continue;
  localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}
```

---

## Šta je DOBRO (ne treba mijenjati)

- Context dekompozicija (Card/Category/Review/Pomodoro) — sprečava kaskadne re-rendere
- Proxy-based actions — stabilna referenca, nikad ne uzrokuje re-render
- Ref-Delta pattern — sinhrona mutacija ref-a prije async persist-a
- Mutex u category-service — serijalizacija IDB upisa
- Surgical persist queue sa visibility change flush
- Boot timeout chain (panic 8s → splash 10s) — nikad ne blokira UI
- EventBus HMR cleanup — sprečava BroadcastChannel akumulaciju
- Lazy loading svih route stranica + teških biblioteka

---

## Scope implementacije

**Prioritet 1 (kritično, ~30min):**
- I1: Pre-compute `fallbackId` u `deleteCategory` (~5 linija)
- S1: Whitelist za `localStorageData` import (~8 linija)
- I2: Rollback iz IDB umjesto stale snapshot (~3 linije)

**Prioritet 2 (optimizacija, ~20min):**
- G1: Cap reviewLog na 5000 entryja (~3 linije)
- P1: Ukloniti mrtav kod `getCategoryStats`/`getStats` (~15 linija)

**Prioritet 3 (nice-to-have):**
- P2: Razdvajanje dueCards od countByCategory — veći refaktor
- G2: mapToArray cache cleanup — minimalan uticaj

Ukupno: **4 fajla** za Prioritet 1+2.

