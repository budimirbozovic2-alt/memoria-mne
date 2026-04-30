# Refaktor i ispravke mehanizma konsolidacije

Cilj: konsolidacija mora da poštuje FSRS raspored (`nextReview ≤ now`) u svim modovima, da ima jedan izvor istine za izbor sekcija, i da Active Recall ne korumpira FSRS signale.

## 1. Due-only filter u svim modovima (BUG 1, 2)

Trenutno `critical` i `hardest` biraju iz `allCards` bez obzira na `nextReview`, pa FSRS dobija prijevremene ocjene koje kvare stabilnost. Promjena:

- **`stabilization`** — ostaje na `dueCards` (već OK).
- **`critical`** — promijeniti izvor sa `filteredAllCards` na `filteredDueCards`. Prozor `R ∈ [80, 85]` ostaje, ali primijenjen samo na sekcije koje su due ili overdue. Time se hvata "kritični trenutak" tačno onda kad ga FSRS očekuje.
- **`hardest`** — dodati prag: leech/teške sekcije ulaze samo ako je `nextReview ≤ now + grace`, gdje je `grace = 2 dana` (konfigurabilno konstantom u `review-constants.ts`). Razlog: leech kartice se često žele forsirati i prije roka, ali ne smije da bude "iz vedra neba" — 2 dana prozor je dobar kompromis.
- Dodati upozorenje na karticu u `ReviewCard` kada je sekcija prerano (early review): mali badge "Prijevremena konsolidacija — FSRS će smanjiti rast intervala".

## 2. Centralizacija logike modova (BUG 3)

Izvući `computeItemsForMode` iz `ReviewSession.tsx` i identičnu trojku iz `ReviewSetup.tsx` u jedan modul:

```
src/lib/review-mode-builder.ts
  - buildStabilizationItems(dueCards): DueItem[]
  - buildCriticalItems(dueCards): DueItem[]
  - buildHardestItems(dueCards, srSettings, graceDays): DueItem[]
  - buildItemsForMode(mode, dueCards, allCards, srSettings): DueItem[]
```

`ReviewSetup` i `ReviewSession` oboje pozivaju ove funkcije. Brojači u UI-u i stvarna sesija će biti garantovano identični.

## 3. Active Recall — grade per section, ne per card (BUG 4)

U `StudyModeRecall.tsx`, umjesto `sections.forEach(s => onReviewSection(card.id, s.id, grade))`:

- Ako kartica ima 1 sekciju (flash) → ocijeni tu sekciju (postojeće ponašanje).
- Ako ima više sekcija (esej) → ocijeni samo sekcije koje su trenutno due, ostale ne diraj. To štiti ne-due sekcije od umjetne stabilizacije.

Alternativno (manji rizik): dodati settings prekidač "Active Recall fan-out" — default OFF nakon refaktora.

## 4. Čišćenje (BUG 5, 6, 7)

- Ukloniti `subcategories` prop iz `ReviewSessionProps`, `ReviewSetupProps` i lanca poziva.
- Ukloniti `selectedCategory?: string | null` iz `SavedSessionState` (nije korišten).
- Provjeriti je li `getPendingFirstReviewCount` korišten igdje; ako nije, ostaviti (može biti za buduću dashboard signalizaciju) — ne brisati u ovom PR-u.

## 5. Test pokrivenost

Dodati `src/test/review-mode-builder.test.ts` sa scenarijima:
- Kartica sa `nextReview = now + 5d` ne smije ući ni u `critical` ni u `hardest` (ovaj drugi može samo unutar `grace` prozora).
- Stabilizacija prazna kada nema Learning/Relearning sekcija sa stab<5.
- Hardest sortiranje: leech prvi, zatim difficulty desc, ukupno ≤50.

## 6. Tehnički detalji (developer only)

- `grace` konstanta: `const HARDEST_GRACE_MS = 2 * 24 * 60 * 60 * 1000;` u `review-constants.ts`.
- Tip `BuildArgs = { dueCards: Card[]; allCards: Card[]; srSettings: SRSettings; now?: number }` — `now` injectable za testove.
- `ReviewSetup` više ne treba `allCards` jer sve gradi iz `dueCards` (+ grace prozor); prop ostaje radi `EmptyState` brojača na nivou `ReviewPage`.
- `LocalSpeedReader` i `PassiveReader` nisu zahvaćeni.

## Šta NE mijenjamo

- Skala ocjena 1–4, FSRS formule (`calculateNextReview`), `targetRetention` izvor (ostaje globalan u ovoj rundi — per-subject je posebna tema vezana za Dijagnostiku).
- Pause/Resume IDB ključ i 2h TTL.
- Auto-mode iz globalnog dashboarda (`?mode=critical`).
- UI izgled mod-pickera (samo brojači će se promijeniti jer izvor postaje `dueCards`).

## Datoteke koje će se mijenjati

- **Novo**: `src/lib/review-mode-builder.ts`, `src/test/review-mode-builder.test.ts`
- **Izmjene**: `src/components/ReviewSession.tsx`, `src/components/review/ReviewSetup.tsx`, `src/components/review/review-constants.ts`, `src/components/review/ReviewCard.tsx` (early-review badge), `src/components/learn/StudyModeRecall.tsx`

## Otvoreno pitanje

Da li želiš da `hardest` mod ipak dozvoli sve leech kartice bez `grace` ograničenja (jer su one same po sebi izuzetak), a samo `difficulty>7` da podliježe due-only pravilu? To je čistije pedagoški, ali pišem li ovako ili strogo due-only — javi prije implementacije.
