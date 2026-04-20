

## Plan: Prošireni "Kontrolni panel sesije" sa svim filterima + Redoslijedom

### Šta se dešava sada (zašto izgleda da fali)

Funkcionalnost potkategorije/glave **postoji u kodu** (`SessionFilters.tsx:184-265`), ali se cijela sekcija prikazuje SAMO ako:
- `selectedCategory && availableSubs.length > 0` (potkategorija)
- `selectedSubcategory && chaptersInSub.length > 0` (glava)

Pošto je sve smješteno u uski `max-w-xl` (576 px), a "Redoslijed" je u zasebnom bloku ispod, cijela strana izgleda usko i zbrkano. **Ništa nije obrisano** — ali oku korisnika izgleda kao da fali jer se sekcije pojavljuju i nestaju.

### Rješenje: jedan širi "Setup panel" sa 2-kolonskim layoutom

```
┌── Filteri sesije ─────────────────────────── 12 / 47 modula ──┐
│                                                                │
│  Tip      [ Sve ] [ Esejska ] [ Blic ]   🔥 Često (8)          │
│                                                                │
│  ──────────────────────────────────────────────────────        │
│                                                                │
│  Predmet                                                       │
│  [ Sve ] [ KMP · 23 ] [ KPP · 18 ] [ GMP · 12 ] [ ... ]   ▶   │
│                                                                │
│  Potkategorija                  ◯ uvijek vidljivo              │
│  [ Sve ] [ Krivična djela ] [ Sankcije ] [ Postupak ]     ▶   │
│  (placeholder kad nema izbora: "Izaberi predmet iznad")        │
│                                                                │
│  Glava                                                         │
│  [ Sve ] [ Glava I ] [ Glava II ] [ Glava III ]            ▶   │
│  (placeholder kad nema potkategorije: "Izaberi potkategoriju") │
│                                                                │
│  ──────────────────────────────────────────────────────        │
│                                                                │
│  Redoslijed (samo Učenje)                                      │
│  ┌──────────────┬──────────────┬──────────────────────┐        │
│  │ Hronološki   │ Najslabija   │ Najmanje čitana      │        │
│  │ ListOrdered  │ TrendDown    │ Eye                  │        │
│  │ aktivno...   │ desc...      │ desc...              │        │
│  └──────────────┴──────────────┴──────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

           [ Počni učenje (12 modula) ]  ← full width ispod
```

### Konkretne izmjene

**1. `FilterSetup.tsx` (Učenje) i `ReviewSetup.tsx` (Konsolidacija):**
- Promijeniti kontejner sa `max-w-xl` (576 px) na `max-w-3xl` (768 px) — **30% više površine**, ali i dalje centrirano i čitljivo.
- U `FilterSetup.tsx` proslijediti `sortMode` + `onSortModeChange` + `SORT_OPTIONS` u `SessionFilters` kao **opcioni prop** `sortControl` — kad postoji, panel renderuje "Redoslijed" sekciju unutra. Konsolidacija nema sort, pa ostaje bez te sekcije (prop je opcioni).

**2. `SessionFilters.tsx` — ključne izmjene:**

- **Potkategorija sekcija UVIJEK vidljiva** (ne više `AnimatePresence` skrivanje):
  - Ako nema `selectedCategory`: prikaži disabled placeholder pill "Najprije izaberi predmet" (cursor-default, opacity-50).
  - Ako ima `selectedCategory` ali `availableSubs.length === 0`: prikaži pill "Nema potkategorija u ovom predmetu".
  - Inače: postojeći pillovi "Sve" + lista. **Funkcionalnost identična, samo se vidi da postoji.**

- **Glava sekcija UVIJEK vidljiva** sa istom logikom:
  - "Najprije izaberi potkategoriju" / "Nema glava" / pillovi.

- **Nova opciona sekcija "Redoslijed"** na dnu kartice (renderuje se samo ako je `sortControl` prop prisutan):
  ```tsx
  {sortControl && (
    <>
      <div className="h-px bg-border/60" />
      <div className="space-y-2">
        <label>Redoslijed</label>
        <div className="grid grid-cols-3 gap-2">
          {sortControl.options.map(...)}  // 3 kartice u redu
        </div>
      </div>
    </>
  )}
  ```
  Pošto je panel sad širi (max-w-3xl), tri sort kartice stanu lijepo u red umjesto vertikalnog stack-a.

- **Header "Filteri sesije"** umjesto golog "Filteri" + brojač desno (već postoji).

**3. Dugme "Počni" ostaje izvan panela** (full-width ispod) — ne mijenja se.

### Šta NE diram (garancija da se ništa ne uklanja)

- Tip kartice (Sve / Esejska / Blic) — **ostaje**.
- "Često na ispitu" badge — **ostaje**.
- Predmet pillovi sa count badge-om — **ostaju**.
- Potkategorija pillovi — **ostaju**, samo se sekcija UVIJEK prikazuje sa placeholder-om kad je prazna.
- Glava pillovi — **ostaju**, isti tretman.
- `framer-motion` `layoutId` animacije aktivnog pilla — **ostaju**.
- `ScrollableRow` horizontalni scroll — **ostaje**.
- Live brojač "X / Y modula" — **ostaje**.
- Sve callback prop-ove (`onSelectCategory`, `onSelectSubcategory`, `onSelectChapter`, `onToggleExamFrequent`, `onFilterTypeChange`) — **ostaju, signature nepromijenjen**.
- `SORT_OPTIONS` u `FilterSetup.tsx` — **ostaje**, samo se proslijedi kao prop umjesto da se renderuje vlastiti blok.
- Konsolidacija (`ReviewSetup.tsx`) NE dobija "Redoslijed" jer ga nikad nije imala — sortiranje za konsolidaciju je interno (stabilization/critical/hardest mode).

### Fajlovi

1. **`src/components/SessionFilters.tsx`** — ~30 izmijenjenih linija
   - Dodati opcioni `sortControl` prop sa tipom `{ value: SortMode, onChange: (s: SortMode) => void, options: SortOption[] }`.
   - Zamijeniti `AnimatePresence` skrivanje potkat/glava sa uvijek-vidljivim sekcijama + smart placeholder pillovima.
   - Dodati conditional "Redoslijed" sekciju na dnu (renderuje samo ako je `sortControl` definisan).

2. **`src/components/learn/FilterSetup.tsx`** — ~15 izmijenjenih linija
   - Promijeniti `max-w-xl` → `max-w-3xl`.
   - Ukloniti samostalni "Redoslijed" blok (linije 75-90).
   - Proslijediti `sortControl={{ value: sortMode, onChange: onSortModeChange, options: SORT_OPTIONS }}` u `SessionFilters`.

3. **`src/components/review/ReviewSetup.tsx`** — 1 linija
   - Promijeniti `max-w-xl` → `max-w-3xl` na linijama 179 i 274 da step 1 (mode) i step 2 (filteri) budu konzistentni.

**Ukupno: 3 fajla, ~50 linija. 0 uklonjenih funkcionalnosti. Panel postaje širi, organizovaniji, i jasno pokazuje sve dostupne opcije čak i kad neke nisu trenutno aktivne.**

