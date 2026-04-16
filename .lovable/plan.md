

# Deep Audit: Kompletna Arhitektura — Runda 5

## Rezime

Fokus ove runde su aspekti koji NISU pokriveni u prethodne 4 runde: routing edge cases, session lifecycle, lazy loading gaps, View/Router dual-state, import atomičnost, i nepokriveni error paths. Pronašao sam **8 konkretnih problema** — 3 routing/navigacija, 2 session lifecycle, 1 lazy loading, 1 edge case, i 1 dead path.

---

## ROUTING & NAVIGACIJA

### R1. EditPage bez `editingCard` prikazuje prazan CardForm
**Fajl:** `EditPage.tsx:7-60`

**Problem:** Ako korisnik navigira direktno na `#/edit` (npr. bookmark, browser back, ili refresh), `editingCard` je `null` — React state se ne persistira. `CardForm` prima `editCard={null}` i prikazuje prazan formular za kreiranje, ali sa `onSave` koji je no-op (`() => {}`). Korisnik može popuniti formular i kliknuti "Sačuvaj" — ništa se ne dešava, bez error poruke.

**Fix:** Dodati guard u `EditPage` — ako `editingCard` je `null`, redirect na dashboard:
```tsx
if (!editingCard) {
  return <Navigate to="/" replace />;
}
```

### R2. `setView` i `window.location.hash` koegzistiraju — dva navigaciona mehanizma
**Fajl:** `EditPage.tsx:23`, `CardForm.tsx:49`, `useSourceReaderActions.ts:363`

**Problem:** Tri fajla koriste `window.location.hash = "#/category/..."` umjesto React Router `navigate()`. Ovo zaobilazi React Router history stack — back dugme se ponaša nepredvidivo. `setView()` koristi `navigate()` internalno, ali `window.location.hash` direktno manipuliše URL.

**Fix:** Zamijeniti sve `window.location.hash` pozive sa `navigate()` iz React Routera:
```tsx
// Umjesto: window.location.hash = `#/category/${catId}`;
navigate(`/category/${catId}`);
```
Tri instance: `EditPage.tsx:23`, `CardForm.tsx:49`, `useSourceReaderActions.ts:363`.

### R3. `NotFound` stranica nije lazy-loaded — jedina eagerly-imported route page
**Fajl:** `App.tsx:13`

**Problem:** Sve ostale stranice koriste `lazy(() => import(...))`, ali `NotFound` je direktan import: `import NotFound from "./pages/NotFound"`. Ovo dodaje NotFound komponentu u main bundle čak i kad korisnik nikad ne pogodi 404. Mala ali nepotrebna razlika u patternu.

**Fix:** `const NotFound = lazy(() => import("./pages/NotFound"));` i ukloniti direktan import.

---

## SESSION LIFECYCLE

### S1. `startSession` u LearnPage/ReviewPage se poziva samo jednom — ne reaguje na promjenu kartica
**Fajl:** `LearnPage.tsx:16-19`, `ReviewPage.tsx:20-23`

**Problem:**
```tsx
useEffect(() => {
  if (ready) session.startSession(cards, reviewLog);
}, [ready]);
```
Snapshot se pravi samo kad `ready` postane `true`. Ako korisnik otvori Learn, vrati se na Dashboard, kreira nove kartice, pa opet otvori Learn — snapshot JE zastarjeli jer `ready` se nije promijenio (ostaje `true`). Komponenta se remountira (novi `useEffect`), ali `cards` se čita iz trenutnog render-a — što JESTE fresh. Zapravo, ovo radi korektno jer remount triggeruje novi `useEffect` sa fresh `cards`. Ovaj nalaz je **false positive** — validan je.

### S2. `SessionContext.endSession` ne čeka da `flushReviews` završi
**Fajl:** `SessionContext.tsx:82-118`

**Problem:** `endSession` poziva `flushReviews(reviews)` sinhrono (linija 101), ali `flushReviews` u LearnPage je no-op (`(_reviews) => {}`). Prave mutacije se dešavaju inline u `handleReviewSection` — ne u batch flush-u. `endSession` čeka samo `persistQueue.flush()`, ali ako persist queue ima pending actions od inline mutacija, ovo JE korektno. Međutim, `isProcessing` overlay se prikazuje 600ms + 1800ms animacija = 2.4s NAKON što je sve već sačuvano. Overlay je kozmetički, ali blokira UI nepotrebno dugo.

**Fix:** Smanjiti `setTimeout` u `endSession` sa 600ms na 200ms, i `ProcessingOverlay` animaciju sa 1800ms na 800ms.

---

## EDGE CASES

### E1. `importData` overwrite ne koristi Dexie transakciju — parcijalni import moguć
**Fajl:** `useCardImport.ts:77-317`

**Problem:** Ovo je isti nalaz kao I1 iz Runde 4 koji je odobren ali NIJE implementiran. Import overwrite izvršava ~15 odvojenih IDB operacija (clear cards, bulkPut cards, clear categories, bulkPut categories, bulkPut sources, clear reviewLog, bulkAdd reviewLog, plus 7+ metacognitive tabela). Crash ili tab close između koraka ostavlja bazu u nekonzistentnom stanju.

**Fix:** Grupirati kritične operacije (cards + categories + sources) u jednu Dexie transakciju:
```tsx
await db.transaction("rw", [db.cards, db.categories, db.sources], async () => {
  await db.cards.clear();
  await db.cards.bulkPut(importedCards);
  await db.categories.clear();
  await db.categories.bulkPut(catRecords);
  if (sanitizedSources.length) await db.sources.bulkPut(sanitizedSources);
});
```

### E2. `handleOpenCoveredCard` navigira na `/categories` umjesto na specifičnu kategoriju
**Fajl:** `useSourceReaderActions.ts:361-364`

**Problem:**
```ts
sessionStorage.setItem("sr-scroll-to-card", cardId);
window.location.hash = "#/categories";
```
Korisnik klikne na covered card u Source Reader-u — navigira se na CategoriesPage (lista svih kategorija), NE na CategoryView specifične kategorije. `sr-scroll-to-card` sessionStorage key se čita negdje, ali korisnik prvo mora ručno kliknuti na kategoriju. Trebao bi navigirati direktno na `/category/{categoryId}`.

**Fix:** Koristiti `navigate` i dodati categoryId:
```ts
const handleOpenCoveredCard = useCallback((cardId: string) => {
  const card = cards.find(c => c.id === cardId);
  if (card) {
    sessionStorage.setItem("sr-scroll-to-card", cardId);
    navigate(`/category/${card.categoryId}`);
  }
}, [cards, navigate]);
```

---

## LAZY LOADING

### L1. `ProcessingOverlay` eager-importuje `framer-motion` — uvijek u bundle
**Fajl:** `ProcessingOverlay.tsx:2`, `App.tsx:10`

**Problem:** `ProcessingOverlay` se renderuje unutar `MainLayout` (linija `App.tsx:76`) na SVAKOJ stranici. Importuje `motion` i `AnimatePresence` iz `framer-motion`. Ovo znači da `framer-motion` (~40KB gzipped) je u critical path za SVAKI page load, čak i kad korisnik nikad ne otvori sesiju. Prethodna runda (O1) je uklonila framer-motion iz Dashboard widgeta, ali ProcessingOverlay ga i dalje vuče u main chunk.

**Fix:** Lazy-loadovati `ProcessingOverlay` ili zamijeniti framer-motion sa CSS animacijama (overlay je simple fade-in/out + scale):
```tsx
// CSS zamjena:
<div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
```

---

## DEAD PATH

### D1. `Breadcrumbs` referišu `/mnemonic` ali ruta je `/mnemonics`
**Fajl:** `Breadcrumbs.tsx:18`

**Problem:** `ROUTE_LABELS` sadrži `"/mnemonic": "Mnemo radionica"`, ali ruta je `/mnemonics` (sa `s`). Redirect `<Navigate to="/mnemonics" replace />` postoji u App.tsx, ali ako korisnik je na `/mnemonics`, breadcrumb ne prikazuje label jer key ne matchuje. Breadcrumb za Mnemo radionicu nikad se ne prikazuje.

**Fix:** Promijeniti key u `ROUTE_LABELS` na `"/mnemonics"`.

---

## Šta je DOBRO (nepokriveno do sada)

- `CategoryViewWrapper` sa `key={categoryId}` — čist remount, nema state leakage
- `Suspense` fallback sa `PageSkeleton` — dobar UX za lazy route loading
- `HashRouter` — kompatibilan sa Electron `file://` protokolom
- `ErrorBoundary` na svakoj ruti — granularna izolacija grešaka
- Session snapshot pattern — sprečava mutation tokom review-a
- `sessionStorage` za ephemeral navigation state (edit return view)
- `useLiveQuery` samo za sources u CategoryView — minimalan Dexie observer footprint
- Zustand store za SourceReader — izolacija re-rendera

---

## Scope implementacije

**Prioritet 1 (kritično, ~20min):**
- R1: Guard u EditPage za null editingCard (~3 linije)
- R2: Zamjena `window.location.hash` sa `navigate()` (3 fajla, ~3 linije svaki)
- D1: Fix breadcrumb key `/mnemonic` → `/mnemonics` (1 linija)
- E2: Fix navigacije handleOpenCoveredCard na specifičnu kategoriju (~5 linija)

**Prioritet 2 (optimizacija, ~25min):**
- L1: Ukloniti framer-motion iz ProcessingOverlay — CSS zamjena (~15 linija)
- R3: Lazy-load NotFound stranice (1 linija)
- S2: Smanjiti processing overlay duration (2 linije)

**Prioritet 3 (integritet, ~20min):**
- E1: Dexie transakcija za import overwrite (wrap existing code)

Ukupno: **6-7 fajlova** za Prioritet 1+2.

