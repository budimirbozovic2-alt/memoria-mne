## Plan: Razbijanje `src/lib/spaced-repetition.ts` God Object

### Cilj
Mehanički podijeliti 489-linijski FSRS modul u 6 fokusiranih fajlova u `src/lib/sr/`. **Nikakva matematika niti ponašanje se ne mijenja** — samo se kod premješta. `src/lib/spaced-repetition.ts` ostaje kao thin **barrel re-export** da svih **91 postojećih potrošača** rade nepromijenjeno.

### Nova struktura

```text
src/lib/
├── spaced-repetition.ts      (~50 linija — barrel; re-eksportuje sve iz sr/)
└── sr/
    ├── types.ts              (Card, Section, SectionState, SRSettings,
    │                          DEFAULT_SR_SETTINGS, FrequencyTag, SourceType,
    │                          CardSourceType alias, ExaminerProfile re-export,
    │                          ErrorLogEntry, ErrorStatus, SourceModule,
    │                          ReviewGrade)
    ├── adaptive.ts           (AdaptiveContext, AdaptiveReason, AdaptiveModifiers,
    │                          computeAdaptiveModifiers, clamp helper,
    │                          RETENTION_MIN/MAX, INTERVAL_MULT_MIN/MAX)
    ├── algorithm.ts          (INITIAL_VALUES, nextState, calculateInterval,
    │                          calculateNextReview, getCachedRetention,
    │                          isLeech, getDueCards, getDueSections,
    │                          getCardNextReview, getPendingFirstReviewCount)
    ├── retrievability.ts     (getRetrievability, getCardRetrievability,
    │                          getSectionScore, getCardScore)
    ├── factories.ts          (createSection, createCard, createFlashCard,
    │                          getErrorStatus)
    └── format.ts             (GRADES, FREQUENCY_TAGS, SOURCE_TYPES, CARD_TAGS,
                               formatInterval, previewIntervals)
```

### Mapa premještanja (linija → fajl)

| Trenutne linije `spaced-repetition.ts` | Cilj |
|---|---|
| 3, 5 (`ExaminerProfile` import + re-export), 115–157, 165–177, 179–234 (svi tipovi i konstante) | `sr/types.ts` |
| 11–101 (cijela adaptive sekcija + `clamp`, RETENTION/INTERVAL granice) | `sr/adaptive.ts` |
| 104–113 (getCachedRetention), 236–367 (INITIAL_VALUES, clampDifficulty, getElapsedDays, nextState, calculateInterval, calculateNextReview, isLeech), 410–412, 440–458 (due/leech queries) | `sr/algorithm.ts` |
| 460–487 (getRetrievability, getCardRetrievability, getSectionScore, getCardScore) | `sr/retrievability.ts` |
| 159–163 (getErrorStatus), 392–408, 414–438 (createSection, createCard, createFlashCard) | `sr/factories.ts` |
| 168–177 (FREQUENCY_TAGS, SOURCE_TYPES), 205–208 (CARD_TAGS), 217–222 (GRADES), 369–390 (formatInterval, previewIntervals) | `sr/format.ts` |

### `spaced-repetition.ts` nakon refaktora (~50 linija)

Ostaje na istoj putanji kao **barrel** — re-eksportuje sve simbole koje 91 fajlova trenutno importuje. Sadržaj:

```ts
// Barrel: zadržan da postojeći importi nastave da rade.
// Novi kod neka importuje direktno iz @/lib/sr/<modul>.
export * from "./sr/types";
export * from "./sr/adaptive";
export * from "./sr/algorithm";
export * from "./sr/retrievability";
export * from "./sr/factories";
export * from "./sr/format";
```

### Tehnička pravila izvršenja

1. **Zero math change** — kopiranje verbatim. Brojni literali (0.05, 0.3, 3.0, 5.0, log(0.9) itd.) ostaju identični.
2. **Cross-module imports** unutar `sr/`:
   - `algorithm.ts` → `types.ts`, `adaptive.ts`, `../app-settings`
   - `adaptive.ts` → `types.ts` samo
   - `retrievability.ts` → `types.ts` samo
   - `factories.ts` → `types.ts` samo
   - `format.ts` → `types.ts`, `adaptive.ts`, `algorithm.ts`
   - `types.ts` → `../db-schema` (za `ExaminerProfile`)
   - **Bez ciklusa** — DAG je čist.
3. **Internal helpers** (`clampDifficulty`, `getElapsedDays`) ostaju `function`-scope unutar `algorithm.ts` (bez `export`-a) jer ih niko spolja ne koristi.
4. **`SourceType` alias** — audit explicitno traži `SourceType`. Postojeći kod koristi `CardSourceType`. Eksportovaću **oba** (`SourceType = CardSourceType`) iz `types.ts` da nema breakage-a.
5. **91 fajlova-potrošača ostaje nepromijenjeno** u prvoj fazi — barrel ih sve servisira. Komentar u barrelu upućuje budući kod da koristi specifične `@/lib/sr/*` putanje.
6. **Internal sweep (opciono)** — prepravka unutrašnjih importa unutar `src/lib/` (npr. `card-buckets.ts`, `db-schema.ts`, `planner-storage.ts`, `card-ordering.ts`, `mastery.ts`, `auto-link-suggestion.ts`, `coverage-analysis.ts`, `source-coverage.ts`, `db-queries.ts`, `persist-queue.ts`, `review-mode-builder.ts`) tako da koriste nove specifične putanje. Komponente i hookovi ostaju na barrelu (89% slučajeva) jer dotiču po 5–8 simbola iz različitih modula i nema vrijednosti od micro-managementa.

### Out of scope
- Bilo kakva izmjena FSRS koeficijenata ili rasporeda.
- Mijenjanje internih helpera (`clampDifficulty` itd.) ili API-ja.
- Test fajlovi ostaju na barrelu (trebaju u jednom importu da provjeravaju cijeli surface).

### Verifikacija
- TypeScript kompajlira bez grešaka (svi 91 fajlova još uvijek razrješavaju simbole kroz barrel).
- `src/test/spaced-repetition.test.ts` prolazi nepromijenjen.
- Konzole bez upozorenja o cikličnim importima.
- Veličina svake nove datoteke ostaje pod 200 linija (lakše za HMR i čitanje).
