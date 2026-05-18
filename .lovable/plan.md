## Faza C — P2 Cleanup

### 1. Regex pre-kompilacija (`src/lib/highlight-key-parts.ts`)

Trenutno `highlightKeyParts` instancira `new RegExp(...)` u `for` petlji za **svaki** `keyPart` na **svaki** render — pri 1000 sekcija × 50 ključeva to je 50k regex kompilacija po prolazu.

**Promjene:**
- Dodati `compileKeyPartsMatcher(keyParts: string[]): RegExp | null` — vraća **jedan** alternacijski regex `/(?![^<]*>)(esc1|esc2|...)/gi`, sortiran po dužini opadajuće (duži match prvo, izbjegava prefix-shadow). Memoizirano kroz `WeakMap`/`Map` po referenci niza nije korisno jer su to literali; umjesto toga eksportovati pure factory.
- `highlightKeyParts(html, keyParts | matcher)` prihvata gotov matcher kao alternativu — back-compat za niz `string[]`.
- `HighlightedSection` koristi `useMemo` na nivou roditelja preko novog hooka **`useKeyPartsMatcher(keyParts)`** koji jednom po kartici pravi matcher; mapped sekcije dobijaju isti matcher (O(N) umjesto O(N×M)).
- Test: `src/test/highlight-key-parts.test.ts` — provjera (a) ispravan output, (b) jedna regex kompilacija za N poziva s istim matcher-om.

### 2. HMR watchdog teardown (`src/lib/db-schema.ts`)

`startUnblockWatch()` postavlja `setInterval(..., 2000)` u `unblockIntervalId`; pri Vite HMR-u modul se evaluira ponovo, stari interval ostaje da visi (memory + duplicate side-effects).

**Promjene:**
- Eksportovati `__teardownDbWatchdog()`: `clearInterval(unblockIntervalId)` + reset `unblockIntervalId = null`, `reloadScheduled = false`.
- Na dnu fajla: `if (import.meta.hot) { import.meta.hot.dispose(() => __teardownDbWatchdog()); }`.
- Smoke test: `src/test/db-watchdog-teardown.test.ts` — `startUnblockWatch()` → `__teardownDbWatchdog()` → `unblockIntervalId === null`.

### 3. Settings panel type-safety (`src/components/SRSettingsPanel.tsx`)

**Nalaz nakon revizije:** Faza B je već uklonila špageti `useEffect` sinhronizacije i sve refove kanalisala kroz `useLatestRef`. **Nema `as unknown as` cast-ova u trenutnom fajlu** (provjera: `rg "as unknown as" src/components/SRSettingsPanel.tsx` → 0 rezultata). Tačka 3 je **largely already addressed**; preostaje samo manja kozmetika:

- Izvući `OVERRIDABLE_KEYS = ["leechThreshold","dailyGoal","resistanceWeights","targetRetention"] as const` u `subject-settings.ts` i koristiti tipiziranu `mergeSubjectOverrides(base, overrides)` helper umjesto inline spread-with-conditional u `useState` inicijalizatoru (linije 51–69). To eliminiše manuelna `!== undefined` provjeravanja po polju.
- Test već postoji za subject-settings; dopuniti ako helper donosi novu granu.

### 4. Standardizacija unmount zaštite

Trenutno stanje: 9 različitih mjesta sa `let cancelled = false` / `let isMounted = true` paternom (npr. `useCategorySources`, `useMindMaps`, `useScrollRestore`, `useWikiLinkAutoCreate`, `useDeferredCompute`, `useZettelkastenBootstrap`, `MnemonicModule`). Iste semantike, različita imena.

**Promjene:**
- Kreirati `src/hooks/useIsMountedRef.ts`:
  ```ts
  export function useIsMountedRef() {
    const ref = useRef(true);
    useEffect(() => () => { ref.current = false; }, []);
    return ref;
  }
  ```
- Kreirati `src/hooks/useAbortOnUnmount.ts` za async fetch/audio/Dexie scenarije gdje `AbortController` ima smisla.
- Migrirati 9 navedenih call-site-ova u dvije runde:
  - **Runda 4a** (per-effect lokalna varijabla → `useIsMountedRef`): `useCategorySources`, `useMindMaps`, `useScrollRestore`, `useDeferredCompute`, `useZettelkastenBootstrap`, `MnemonicModule`.
  - **Runda 4b** (`useWikiLinkAutoCreate` već koristi `useLatestRef` + tail-drain idempotency → samo preimenovanje `cancelled` u `useIsMountedRef` radi konzistentnosti; semantiku ne mijenjamo).
- Test: `src/test/use-is-mounted-ref.test.tsx` — ref postaje `false` nakon unmount-a.

### 5. Bonus — dekompozicija SmartSplitSummaryDialog

**Nalaz:** Trenutno **221 linija** (već dekomponovan u prošlom PR-u: `useSplitModules`, `ModuleCard`, `MetadataPanel`, `CuttingView`). Ispod ciljne granice od 250 linija — **odustaje se od daljnje dekompozicije**, dodaje se samo ekstrakcija dirty-close + cutting orchestration u `src/hooks/smart-split/useSmartSplitSummary.ts` ako se zadrži ispod 180 linija renderera. Inače skip.

---

### Tehnički detalji (sažeto)

| Item | Files added | Files edited |
|---|---|---|
| 1 | `src/test/highlight-key-parts.test.ts` | `src/lib/highlight-key-parts.ts` |
| 2 | `src/test/db-watchdog-teardown.test.ts` | `src/lib/db-schema.ts` |
| 3 | — | `src/lib/subject-settings.ts`, `src/components/SRSettingsPanel.tsx` |
| 4 | `src/hooks/useIsMountedRef.ts`, `src/hooks/useAbortOnUnmount.ts`, `src/test/use-is-mounted-ref.test.tsx` | 6–7 hooks/komponenti |
| 5 | (uslovno) `src/hooks/smart-split/useSmartSplitSummary.ts` | `SmartSplitSummaryDialog.tsx` |

### Verifikacija
- `bunx vitest run` — sve postojeće 407 testova + 3 nova moraju proći.
- ESLint čist, bez novih `any`/`as unknown` regresija.

### Out of scope
- Workshop/MindMap node dekompozicija (završeno u P2 fazi).
- Wiki auto-create idempotency rework (završeno u Fazi B).
