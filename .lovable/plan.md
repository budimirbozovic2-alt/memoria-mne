## Faza 2 — Arhitektonsko čišćenje i performanse

### Obim

1. **Dekompozicija `planner-storage.ts`** (576 LOC, 25+ exports — God Module).
2. **Dekompozicija `ZettelkastenView.tsx`** (587 LOC — Orchestrator + UI mixed).
3. **B2/B4 optimizacije** — pretpostavljam:
   - **B2**: Dexie čitanja u `useDashboardData` / `loadArticlesBySubject` koja ne koriste compound indekse.
   - **B4**: `backlinkIndex.rebuildFromAll` puca cijeli subject pri svakom save → inkrementalna delta.

Ako B2/B4 znače nešto drugo u tvojoj internoj numeraciji, javi prije izvršenja.

---

### 1. Planner-storage split

Modul ima 4 jasne odgovornosti — razbijam u namespace folder `src/lib/planner/`:

```
src/lib/planner/
  index.ts                  // re-exports za backward compatibility
  cache.ts                  // initPlannerCache + ref state + enqueueWrite mutex
  config.ts                 // PlannerConfig type, DEFAULT_CONFIG, loadPlanner, savePlanner
  velocity.ts               // calcVelocity, calcEstimatedFinish, getProjectionText
  phases.ts                 // StudyPhase, PhaseProgress, calcPhaseProgress, getPhaseDisciplinePct
  suggestions.ts            // SmartSuggestion, getSmartSuggestion, calcRebalancedQuota,
                            //   calcDailyTimeRecommendation, getPlannerStatus
  discipline.ts             // DisciplineEntry/Status, save/load/recordDay/calc/Emoji/Label,
                            //   getCognitiveDebt, getDisciplineTrend
  daily-mapped.ts           // getDailyMappedCount, incrementDailyMapped, autoRedistributeIfNeeded
  burnup.ts                 // buildBurnupData
  plan-generator.ts         // generateStudyPlan, calcLearningReviewRatio
```

`src/lib/planner-storage.ts` postaje 1-line re-export shim:
```ts
export * from "./planner";
```

Mutex (`enqueueWrite`) ostaje u `cache.ts` i koriste ga svi pisci. Test po-modulu postaje moguć.

### 2. ZettelkastenView dekompozicija (Orchestrator pattern)

Ekstrahuj poslovnu logiku u hook-ove, view-komponenta ostaje "dumb shell":

```
src/views/ZettelkastenView.tsx           // ~150 LOC: layout + composition
src/hooks/zettelkasten/
  useZettelkastenState.ts                // articles, activeId, isEditing, draft, indexArticleId
  useZettelkastenActions.ts              // save, delete, create, rename (saveDraft + backlinkIndex hooks)
  useZettelkastenIndexBootstrap.ts       // initial loadArticlesBySubject + ensureIndexArticle
  useExplorerCollapsed.ts                // localStorage-persisted explorer toggle
```

Header/explorer/preview/editor već postoje kao podkomponente — samo se prosljeđuju props iz hook-ova.

### 3. B2 — Dexie compound index audit

- Dashboard: provjeriti da `useDashboardData` query-ja kartice po `[categoryId+subcategoryId]` umjesto in-memory filtera.
- `loadArticlesBySubject` već koristi `subjectId` — OK.
- `mindMaps.where("categoryId")` u cascade — OK (postoji index).
- `mnemonics.where("categoryId")` — provjeriti da postoji `categoryId` index (postoji v10).

Ako neki query radi `toArray()` + JS filter, prebaciti na indexed query.

### 4. B4 — Inkrementalni backlink rebuild

Trenutno u `ZettelkastenView` initial load:
```ts
backlinkIndex.rebuildFromAll(categoryId, merged);  // O(N × avgLinks) per mount
```
A `eventBus` već šalje per-article updates → `upsertArticle` se može koristiti jedanput po članku umjesto full rebuild kada se pojedini članak izmjeni. Trenutno postoji subscription na `EVENT_TYPES` koji već poziva `upsertArticle` pa je incremental put već implementiran.

**Stvarni B4 problem**: `rebuildFromAll` u `useEffect [categoryId, categoryRec]` se okida i kada se samo `categoryRec` promijeni (npr. rename subkategorije). Treba okidati samo kada se zapravo promijeni `categoryId`. Fix:
- Razdvojiti boot effect na `[categoryId]` only.
- Ne pozivati `rebuildFromAll` ako je već izgrađen — zaštita `if (backlinkIndex.hasSubject(subjectId)) skip`.
- Dodati `hasSubject(subjectId)` u `BacklinkIndex` (provjera da li `subjects.has(id)`).

### 5. Memory update

Nova memorija `mem://architecture/planner-decomposition` i `mem://architecture/zettelkasten-orchestrator-v2`. Update `mental-maps`/`backlink` ref ako postoji.

---

### Bez izmjena

- API surface ostaje 100% kompatibilan (re-export shim).
- Nema schema migracija.
- Nema UI/UX promjena.

### Pitanje pred izvršenjem

**Da li B2 misliš na Dashboard query strategiju, ili na nešto specifičnije** (npr. specifična metrika u `analytics/`)? Ako je nešto specifičnije, dopuni prije nego krenem.

Nastavak se okida čim odobriš.
