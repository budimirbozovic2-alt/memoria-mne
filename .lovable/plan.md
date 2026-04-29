## Cilj

Dvije precizne izmjene u Konsolidaciji:

1. **GRADES sekcija** u `ReviewCard` koristi istu komponentu/raspored kao Aktivno prisjećanje (`GradeButtons` iz `src/components/learn/GradeButtons.tsx`).
2. **Fokusirano utvrđivanje** poštuje FSRS due ordering — ne smije se sužavati subkategorijom ili poglavljem. Filter po **tipu pitanja** (essay/flash) i **često-na-ispitu** ostaje dozvoljen.

## A) GRADES — koristi `GradeButtons` iz Active Recall

**Fajl:** `src/components/review/ReviewCard.tsx`

Trenutno (linije 301–322) ručno renderuje 4 dugmeta sa interval previewom ispod svakog. Aktivno prisjećanje koristi `GradeButtons` (4-col grid, `flex-col`, label + opis, semantički GRADE_COLORS).

Promjena:
- Importovati: `import GradeButtons from "@/components/learn/GradeButtons";`
- Zamijeniti cijeli "Ocijeni" blok jednim pozivom:
  ```tsx
  <GradeButtons
    onGrade={handleGradeWithCalibration}
    hint="Ocijeni kvalitet prisjećanja (4 = bez oklijevanja)"
  />
  ```

Posljedica:
- **Uklanja se 3-sekundna `canGradeEasy` blokada za grad 4** (Active Recall je nema). Ako želiš zadržati, javi — alternativno, mogu proslediti `disableEasy` prop kroz mali patch `GradeButtons`-a (1 dodatna linija) i sačuvati 3s timer. **Default predloga: ukloniti**, radi konzistentnosti.
- **Uklanja se prikaz interval previewa** (`intervals[g.value]`) ispod svakog dugmeta — Active Recall ga nema. To pojednostavljuje UI; FSRS i dalje radi identično u pozadini. Ako preferiraš da preview ostane vidljiv, mogu ga prikazati kao malu nenametljivu liniju iznad/ispod dugmadi (npr. `1d · 5d · 14d · 1mo`) bez mijenjanja same komponente.
- Čišćenje: ukloniti `gradeColorMap`, `previewIntervals` import i `intervals` memo iz `ReviewCard.tsx` (nisu više korišćeni).

Keyboard shortcuts (1–4) ostaju netaknuti.

## B) Fokusirano utvrđivanje — strogi FSRS scope

**Fajl:** `src/components/review/ReviewSetup.tsx`

Trenutno: `stabilizationItems` se računa nad `filteredDueCards`, koji uključuje `selectedSubcategory` i `selectedChapter`. To narušava FSRS prioritizaciju (algoritam očekuje da bira po globalnoj due listi).

Promjena:
- Uvesti zaseban memo `stabilizationSourceCards` koji **ignoriše** `selectedSubcategory` i `selectedChapter`:
  - poštuje `lockedCategory` (ili `selectedCategory` kada nije zaključano),
  - poštuje `filterType` (essay/flash/all),
  - poštuje `filterExamFrequent`.
- `stabilizationItems` koristi taj novi izvor; `criticalItems` i `hardestItems` ostaju kako su (rade na cijeloj kolekciji ionako).

UX upozorenje u UI-ju:
- Kada je `mode === "stabilization"`, ispod kartice moda prikazati malu napomenu:
  > "FSRS bira sekcije po prioritetu — sub-kategorija i poglavlje se zanemaruju u ovom režimu."
- Kada je stabilization odabran, u Collapsible filterima `Subkategorija` i `Poglavlje` selektore vizuelno onemogućiti (`opacity-50 pointer-events-none`) i dodati hint text. Filter po tipu i "često na ispitu" ostaju aktivni.

## Tehnički detalji

- Bez izmjena tipova u `review-constants.ts`.
- Bez izmjena u `ReviewSession.tsx` — prima već izračunate `items`.
- Zero-any policy se poštuje (sve postojeće tipovi ostaju).

## Fajlovi koji se mijenjaju

- `src/components/review/ReviewCard.tsx` — zamjena GRADES bloka, čišćenje neiskorišćenih importa.
- `src/components/review/ReviewSetup.tsx` — novi `stabilizationSourceCards` memo, vizuelni disable filtera kad je stabilization, info linija.

## Otvoreno pitanje (ne blokira)

Da li zadržati 3-sekundni cooldown za "Lako" (grade 4) u Konsolidaciji ili ga ukloniti radi konzistentnosti sa Aktivnim prisjećanjem? Default: **ukloniti**.