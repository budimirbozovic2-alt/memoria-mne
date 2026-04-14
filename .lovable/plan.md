

# Deep Audit: UI/UX — Desktop Electron Fokus

## Rezime

UI je vizuelno kohezivan sa dobrim dark mode sistemom, skip-to-content linkom i ARIA labelima. Fokus ovog audita je isključivo na desktop Electron okruženje. Pronašao sam **8 konkretnih problema** — 2 accessibility, 2 konzistentnost, 2 optimizacije bundle-a, i 2 UX poboljšanja.

---

## ACCESSIBILITY

### A1. Nema nijednog `aria-live` regiona u aplikaciji
**Problem:** Pretraga po cijelom projektu daje 0 rezultata za `aria-live`. Pomodoro tajmer (countdown svake sekunde), session progress (broj kartica u Learn/Review), i due badge u sidebaru — ništa od toga nema live region. Screen reader korisnik nema feedback o napretku.

**Fix:** Dodati `aria-live="polite"` na: Pomodoro tajmer display (`PomodoroTimer.tsx:32,66`), session progress counter, i due count badge u sidebaru.

### A2. Sidebar navigacione grupe nemaju `<nav>` semantiku
**Problem:** `AppSidebar.tsx` — sve grupe ("Navigacija", "Predmeti", "Alati") koriste `<div>` elemente. Screen reader ne može razlikovati navigacione sekcije. `SidebarGroupLabel` je `<div>` bez `role` ili `aria` atributa.

**Fix:** Wrapovati grupe u `<nav aria-label="Glavna navigacija">`, `<nav aria-label="Predmeti">`, `<nav aria-label="Alati">`.

---

## KONZISTENTNOST

### K1. Miješanje `focus:` i `focus-visible:` patterna
**Problem:** 11 fajlova koristi `focus:outline-none focus:ring-2` (ExamSidebar, MajorSystemSettings, SharedWidgets, MnemonicWorkshop, WorkshopCardItem, itd.), dok shadcn UI komponente koriste `focus-visible:`. `focus:` se aktivira i na klik miša — prikazuje ring oko svakog kliknutog elementa, što je vizualno ometajuće na desktopu.

**Fajlovi za popravku:**
- `ExamSidebar.tsx` (1 instanca)
- `MajorSystemSettings.tsx` (1)
- `SharedWidgets.tsx` (1)
- `MnemonicWorkshop.tsx` (1)
- `SmartSplitSummaryDialog.tsx` (1)
- `EssayCreationDialog.tsx` (1)
- `WorkshopCardItem.tsx` (2)

**Fix:** Zamijeniti `focus:outline-none focus:ring` sa `focus-visible:outline-none focus-visible:ring` u svih 8 instanci.

### K2. Score badge kontrast u sidebaru
**Problem:** `AppSidebar.tsx:118` — score badge koristi `color: hsl(var(--success))` na `backgroundColor: hsl(var(--success) / 0.15)`. U light mode-u, teal tekst na gotovo prozirnom teal pozadini ima nizak kontrast.

**Fix:** Povećati opacity pozadine na 0.25 i dodati `font-semibold` za bolju čitljivost.

---

## BUNDLE OPTIMIZACIJA

### O1. `framer-motion` u 54 fajla — ~40KB gzipped za uglavnom trivijalne fade-in animacije
**Problem:** Dashboard komponente (`QuickActions`, `VelocityWidget`, `CoreStats`, `DailyBriefing`, `ExamProgressBar`, `StatusIconsRow`, `StudyFlowWidget`, `EmptyState`) sve koriste `motion.div` sa istim patternom: `initial={{ opacity: 0, y: N }} animate={{ opacity: 1, y: 0 }}`. Ovo je ekvivalentno Tailwind `animate-in fade-in slide-in-from-bottom-N`.

**Fix — Faza 1 (Dashboard ekosistem, 8 fajlova):**
Zamijeniti `motion.div` sa CSS klasama u:
- `QuickActions.tsx`
- `VelocityWidget.tsx`
- `CoreStats.tsx`
- `DailyBriefing.tsx`
- `ExamProgressBar.tsx`
- `StatusIconsRow.tsx`
- `StudyFlowWidget.tsx`
- `EmptyState.tsx`

Pattern zamjene:
```tsx
// Prije:
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>

// Poslije:
<div className="animate-in fade-in slide-in-from-bottom-3 duration-300" style={{ animationDelay: "40ms" }}>
```

Ovo ne uklanja framer-motion iz bundle-a (još uvijek se koristi u 46 drugih fajlova), ali smanjuje eager import chain za Dashboard — najčešću stranicu.

### O2. `user-select: none` na `.prose` sprečava kopiranje teksta
**Problem:** `index.css:761-764` — `.prose:not([contenteditable="true"]) { user-select: none; }` sprečava korisnika da selektuje i kopira tekst iz Source Readera i prikaza kartica. Na desktopu, kopiranje teksta je osnovna funkcionalnost.

**Fix:** Ukloniti `user-select: none` sa `.prose`, zadržati samo `caret-color: transparent`.

---

## UX POBOLJŠANJA

### U1. Pomodoro tajmer nema keyboard shortcut za start/pauza
**Problem:** `PomodoroTimer.tsx` — jedini način za pokretanje/pauziranje tajmera je klik na dugme. Na desktopu, korisnik koji koristi Zen Mode želi brzi shortcut. Ctrl+B je zauzet za sidebar, Ctrl+K za search.

**Fix:** Dodati `Alt+P` ili `Shift+Space` (kad PomodoroTimer ima fokus) za toggle. Registrovati u `useEffect` sa `keydown` listenerom.

### U2. Sidebar predmeti nemaju drag-to-reorder
**Problem:** `AppSidebar.tsx:90-134` — predmeti su prikazani fiksnim redoslijedom (`categoryRecords.map`). Korisnik sa 10+ predmeta ne može reorganizovati sidebar po prioritetu. Ovo je desktop-specifičan UX problem — na desktopu korisnici očekuju drag-and-drop reorganizaciju.

**Fix:** Ovo je veći feature — izvan scope-a ovog audita, ali vrijedi zabilježiti kao budući improvement.

---

## Šta je DOBRO

- Skip-to-content link sa `:focus` pozicioniranjem
- `aria-label` na svim icon-only dugmićima u headeru
- `aria-pressed` na Zen Mode toggle-u
- Consistent dark mode sa CSS varijablama i force-override za inline styles
- `tabular-nums` na Pomodoro tajmeru — sprečava layout shift
- Sidebar tooltip-ovi na collapsed stanju
- Themed scrollbars sa hover efekatom
- Glassmorphism card pattern — konzistentan vizuelni identitet

---

## Scope implementacije

**Prioritet 1 (brzi fix, ~20min):**
- A1: `aria-live` na tajmer i progress (3-4 jednoliner-a)
- K1: `focus:` → `focus-visible:` zamjena (8 fajlova, regex replace)
- O2: Ukloniti `user-select: none` sa `.prose` (1 linija CSS)

**Prioritet 2 (srednji effort, ~30min):**
- A2: `<nav>` semantika u sidebaru (~10 linija)
- K2: Score badge kontrast fix (2 linije)
- U1: Keyboard shortcut za Pomodoro (~15 linija)

**Prioritet 3 (veći effort, ~1h):**
- O1: framer-motion → Tailwind animate-in migracija za 8 Dashboard komponenti

Ukupno: **6-7 fajlova** za Prioritet 1+2, **14-15 fajlova** za sve.

