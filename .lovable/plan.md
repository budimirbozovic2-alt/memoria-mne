## Cilj

Pojednostaviti panel za Konsolidaciju: ukloniti potkategoriju, poglavlje i "često na ispitu" iz UI-ja (FSRS već sam bira po prioritetu), a preostali filter **Sve / Esejska / Blic** preseliti iz collapsible blokovskog "Filteri" panela u kompaktni segmented control u header-redu pored naslova.

## Promjene

**Fajl:** `src/components/review/ReviewSetup.tsx` — kompletna rekonstrukcija (čišćenje suvišnog state-a i memoa).

### Uklanja se
- Importi: `SessionFilters`, `Collapsible`/`CollapsibleContent`/`CollapsibleTrigger`, `ChevronDown`, `SlidersHorizontal`, `useEffect`.
- State: `selectedSubcategory`, `selectedChapter`, `filterExamFrequent`, `filtersOpen`.
- Memos: `dueCategories`, `examFrequentCount`, `subPosMap`, `chapPosMap`, `dueSubcategories`, `dueChapters`, `filterSummary`, `stabilizationSourceCards` (sad nepotreban).
- Helper effect koji je čistio sub/chapter pri ulasku u stabilization (više nemaju gdje da se postave).
- Cijeli `<Collapsible>` blok pri dnu.

### Dodaje se / mijenja
- Tipovi: izvojen `type FilterType = "all" | "essay" | "flash"`.
- `filterByType` callback umjesto duplirane filter logike u oba memo-a.
- `filteredDueCards` / `filteredAllCards` koriste samo `selectedCategory` (lock) + `filterByType`. Posljedica: Stabilization ponovo koristi `filteredDueCards` direktno (FSRS scope je sada inherentno čist jer nema sub/chapter).
- `handleStartSession` prosljeđuje `null, null, false` za sub/chapter/examFrequent ka `onSelectMode` (potpis ostaje radi backward compat sa `ReviewSession`).
- Novi UI element u header-redu (pored naslova "Konsolidacija znanja"):
  ```
  [📦 RotateCcw] Konsolidacija znanja               [ Sve | Esejska | Blic ]
  Izaberi pristup ponavljanju za ovu sesiju.
  ```
  - Segmented control: `inline-flex` sa `bg-secondary rounded-lg p-1`, identičan stilu width-selectora (konzistentno sa Aktivnim prisjećanjem).
  - `role="radiogroup"` + `aria-checked` per opcija.
  - Wrap-friendly: `flex-wrap` na container-u tako da na užim ekranima padne ispod naslova.
- FSRS hint pojednostavljen: "FSRS bira sekcije po prioritetu zaborava — bez ručnog sužavanja po sub-kategoriji ili poglavlju." (uklonjena referenca na "često na ispitu").

### Zadržava se
- Mode kartice (3 opcije, radio-style).
- Onboarding, InfoPanel, Resume saved session banner, Locked subject pill.
- `onSelectMode` props potpis (radi compat sa pozivocem).

## Tehnički detalji

- Bez izmjena u `ReviewSession.tsx`, `review-constants.ts`, `SessionFilters.tsx` (ostaju za druge module).
- Zero-any policy poštovan.
- Prop `subcategories` ostaje u potpisu ali se više ne koristi — može se ostaviti zbog kompatibilnosti pozivnog mjesta (manji rizik) ili ukloniti uz patch pozivnog mjesta. **Predlog: ostaviti** (izolovana izmjena).

## Fajlovi

- `src/components/review/ReviewSetup.tsx` — overwrite.