

## Detaljna analiza: Preostali problemi, rizici i plan optimizacije

### Metodologija
Pregledao sam sve ključne fajlove: `main.tsx`, `AppContext.tsx`, `useCards.ts`, `db.ts`, `metacognitive-storage.ts`, `planner-storage.ts`, `MainLayout.tsx`, `ErrorBoundary.tsx`, `app-settings.ts`, `ReviewSession.tsx` i ostale.

---

### KRITIČNI PROBLEMI (P0)

**1. Destructive clear()+bulkAdd() u metacognitive-storage.ts**
`saveDiary()`, `saveCalibration()`, `saveLatency()` koriste `db.table.clear().then(() => bulkAdd(...))`. Ako aplikacija crashuje ili se tab zatvori između `clear()` i `bulkAdd()`, svi podaci su izgubljeni. Ovo je isti anti-pattern koji smo uklonili iz `idbSaveCards`, ali ostao je u metacognitive-storage.

- Fajl: `src/lib/metacognitive-storage.ts`, linije 61-63, 92-94, 118-120
- Popravka: zamijeni sa `bulkPut()` bez prethodnog `clear()`

**2. loadAppSettings() u spaced-repetition.ts — fallback bez parametra**
`calculateNextReview()` na liniji 190 poziva `loadAppSettings()` ako `targetRetention` nije proslijeđen. Ovo znači da svaki put kad se ova funkcija pozove bez parametra (npr. iz nekih putanja), radi se sinhronizovani localStorage parse. U `previewIntervals()` (linija 257) ovo se dešava za svaku od 4 ocjena po sekciji — potencijalno stotine poziva pri prikazu review sesije.

- Popravka: proslijediti `targetRetention` kao obavezni parametar ili keširati na nivou modula

**3. exportData čuva stale localStorage ključeve za planner**
`exportData` (useCards.ts linija 658-669) i dalje čita `sr-planner-config`, `sr-daily-mapped-count` itd. iz localStorage. Ali mi smo te podatke migrirali u IDB. Backup će sadržavati **stare/prazne** localStorage podatke umjesto aktuelnih IDB podataka.

- Popravka: čitati `plannerConfig`, `dailyMapped` iz `db.settings` umjesto localStorage

---

### VISOKI PRIORITET (P1)

**4. Unbounded cache rast u metacognitive-storage**
`_calibrationCache`, `_latencyCache`, `_activityCache` rastu neograničeno — svaki `addCalibrationEntry()` dodaje u niz koji se nikad ne trimuje. Korisnik sa 2500+ kartica i 6 mjeseci korištenja može imati desetine hiljada unosa u memoriji.

- Popravka: zadržati samo posljednjih 90 dana u keš-u, starije samo u IDB

**5. MainLayout koristi useAppContext() — uzrokuje re-render na svaku card promjenu**
`MainLayout` destrukturiše `cards` iz `useAppContext()`, što znači da se CIJELI layout (TopNav, Breadcrumbs, svi children) re-renderuje kad god se bilo koja kartica promijeni. Ovo je glavni uzrok sluggishness-a.

- Popravka: MainLayout treba koristiti `useCardContext()` i `useUIContext()` selektivno, ili izvući nudge logiku u odvojenu komponentu

**6. PomodoroTimer.tsx poziva loadAppSettings() pri svakom renderu**
Linija 17: `const pom = loadAppSettings().pomodoro;` — ovo se parsira svake sekunde dok tajmer radi jer `seconds` state izaziva re-render.

- Popravka: keširati u `useMemo` ili `useRef`

**7. ZenMode.tsx — isti problem sa loadAppSettings()**
Linija 19: `const pom = loadAppSettings().pomodoro;` poziva se pri svakom renderu.

---

### SREDNJI PRIORITET (P2)

**8. ReviewSession.tsx — 812 linija, monolit**
Ogromna komponenta sa kompleksnom stanje logikom. Svaka greška u bilo kojem dijelu ruši cijelu review sesiju.

**9. sounds.ts poziva loadAppSettings() pri svakom zvuku**
`isSoundEnabled()` parsira localStorage svaki put kad se pokuša reproducirati zvuk.

**10. SRSettingsPanel hasChanges provjera**
Linija 62: `JSON.stringify(app) !== JSON.stringify(loadAppSettings())` — radi duboku serijalizaciju I localStorage parse pri svakom renderu settings panela.

---

### PLAN IMPLEMENTACIJE

#### Faza 1 — Kritične popravke (P0)

**Korak 1: Ukloni destructive clear()+bulkAdd() iz metacognitive-storage.ts**
- Zamijeni `saveDiary`: `db.diary.clear() → bulkPut()` sa direktnim `db.diary.bulkPut(entries)` 
- Isto za `saveCalibration` i `saveLatency`
- Dodati brisanje viška ključeva ako je potrebno (kao surgical upsert pattern)

**Korak 2: Popravi exportData da čita planner podatke iz IDB**
- Umjesto localStorage ključeva `sr-planner-config` itd., čitati iz `db.settings.get("plannerConfig")`, `db.settings.get("dailyMapped")`
- Ukloniti stale LS ključeve iz export liste

**Korak 3: Eliminisati nekeširan loadAppSettings() u spaced-repetition.ts**
- `calculateNextReview`: učiniti `targetRetention` obaveznim parametrom ili dodati module-level keš
- `previewIntervals`: proslijediti keširan retention

#### Faza 2 — Performance (P1)

**Korak 4: Trimovanje metacognitive keševa**
- U `initMetacognitiveCache()`, zadržati samo posljednjih 90 dana za calibration, latency, activity
- Dodati `trimCache()` helper

**Korak 5: Razbiti MainLayout re-render problem**
- Izdvojiti nudge logiku u `<NudgeWatcher>` komponentu koja sama pristupa `useCardContext()`
- MainLayout koristi samo `useUIContext()` za navigaciju

**Korak 6: Keširati loadAppSettings u PomodoroTimer i ZenMode**
- `useMemo(() => loadAppSettings().pomodoro, [])` u oba komponenta

#### Faza 3 — Čišćenje (P2)

**Korak 7: Keširati settings provjeru u SRSettingsPanel**
- Sačuvati inicijalni `loadAppSettings()` u `useRef` umjesto pozivanja pri svakom renderu

**Korak 8: Keširati isSoundEnabled u sounds.ts**
- Module-level keš sa invalidacijom pri saveAppSettings()

### Tehnički detalji

```text
P0 — Gubitak podataka / neispravni backup:
  metacognitive-storage.ts  → clear()+bulkAdd() race condition
  useCards.ts exportData     → čita stale localStorage za planner
  spaced-repetition.ts      → nekeširan localStorage parse u hot path

P1 — Performance:
  MainLayout                → re-render cascade na svaku card promjenu
  PomodoroTimer/ZenMode     → loadAppSettings() svake sekunde
  metacognitive caches      → neograničen rast u memoriji

P2 — Tech debt:
  SRSettingsPanel            → nepotrebna serijalizacija pri renderu
  sounds.ts                  → localStorage parse pri svakom zvuku
  ReviewSession.tsx          → 812-linijski monolit
```

### Obim rada
- Faza 1: 3 fajla, ~40 linija izmjena
- Faza 2: 4 fajla, ~60 linija izmjena
- Faza 3: 3 fajla, ~20 linija izmjena

