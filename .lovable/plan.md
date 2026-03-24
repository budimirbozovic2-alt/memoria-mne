

## Analiza: Preostali problemi nakon prethodnih optimizacija

### Metodologija
Pregledao sam: `main.tsx`, `AppContext.tsx`, `useCards.ts`, `db.ts`, `metacognitive-storage.ts`, `planner-storage.ts`, `MainLayout.tsx`, `spaced-repetition.ts`, `app-settings.ts`, `sounds.ts`, `SRSettingsPanel.tsx`, `PomodoroTimer.tsx`, `ZenMode.tsx`, `ReviewSession.tsx`.

---

### STATUS PRETHODNO PRIJAVLJENIH PROBLEMA

| Problem | Status |
|---------|--------|
| clear()+bulkAdd() u metacognitive-storage | **RIJEŠEN** — koristi bulkPut() |
| loadAppSettings() u spaced-repetition hot path | **RIJEŠEN** — getCachedRetention() |
| exportData čita stale LS za planner | **RIJEŠEN** — čita iz IDB |
| Metacognitive cache trimovanje 90 dana | **RIJEŠEN** |
| NudgeWatcher izolacija | **RIJEŠEN** |
| PomodoroTimer/ZenMode settings keš | **RIJEŠEN** — useMemo |
| sounds.ts keš | **RIJEŠEN** — module-level cache |
| SRSettingsPanel useRef | **RIJEŠEN** |
| Destruktivni boot error handleri | **RIJEŠEN** — zamijenjeni benignim |

---

### NOVI/PREOSTALI PROBLEMI

#### P0 — Kritično

**1. Electron backup čita stale localStorage za planner (main.tsx:112-116)**
Electron IPC backup handler na liniji 112-116 i dalje čita `sr-planner-config`, `sr-daily-mapped-count`, `sr-daily-mapped-date` iz localStorage. Ovo je ISTI bug koji smo popravili u `exportData`, ali Electron putanja ga nije dobila.

- Fajl: `src/main.tsx`, linije 112-123
- Popravka: čitati planner podatke iz `db.settings` kao u exportData

**2. idbSaveCategories i idbSaveSubcategories koriste clear()+bulkPut() (db.ts:350-371)**
Ove dvije funkcije i dalje koriste `clear()` unutar transakcije. Ako se transakcija prekine nakon clear a prije bulkPut, kategorije su izgubljene.

- Fajl: `src/lib/db.ts`, linije 350-371
- Popravka: koristiti bulkPut + delete viška (isti pattern kao idbSaveCards)

#### P1 — Performanse

**3. MainLayout i dalje koristi useAppContext() — uzrokuje re-render na card promjene**
Linija 68: `const { setView, setEditingCard, cards, categories, importCards, addFlashCard } = useAppContext()` — NudgeWatcher je izolovan, ali sam MainLayout se i dalje re-renderuje jer destrukturiše `cards` (koristi se za GlobalSearch). Svaka promjena kartice re-renderuje TopNav, Breadcrumbs, ZenMode itd.

- Popravka: MainLayout treba koristiti samo `useUIContext()` za navigaciju. `cards` i `categories` treba proslijediti samo komponentama koje ih trebaju (GlobalSearch, DocxImporter) putem useCardContext() unutar tih komponenti, ili ih lazy-loadati.

**4. useAppContext() kreira novi objekat pri svakom renderu oba konteksta**
Linija 86: `useMemo(() => ({ ...card, ...ui }), [card, ui])` — spread kreira novi objekat svaki put kad se bilo koji kontekst promijeni. Svaka komponenta koja koristi `useAppContext()` se re-renderuje kad se BILO ŠTA promijeni.

- Popravka: postepeno migrirati potrošače na `useCardContext()` ili `useUIContext()` umjesto `useAppContext()`

**5. ReviewSession.tsx — 812-linijski monolit bez ErrorBoundary zaštite**
Jedna greška u bilo kojem dijelu (filtriranje, prikaz, ocjenjivanje) ruši cijelu sesiju. Nema mogućnosti za oporavak.

- Popravka: razbiti na pod-komponente (ReviewSetup, ReviewCard, ReviewComplete) sa vlastitim error boundaryima

#### P2 — Robusnost

**6. app-settings.ts i dalje koristi isključivo localStorage**
AppSettings su jedini preostali podatak koji živi samo u localStorage. Dok je mali (< 1KB), gubi se pri čišćenju browsera.

- Popravka: dodati IDB backup za app-settings sa LS kao primarni (brz sinhroni čitač) i IDB kao fallback

**7. Notification scheduler u UIProvider čita loadAppSettings() samo jednom**
Linija 182: notification check interval čita settings jednom pri mount-u ali nikad ne osvježava ako korisnik promijeni notification settings. Mora re-mountati UIProvider.

- Popravka: dodati `settings` u dependency ili koristiti ref koji se osvježava

---

### PLAN IMPLEMENTACIJE

#### Faza 1 — Kritične popravke

**Korak 1: Popravi Electron backup localStorage čitanje**
- `src/main.tsx` linije 112-123: dodati čitanje `plannerConfig`, `dailyMapped`, `dailyMappedDate` iz `db.settings`
- Ukloniti `sr-planner-config`, `sr-daily-mapped-count`, `sr-daily-mapped-date` iz LS ključeva

**Korak 2: Zamijeni clear()+bulkPut u idbSaveCategories/idbSaveSubcategories**
- `src/lib/db.ts`: koristiti bulkPut + surgical delete umjesto clear()

#### Faza 2 — Performance

**Korak 3: Izoluj cards zavisnost iz MainLayout**
- MainLayout koristi `useUIContext()` + `useCardContext()` selektivno
- GlobalSearch i DocxImporter dobijaju cards/categories kroz vlastiti useCardContext() hook unutar komponente, ne kroz prop iz MainLayout-a
- Ovo eliminira re-render TopNav/Breadcrumbs na svaku card promjenu

**Korak 4: Migracija ključnih potrošača sa useAppContext na specifične kontekste**
- Identifikovati komponente koje koriste useAppContext() a trebaju samo UI ili samo Card dio
- Postepena zamjena

#### Faza 3 — Robusnost

**Korak 5: Dodati IDB fallback za AppSettings**
- `saveAppSettings` piše u LS + IDB
- `loadAppSettings` čita LS, ako prazno pada na IDB

**Korak 6: Notification settings refresh**
- UIProvider: osvježavati notification config kad se view promijeni na "settings" i nazad

---

### Tehnički pregled

```text
P0 — Integritet podataka:
  main.tsx Electron backup     → stale LS za planner (isti bug kao exportData)
  db.ts categories/subcats     → clear()+bulkPut() race condition

P1 — Performance:
  MainLayout                   → useAppContext() re-renderuje sve na card change
  useAppContext()              → spread merge kreira novi objekat svaki put

P2 — Robusnost:
  app-settings.ts              → samo localStorage, nema IDB backup
  UIProvider notifications     → ne osvježava settings nakon promjene
  ReviewSession.tsx            → 812-linijski monolit
```

### Obim rada
- Faza 1: 2 fajla, ~30 linija izmjena
- Faza 2: 3-5 fajlova, ~50 linija izmjena
- Faza 3: 2 fajla, ~30 linija izmjena

