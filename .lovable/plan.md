# Code De-bloating Audit — pronađeno ~700 LOC za brisanje

Cilj: ukloniti redundantnu strukturu bez dodavanja funkcionalnosti. Sve nalaze sam verifikovao u kodu (linije citiram).

---

## 1. Copy-Paste Redundancija (UI)

### 1A. Tri identična *Onboarding wrapper-a* (`AppOnboarding`, `PlannerOnboarding`, `StatsOnboarding`, `DashboardOnboarding`)
**Lokacija:** `src/components/{App,Planner,Stats,Dashboard}Onboarding.tsx` (118 + 62 + 62 + 86 = **328 LOC**)

**Bloat:** Sva četiri fajla su 100% strukturno isti — drže `const SLIDES`, `STORAGE_KEY` i 5-linijski default export koji samo prosljeđuje sve u `<OnboardingModal>`. Razlika: samo niz slajdova i finishLabel.

**Fix:** Jedan fajl `src/components/onboarding/slides.ts` koji eksportuje `ONBOARDING_PRESETS`:
```ts
export const ONBOARDING_PRESETS = {
  app:       { key: "sr-app-onboarding-seen",       finish: "Počni koristiti", slides: [...] },
  planner:   { key: "sr-planner-onboarding-seen",   finish: "Razumijem",       slides: [...] },
  stats:     { key: "sr-stats-onboarding-seen",     finish: "Razumijem",       slides: [...] },
  dashboard: { key: "sr-dashboard-onboarding-seen", finish: "Razumijem",       slides: [...] },
} as const;
```
Pozivi postaju `<OnboardingModal preset="app" onComplete={...} />` (modal čita preset interno). Brišu se 4 wrapper komponente; ostaje samo `OnboardingModal` koji prima `preset` ili custom `slides`.

**Ušteda:** ~**280 LOC** (4 × ~70 redova boilerplate-a + 4 lazy-import unosa). Konstante `APP_ONBOARDING_KEY` itd. ostaju kao re-export iz preset modula da pozivni siteovi ne pucaju.

---

### 1B. `MainLayout` ima 3 jednolinijska `*Wrapper` komponente (`GlobalSearchWrapper`, `DocxImporterWrapper`)
**Lokacija:** `src/components/MainLayout.tsx:86-140`

**Bloat:** Svaki wrapper je `memo()` + `Suspense` + early-return + jedan poziv lazy komponente. Logika je trivijalna. Pravi razlog postojanja je *sprečavanje da AppContext re-render pumpa lazy import* — što se rješava jednostavnijim early-return uzorkom direktno u JSX:

**Fix:** Zamijeniti sa inline pattern-om jer je `lazy()` već u dat fajlu:
```tsx
{globalSearchOpen && (
  <Suspense fallback={null}>
    <GlobalSearch open onClose={...} onNavigateToCard={...} />
  </Suspense>
)}
```
`useEditReturn` hook se može pozvati u `MainLayout` direktno (već radi tako u GlobalSearchWrapper). NudgeWatcher ostaje (legitimno izolovan).

**Ušteda:** ~**45 LOC** (2 wrappera × ~22 reda).

---

## 2. Zloupotreba lokalnog stanja (State Bloat)

### 2A. `MainLayout` — `useRef` mirror za context koji već ne re-renderuje
**Lokacija:** `src/components/MainLayout.tsx:32-35`
```ts
const cardDataRef = useRef<ReturnType<typeof useCardData>>(null!);
cardDataRef.current = useCardData();
const reviewDataRef = useRef<ReturnType<typeof useReviewData>>(null!);
reviewDataRef.current = useReviewData();
```

**Bloat:** Hook se već zove svaki render — ref *ne* sprečava subscription, samo daje iluziju "lazy reads". Ako je cilj bio izbjeći re-render NudgeWatcher-a, treba ga premjestiti u dijete `<NudgeWatcher />` koje se mounta samo na route change preko `key={pathname}` ili koristiti `useEvent` pattern. Trenutno je to mrtva tkanina.

**Fix:** Ukloniti refove, čitati direktno; ako je perf bitan, izdvojiti subscription u event-bus listener (kao DbErrorProvider). Ovaj NudgeWatcher se već okida samo na promjenu pathname (efekt deps), pa direktan poziv funkcije `useCardData()` ima isti broj re-rendera kao i ref-pristup.

**Ušteda:** ~**6 LOC** + jasniji namjera.

---

### 2B. `GlobalSearch.stripHtml` — wrapper oko wrapper-a
**Lokacija:** `src/components/GlobalSearch.tsx:34-37`
```ts
import { stripHtmlText as _stripHtml } from "@/lib/sanitize";
function stripHtml(html: string): string { return _stripHtml(html); }
```
Komentar tvrdi "wrapper that drops trailing whitespace" — *ali ne radi to*. Samo prosljeđuje argument.

**Fix:** Direktan `import { stripHtmlText as stripHtml }`.

**Ušteda:** **3 LOC**, eliminisana lažna apstrakcija.

---

## 3. Loše apstrakcije alata (Reinventing the Wheel)

### 3A. Vlastiti `Modal` shell ima ručni focus-trap i ESC handler — Radix `Dialog` već postoji u projektu
**Lokacija:** `src/components/ui/Modal.tsx` (154 LOC) + `src/components/ui/dialog.tsx` (već instalirana shadcn varijanta).

**Bloat:** `Modal.tsx` ručno radi:
- focus trap (linije 79-110 — 32 reda Tab/Shift+Tab logike),
- restore-focus (60-75),
- portal + AnimatePresence,
- vlastite z-index tokene.

Sve ovo Radix Dialog daje besplatno, a već je u dependency-jima. Razlog za vlastiti Modal bio je "z-index conflict" sa `PlannerSetupWizard` — međutim, taj se rješava `<Dialog>` sa `modal={true}` i `Portal container` propom, ili jednostavnije: dodavanjem `style={{ zIndex: 60 }}` na `DialogContent` za "elevated" varijantu.

**Fix:** Migrirati 5 potrošača Modal-a (`OnboardingModal`, `PlannerSetupWizard`, `CategoryManager` confirm, `AuditorDetailPanel`, `GlobalSearch`) na `Dialog`. Ostaviti `Modal.tsx` *samo* ako neki potrošač traži `z-search` (Cmd+K) — što se rješava Radix `Dialog` + custom `DialogContent` varijantom kroz `cva`.

**Ušteda:** **~154 LOC** (cijeli Modal.tsx) + ~10 LOC po pozivu u potrošačima (uniformne props skraćene). Plus brisanje `z-index-conflict.test.tsx` koji testira sopstvenu apstrakciju.

**Trade-off:** Migracija dotiče 5 komponenti i njihove vizuele moraju ostati identične — preporuka: napraviti `<DialogShell>` thin wrapper koji prenosi `panelClassName` na `DialogContent` da se ne mijenja styling po potrošaču.

---

### 3B. Globalna `setGlobalSearchOpen` zastavica + `shouldIgnoreGlobalKey` — Radix Dialog već radi inertne fokuse
**Lokacija:** `src/lib/global-overlay-state.ts` (45 LOC), pozvana iz 4 keydown listenera.

**Bloat:** Razlog postojanja — keydown listeneri u `LocalSpeedReader`, `ReviewCard`, `PassiveReader` se okidaju dok je GlobalSearch otvoren. Kad GlobalSearch postane Radix Dialog (3A), background postaje `inert` automatski (Radix postavlja `aria-hidden` + `pointer-events: none`), a fokus je zarobljen u dijalogu — *event.target* unutar Dijaloga nikad ne stiže do window listenera background komponenti jer komponente mogu provjeriti `e.target.closest('[role="dialog"]')`.

**Fix:** Zamijeniti `shouldIgnoreGlobalKey(e)` jednim utilom `isInsideOpenDialog(e.target)` koji koristi DOM kao SSOT (ne globalnu varijablu). `setGlobalSearchOpen` poziv (i import) brišu se.

**Ušteda:** **~30 LOC** + smanjenje stanja koje treba sinhronizovati ručno.

---

### 3C. Ručno parsiranje keydown za Ctrl+K (`MainLayout:159-168`) — postoji `useHotkeys`/native pattern
**Lokacija:** `src/components/MainLayout.tsx:159-168` + identičan pattern u 8 drugih fajlova (`useEffect` sa `addEventListener("keydown")`).

**Bloat:** 9 ponovljenih `useEffect(() => { window.addEventListener("keydown", ...); return () => removeEventListener })` blokova, svaki 8-12 redova. Logika ista, razlikuje se samo handler.

**Fix:** Mali hook `useGlobalHotkey(matcher, handler, deps?)`:
```ts
// src/hooks/useGlobalHotkey.ts (~15 LOC)
export function useGlobalHotkey(
  matcher: (e: KeyboardEvent) => boolean,
  handler: (e: KeyboardEvent) => void,
  deps: unknown[] = [],
  opts: { capture?: boolean; ignoreInEditable?: boolean } = {},
) {
  useEffect(() => {
    const cb = (e: KeyboardEvent) => {
      if (opts.ignoreInEditable && isEditableTarget(e.target)) return;
      if (matcher(e)) handler(e);
    };
    window.addEventListener("keydown", cb, opts.capture);
    return () => window.removeEventListener("keydown", cb, opts.capture);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```
Pozivi se skraćuju sa 10 → 3 reda po komponenti.

**Ušteda:** **~60 LOC** kroz 9 call-site-ova.

---

## 4. Nepotrebni Wrapperi

### 4A. `src/contexts/AppContext.tsx` (re-export barrel)
**Lokacija:** `src/contexts/AppContext.tsx` (46 LOC)

**Status:** Pravi composition root + re-export barrel. *Nije bloat* — služi backwards-compat za 50+ importa. Ostavi.

### 4B. `src/lib/db.ts` (3 reda re-exporta)
**Lokacija:** `src/lib/db.ts` (4 LOC)

**Status:** Barrel za 48 potrošača. Ostavi (legitiman fasad).

### 4C. `MainLayout.GlobalSearchWrapper` / `DocxImporterWrapper` — pokriveno u 1B.

### 4D. `useScrollRestore` u `useEditReturn` — vrijedi provjeriti
Nije pregledano detaljno; preliminarno OK (ima jasnu odgovornost).

---

## Sažetak ušteda

| Stavka | LOC za brisanje | Rizik |
|---|---|---|
| 1A: Onboarding wrapperi → preset | ~280 | nizak |
| 1B: MainLayout wrapperi | ~45 | nizak |
| 2A: MainLayout ref-mirror | ~6 | nizak |
| 2B: GlobalSearch stripHtml wrapper | ~3 | trivijalan |
| 3A: Modal shell → Radix Dialog | ~154 + ~50 | **srednji** (5 migracija) |
| 3B: global-overlay-state | ~30 | nizak (uz 3A) |
| 3C: useGlobalHotkey | ~60 (neto −45) | nizak |
| **UKUPNO** | **~620 LOC neto** | |

## Redoslijed izvršenja (od najsigurnijeg)

1. **2B** (3 LOC, 0 rizika) — odmah.
2. **2A** (6 LOC, čišćenje) — odmah.
3. **3C** `useGlobalHotkey` — refaktor 9 mjesta, lako testirati.
4. **1A** Onboarding presets — mehanička transformacija.
5. **1B** MainLayout wrapperi — pratiti perf da nema novih re-rendera (memo nije bio bezveze, ali konzervativno može ostati).
6. **3A + 3B** Modal → Radix Dialog — najveća ušteda, treba QA fokus-trapa i z-index sloja prije merge-a; jedini potez koji *uklanja* postojeće M1-M5 testove.

## Šta NIJE bloat (ali djeluje sumnjivo)

- `db-schema.ts` setDbEventEmitter DI — namjerno, riješeno u prošloj iteraciji (W1).
- `useEditReturn` SSOT mirror — namjerno, kapija koja izbjegava 3 ref-mirror-a.
- `BlockingModal`, `ProcessingOverlay`, `DatabaseRecoveryPanel` — *ne* koriste Modal jer su recovery-layer iznad svih dialog-a (z-blocking/z-recovery). Ostaju vanilla div.
- `lazy()` importi u `MainLayout` — perf-kritični, ostaju.

Po odobrenju kreciram koraci 1-6 jedan po jedan u zasebnim commit-ima da se LOC ušteda može mjeriti.
