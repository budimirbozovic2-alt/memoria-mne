

# Proširenje unit testova za FSRS algoritam i kritične module

## Trenutno stanje
- **4 test fajla** za ~42K LOC (ocjena 3/10 iz deep audita)
- Postojeći testovi: `auto-split.test.ts`, `selection-split.test.ts`, `persist-queue-c3c4.test.ts`, `example.test.ts`
- **Nula testova** za FSRS algoritam, planner logiku, source coverage, formatiranje

## Plan — 3 nova test fajla

### 1. `src/test/spaced-repetition.test.ts` — FSRS algoritam (~25 testova)

Pokriva sve exportovane pure funkcije iz `spaced-repetition.ts`:

**calculateInterval**
- Vraća 0 za stability ≤ 0
- Koristi custom targetRetention kad je proslijeđen
- Default retention 0.95 daje očekivane intervale

**calculateNextReview (state machine)**
- New + grade 1 → Learning, stability 0.1, lapses +1
- New + grade 3 → Learning + firstReviewPending=true, 15min delay
- New + grade 4 → Learning + firstReviewPending=true, 20min delay
- Learning + grade 1 → ostaje Learning
- Learning + grade 3 → Review
- Review + grade 1 → Relearning, stability * 0.05, lapses +1, 20min delay
- Review + grade 2 → Review, stability * 0.3, max 24h
- Review + grade 3 → Review, stability * 3 + 1
- Review + grade 4 → Review, stability * 5 + 2, difficulty -1
- firstReviewPending + grade ≥ 3 → Review, pending=false
- firstReviewPending + grade < 3 → Learning, 10min delay, pending=true
- Difficulty clamped [1, 10]

**formatInterval**
- < 1h → "Xmin"
- < 1d → "Xh"
- < 30d → "Xd"
- < 365d → "Xmj"
- ≥ 365d → "X.Xg"

**isLeech**
- lapses ≥ threshold → true
- lapses < threshold → false
- Custom threshold

**getRetrievability**
- New section → 0
- stability ≤ 0 → 0
- Just reviewed → ~100
- Elapsed time reduces value

**getCardScore, getSectionScore**
- New → 0
- High stability + low difficulty → high score
- Bounded 0-100

**getDueCards, getDueSections**
- Filtrira samo non-New sa nextReview ≤ now
- Sortira po nextReview

**getStats**
- Pravilno broji due, total, learnedSections, leechCount

### 2. `src/test/planner-logic.test.ts` — Planner pure funkcije (~12 testova)

Pokriva pure funkcije iz `planner-storage.ts` (bez IDB zavisnosti):

- `calcVelocity` — prosjek po danu za zadnjih N dana
- `calcEstimatedFinish` — velocity 0 → null, remaining 0 → today
- `getPlannerStatus` — green/yellow/red/no-goal granice
- `calcRebalancedQuota` — no goal → null, korektna distribucija
- `calcDisciplineStatus` — diligent/neutral/lazy pragovi
- `calcDailyTimeRecommendation` — konverzija sekcija u minute/sate
- `calcLearningReviewRatio` — 4 faze (0-20, 20-50, 50-80, 80+)
- `getProjectionText` — velocity 0 poruka, remaining 0 poruka

### 3. `src/test/source-coverage.test.ts` — Coverage matching (~8 testova)

- `stripHtmlText` — uklanja tagove, dekodira entitete
- `normalizeMatchText` — lowercase + trim + collapse whitespace
- `collectSourceCoverageModules` — filtrira po sourceId, sourceModules vs fallback
- Snippet matching — snippet < 10 chars se odbacuje

## Tehnički detalji

- Svi testovi koriste **pure funkcije** — nema DB/DOM zavisnosti
- `spaced-repetition.test.ts` mora mockati `localStorage` za `getCachedRetention` (ili proslijeđivati explicit targetRetention)
- `planner-logic.test.ts` testira samo exportovane pure funkcije, ne IDB operacije
- Helper za kreiranje test sekcija i kartica na vrhu svakog fajla

## Fajlovi

| Fajl | Tip | ~Testova |
|------|-----|----------|
| `src/test/spaced-repetition.test.ts` | **NOVI** | ~25 |
| `src/test/planner-logic.test.ts` | **NOVI** | ~12 |
| `src/test/source-coverage.test.ts` | **NOVI** | ~8 |

## Scope
- 3 nova fajla, ~45 testova ukupno
- Pokriva 3 najkritičnija modula
- Podiže test coverage sa 3/10 na ~5-6/10

