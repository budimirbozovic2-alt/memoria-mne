

# Deep Audit: React Renderer — Memory Leakovi i Nepotrebni Re-renderi

## Rezime

Renderer je generalno dobro optimiziran: kontekst dekompozicija, Proxy za stabilne akcije, Zustand store sa granularnim selektorima. Pronašao sam **8 konkretnih problema** — 3 memory leaka, 3 nepotrebna re-rendera, i 2 optimizacije.

---

## MEMORY LEAKOVI

### M1. ZenMode kreira novi AudioContext pri svakom chime-u — nikad ga ne zatvara
**Problem:** `ZenMode.tsx:60` — `playChime` kreira `new AudioContext()` svaki put kad se pozove (kraj fokus/pauza faze). AudioContext drži sistemske audio resurse i nikad se ne zatvara. Nakon 10 ciklusa, 10 AudioContext-ova ostaje u memoriji.

**Fix:** Koristiti singleton AudioContext (reuse `ambient-audio.ts` getCtx pattern) ili zatvoriti nakon reprodukcije:
```tsx
const playChime = useCallback((type: "focus" | "break") => {
  const ctx = new AudioContext();
  // ...existing code...
  // Close after last note finishes
  setTimeout(() => ctx.close(), 1500);
}, []);
```

### M2. NudgeWatcher u MainLayout prima `cards` i `reviewLog` — re-renderuje se pri svakoj mutaciji
**Problem:** `MainLayout.tsx:23-24` — NudgeWatcher čita `useCardData().cards` i `useReviewData().reviewLog`. Ovo znači da se NudgeWatcher re-renderuje pri SVAKOJ promjeni kartica ili review loga, iako mu ti podaci trebaju samo pri navigaciji. Svaki re-render čuva closure reference na cijeli `cards` niz (potencijalno hiljade objekata).

**Fix:** Premjestiti `cards` i `reviewLog` čitanje unutar async efekta koristeći ref ili direktno čitanje iz cardMapRef:
```tsx
const NudgeWatcher = memo(function NudgeWatcher() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const nudgeShownRef = useRef(false);
  // ... čitaj cards/reviewLog SAMO unutar efekta kad je navigacija detektovana
});
```
Alternativa: koristiti `useRef` za cards/reviewLog umjesto direktnog čitanja iz konteksta.

### M3. `useSourceReaderActions` heading menu listener ne čisti addEventListener
**Problem:** `useSourceReaderActions.ts:336-339`:
```tsx
if (state.headingMenu && !prev.headingMenu) {
  const close = () => store.getState().setHeadingMenu(null);
  window.addEventListener("click", close, { once: true });
}
```
Ako korisnik otvori heading menu ali nikad ne klikne (npr. pritisne Escape ili navigira), `click` listener ostaje registrovan. Sa `{ once: true }` ovo je minor, ali pattern je nečist — svako otvaranje menija bez klika akumulira listenere.

**Fix:** Čuvati referencu na listener i čistiti u Zustand unsubscribe ili dodati cleanup u useEffect return.

---

## NEPOTREBNI RE-RENDERI

### R1. PomodoroProvider re-renderuje SVE potrošače svake sekunde
**Problem:** `AppContext.tsx:244-248` — `useGlobalPomodoro` vraća novi `useMemo` objekat svake sekunde (jer se `seconds` mijenja). Ovo propagira kroz `PomodoroProvider` → `PomodoroContext.Provider` → re-render svih potrošača (`PomodoroTimer`, `ZenMode` header, itd.).

Problem: `PomodoroTimer` se renderuje u sidebaru i kompaktnom modu — svake sekunde uzrokuje Sidebar layout recalculation.

**Fix:** Izdvojiti `seconds` u zaseban kontekst ili koristiti `useRef` za seconds + `forceUpdate` samo u komponentama koje prikazuju tajmer. Alternativno, PomodoroTimer može direktno koristiti `useRef` + `setInterval` bez konteksta.

### R2. `useDashboardData` eagerly importuje `planner-storage` — teški modul na svaki Dashboard render
**Problem:** `useDashboardData.ts:7-12` — statički importuje `loadPlanner`, `calcVelocity`, `getSmartSuggestion` itd. Ovo znači da se cijeli `planner-storage.ts` (577 linija + `date-fns`) učitava čim korisnik otvori Dashboard, čak i ako planner nije konfigurisan.

**Fix:** Lazy import unutar `useDeferredCompute` callback-ova:
```tsx
const plannerConfig = useDeferredCompute(async () => {
  const { loadPlanner } = await import("@/lib/planner-storage");
  return loadPlanner();
}, []);
```

### R3. `ActivityHeatmap` poziva `loadDisciplineLog()` sinkrono u `useMemo` sa praznim deps `[]`
**Problem:** `ActivityHeatmap.tsx:29-34` — `useMemo(() => loadDisciplineLog(), [])` čita localStorage sinkrono prilikom renderovanja. Ovo blokira paint za ~2-5ms. Takođe, prazan dependency niz znači da se disciplina nikad ne osvježi dok je Dashboard otvoren.

**Fix:** Koristiti `useDeferredCompute` ili `useEffect` + `useState` za async učitavanje.

---

## OPTIMIZACIJE

### O1. `Dashboard` koristi `motion` iz `framer-motion` za ProgressRing wrapper
**Problem:** `Dashboard.tsx:7` — `import { motion } from "framer-motion"` se eagerly učitava. Ovo vuče ~40KB gzipped biblioteku samo za jednu `motion.div` animaciju (fade-in na ProgressRing).

**Fix:** Zamijeniti sa CSS animation/transition:
```tsx
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300 glass-card p-5">
```
Tailwind `animate-in` plugin ili custom CSS transition eliminišu potrebu za framer-motion na Dashboardu.

### O2. `Breadcrumbs` čita `useCategoryData()` — re-renderuje se pri svakoj promjeni kategorija
**Problem:** `Breadcrumbs.tsx:29` — `useCategoryData()` se pretplaćuje na cijeli `CategoryStateContext`. Breadcrumbs treba SAMO `categoryRecords` za lookup imena, ali se re-renderuje i kad se `categoryStats`, `subcategories` ili `categories` promijene.

**Fix:** Selektivni selektor ili memoizacija:
```tsx
const categoryRecords = useCategoryData().categoryRecords;
// + memo wrapper na Breadcrumbs komponentu
```
Ovo je minor jer se `CategoryStateContext` rijetko mijenja, ali je nečist pattern.

---

## Šta je DOBRO (ne treba mijenjati)

- Proxy pattern za CardActions — stabilna referenca, 0 re-rendera
- Kontekst dekompozicija na 5 providera — odlična granularnost
- Zustand store za SourceReader sa granularnim selektorima
- `memo()` na NudgeWatcher, GlobalSearchWrapper, DocxImporterWrapper
- `useCallback` na svim action handlerima u CRUD i Annotations
- Lazy loading svih route stranica
- SessionContext sa ref-based queueing — 0 re-rendera tokom sesije
- `mapToArray` version cache — sprečava O(n) na svaki render

---

## Scope implementacije

**5-6 fajlova**. Najvažniji su M1 (jednoliner — close AudioContext), R1 (refaktoring Pomodoro konteksta), i R2 (lazy import u useDashboardData). M2 je srednji effort (refaktoring NudgeWatcher). Ukupno ~1.5h rada.

