

# Deep Audit: Arhitektura, problemi, uska grla i prostor za optimizaciju

## Pregled projekta
- **~42,700 linija** koda (TS/TSX)
- **51 dependency**, 17 lazy-loaded ruta
- **Dexie/IndexedDB** za perzistenciju, **boot-load-all** obrazac
- 5 granularnih React konteksta, Ref-Delta pattern za card state

---

## OCJENA PO SEGMENTIMA

### A. Arhitektura stanja — 9/10 ✅
Dobro dekomponovano: CardState, CategoryState, ReviewState, Actions (Proxy), Pomodoro, UI. Ref-Delta pattern eliminiše race condition-e. Persist queue sa batching-om (16ms debounce).

### B. Perzistencija / Data Layer — 7/10 ⚠️

**Problem B1: 87 direktnih `db.*` poziva mimo query sloja**
Uprkos postojanju `db-queries.ts`, sljedeći fajlovi direktno pristupaju DB tabelama:
- `useCardExport.ts` (11 poziva) — čita sve tabele za backup
- `HealthMonitor.tsx` (10) — `db.cards.update` direktno
- `sources-storage.ts` (9) — `db.cards.update`, `db.cards.bulkPut` mimo persist-queue
- `useCardImport.ts` (6) — `db.sources.bulkPut/Delete`
- `CategoryView.tsx` (5) — `useLiveQuery` sa `db.*`
- `main.tsx` (11) — Electron backup čita sve tabele

**Rizik**: Nekonzistentnost, teže refaktorisanje, SSoT narušavanje za card mutacije u `sources-storage.ts` i `HealthMonitor.tsx`.

**Problem B2: `confirmCardReview` u sources-storage.ts piše `db.cards.update` direktno**
Zaobilazi persist-queue i in-memory cardMap. Kartica se ažurira u IDB ali stanje u memoriji ostaje staro do reload-a.

### C. Bundle & Performance — 6/10 ⚠️⚠️

**Problem C1: recharts uvučen u 13 komponenti bez lazy-loading-a**
`recharts` (~200KB gzip) se importuje statički u `DashboardChart`, `ForgettingCurve`, `RetentionChart`, 6 stats tabova, 2 planner taba, `WeeklyChart`. Čak i kad korisnik ne otvori te rute, recharts se parsira ako je ikoja od ovih komponenti u bundle-u importovane rute.

Dashboard ruta importuje `DashboardChart` → recharts se učitava na svakom page load.

**Problem C2: `framer-motion` (~50KB) koristi se globalno**
Importovan u `LazyChart`, razne komponente. Nema tree-shaking jer se koristi `AnimatePresence` + `motion.div`.

**Problem C3: `CategoryView.tsx` — 5 nezavisnih `useLiveQuery` poziva**
Svaki kreira zaseban IDB observer. Cards, sources, category, allCategories i mindMapCount — 5 paralelnih IDB čitanja pri svakoj promjeni. Ovo je **najkritičniji SSoT/performans problem** jer CategoryView je najčešće korištena stranica.

### D. Nekorištene / Slabo korištene zavisnosti — 5/10 ⚠️⚠️

| Zavisnost | Korištenje | Status |
|-----------|-----------|--------|
| `react-hook-form` + `@hookform/resolvers` + `zod` | Samo u `ui/form.tsx` (shadcn scaffold) — **0 formi ga koriste** | MRTAV KOD |
| `next-themes` | Samo u `ui/sonner.tsx` za `useTheme()` | Pretjerano za 1 poziv |
| `@tanstack/react-query` | Samo u `MnemonicModule` (1 useQuery) + `TextSelectionTooltip` (invalidation) | Pretjerano za 2 poziva |
| `@types/diff-match-patch`, `@types/dompurify`, `@types/react-window` | U dependencies umjesto devDependencies | Pogrešna sekcija |

**~120KB** nepotrebnog bundle-a (react-hook-form + zod + react-query overhead).

### E. Testiranje — 3/10 ⚠️⚠️⚠️

Samo **4 test fajla**: `auto-split`, `example`, `persist-queue-c3c4`, `selection-split`. Nula testova za:
- FSRS algoritam (kritični business logic)
- Bootstrap proces
- Card CRUD operacije
- Category management
- Import/Export

### F. Velike komponente — 7/10

| Komponenta | Linije | Status |
|-----------|--------|--------|
| `CardList.tsx` | 455 | Trebalo bi izdvojiti filter/sort logiku |
| `CardViewMode.tsx` | 503 | Najveća u category/ — trebalo bi razdvojiti |
| `MnemonicWorkshop.tsx` | 359 | Kandidat za dekompoziciju |
| `CategoryView.tsx` | 362 | Miješan view + data fetching |

### G. Type Safety — 8/10
Preostala `any` upotreba:
- `useCards.ts:36` — `(n: any)` u subcategory mapping
- `useCategoryManagement.ts:17,24,32` — `normalizeNode(s: any)`, `as any[]`

### H. Ostali problemi

**H1: `loadAppSettings()` poziva se sinhrono iz localStorage na mnogo mjesta**
- `spaced-repetition.ts` L10 — poziva se u hot path-u (svaka FSRS kalkulacija)
- `useGlobalPomodoro` — na svakom resetu
- `UIProvider` — na svakom visibility change
Cache od 10s postoji ali samo za `targetRetention`, ne za cijeli settings objekat.

**H2: `main.tsx` ima 11 direktnih db.* poziva za Electron backup**
Trebalo bi centralizovati u dedicated `backup-service.ts`.

**H3: Virtualizacija samo u 2 komponente**
`CardList` i `MnemonicWorkshop` koriste `react-window`. `GlobalSearch` (296 linija) renderuje sve rezultate bez virtualizacije.

---

## PRIORITIZIRANI PLAN AKCIJA

### Tier 1 — Kritično (bundle/perf)

| # | Akcija | Uticaj |
|---|--------|--------|
| 1 | **Lazy-load recharts** u Dashboard, Stats, Planner rutama | -200KB initial bundle |
| 2 | **Eliminisati `useLiveQuery` iz CategoryView** — koristiti boot-loaded podatke iz konteksta | -5 IDB observera, čist SSoT |
| 3 | **Ukloniti react-hook-form + zod + @hookform/resolvers** (nekorišteni) | -80KB bundle |

### Tier 2 — Srednje (SSoT / integritet)

| # | Akcija | Uticaj |
|---|--------|--------|
| 4 | **Centralizovati card mutacije** — `confirmCardReview` i `HealthMonitor` trebaju koristiti persist-queue | SSoT integritet |
| 5 | **Premjestiti @types/* u devDependencies** | Čist package.json |
| 6 | **Zamijeniti react-query sa direktnim IDB pozivima** u MnemonicModule | -40KB bundle |

### Tier 3 — Poboljšanja

| # | Akcija | Uticaj |
|---|--------|--------|
| 7 | **Dodati FSRS unit testove** | Sigurnost kritičnog algoritma |
| 8 | **Dekompozicija CardViewMode.tsx** (503L) i CardList.tsx (455L) | Održivost |
| 9 | **Eliminisati `any` u useCategoryManagement** — typed `SubcategoryNode` guard | Type safety |
| 10 | **Centralizovati export/backup DB čitanja** u `db-queries.ts` | Konzistentnost |

---

## Rezime

| Segment | Ocjena | Ključni problem |
|---------|--------|----------------|
| State management | 9/10 | Čist, granularan |
| Data layer | 7/10 | 87 direktnih db.* poziva mimo query sloja |
| Bundle size | 6/10 | recharts + nekorištene deps = ~320KB viška |
| SSoT | 8/10 | CategoryView useLiveQuery, confirmCardReview |
| Testing | 3/10 | 4 test fajla za 42K LOC |
| Components | 7/10 | 3-4 preostale za dekompoziciju |
| Type safety | 8/10 | 4 preostala `any` |
| **Ukupno** | **7/10** | |

Preporučujem da krenemo sa **Tier 1** — lazy recharts, eliminacija useLiveQuery iz CategoryView, i pruning nekorištenih zavisnosti. To bi smanjilo initial bundle za ~320KB i eliminisalo najkritičnija uska grla.

