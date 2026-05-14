# Plan: Refaktor `ZettelkastenView` i `MnemonicTest` (SSOT/SOA/UI ↔ Logika)

Cilj: oba "Fat" fajla pretvoriti u tanke orkestratore, izvlačeći domensku logiku, perzistenciju i state-machine u namjenske hookove i čiste funkcije. Postojeći javni API (props i ponašanje) ostaje identičan.

---

## DIO A — `ZettelkastenView.tsx` (596 → cilj < 250 LOC)

### Trenutni problemi (mapirano na linije)
1. **Mutacije** (`handleCreate`, `handleDelete`, `handleWikiLink`, `flushDraft`) — 211–355: direktno pozivaju `saveArticle`, `deleteArticle`, `bulkCreateArticlesIfMissing`, `getArticle`, emituju event-bus, kao i `toast` side effect.
2. **In-flight dedupe** (`wikiLinkInFlightRef`) — 304–355: čista coordination logika ne pripada render fajlu.
3. **Draft state** (92, 148–197, 262–279): `useState<Draft>` + `flushRef` + cleanup-flush + dirty-check su jedna cjelina.
4. **Derived sets** (`existingTitleSet`, `emptyTitleSet`) — 108–137: dovoljno samostalna selektor logika.
5. **Index-aware navigacija** (`handleBackToIndex`, `handleDelete` fallback na `indexArticleId`) — provlači se kroz handler-e.

### Nova arhitektura (4 sloja)

```text
ZettelkastenView (UI shell, < 250 LOC)
   │
   ├── useZettelkastenBootstrap   (postojeći — bez izmjena)
   ├── useArticleIndex            (NOVO — derived/title sets + indexArticleId selektori)
   ├── useArticleDraft            (NOVO — draft state + flush + dirty + cleanup)
   └── useArticleMutations        (NOVO — create/delete/wiki-link + in-flight dedupe + event-bus)
```

#### A1. `src/hooks/zettelkasten/useArticleDraft.ts` (NOVO, ~110 LOC)
- Vlasnik: `draft`, `isEditing`, `editorRef`, `flushRef`.
- API:
  ```ts
  {
    draft, isEditing, editorRef,
    enterEdit(article), exitEdit(),
    updateDraft(patch),               // setDraft({...draft, ...patch})
    flush(): Promise<KnowledgeBaseArticle | null>,
    saveAndClose(): Promise<void>,
    resetForArticle(article | null),  // koristi se na open()
  }
  ```
- Implementira: dirty-check, `getArticle(activeId)` fresh-read prije snimanja (linija 154), normalizaciju aliasa, `saveArticle` + emit `KB_ARTICLE_UPSERTED`, toast na grešku.
- Cleanup-flush effect (linije 192–197) seli ovdje.

#### A2. `src/hooks/zettelkasten/useArticleMutations.ts` (NOVO, ~120 LOC)
- Ulaz: `{ categoryId, articles, setArticles, indexArticleId, activeArticle, setActiveId, draftApi, articleIndexApi }`.
- API: `{ create(title?), open(id), backToIndex(), remove(activeArticle), wikiLink(title) }`.
- Vlasnik: `wikiLinkInFlightRef` + `bulkCreateArticlesIfMissing` + `findArticleByTitle` + `backlinkIndex.resolveTargetToArticleId`.
- Sve mutacije uvijek prvo `await draftApi.flush()`, pa apply, pa `eventBus.emit(...)`. Jedno mjesto za toast poruke.

#### A3. `src/hooks/zettelkasten/useArticleIndex.ts` (NOVO, ~50 LOC)
- Čisti selektori nad `articles`:
  - `activeArticle(activeId)`
  - `existingTitleSet`, `emptyTitleSet` (memo, isto pravilo "skip kad je `isEditing`")
  - `indexArticleId` (već vraća bootstrap, ali centralizujemo getter ovdje za konzistentnost)
- Ulaz: `{ articles, activeId, isEditing }`.

#### A4. `src/views/ZettelkastenView.tsx` (refactor, ~230 LOC)
- Ostaje: routing guards, layout (Explorer + main pane), JSX render, `LinkedSourcesPicker` / `ZettelTagEditor` / `ZettelAliasEditor` / `BacklinksPanel` / `Sheet` / `MindMapPickerDialog`.
- Postaje "thin wiring":
  ```tsx
  const draftApi = useArticleDraft({ activeId, categoryId, setArticles });
  const indexApi = useArticleIndex({ articles, activeId, isEditing: draftApi.isEditing });
  const mutations = useArticleMutations({ categoryId, articles, setArticles,
                                          indexArticleId, activeArticle: indexApi.activeArticle,
                                          setActiveId, draftApi });
  useWikiLinkAutoCreate({ ... }); // ostaje nepromijenjen
  ```
- Sve `setDraft({ ...draft, x })` postaju `draftApi.updateDraft({ x })`.

### Verifikacija (Dio A)
- Novi test: `src/test/zettelkasten-article-draft.test.ts` — dirty-check matriks (title/content/sources/tags/aliases) + "fresh-read prije save" scenario (simulira upsert između tipkanja i flush).
- Novi test: `src/test/zettelkasten-mutations.test.ts` — `wikiLink` paralelni pozivi za isti naslov rezultiraju jednim `bulkCreateArticlesIfMissing` pozivom (in-flight dedupe).
- Postojeći testovi (`zettelkasten-*`) moraju proći bez izmjena.

---

## DIO B — `MnemonicTest.tsx` (442 → cilj < 100 LOC shell)

### Trenutni problemi
- 12 `useState` poziva (24, 39–41, 71–77) miješaju filtere, queue, fazu, tajmer, statistiku.
- Tajmer (`useEffect` 82–98) + `setInterval` ref + state machine prelaza žive u render fajlu.
- `categoryTree`, `hookTypeCounts`, `filteredTestable`, `uuidToName` (27–69) su čiste funkcije pomiješane s render-om.
- Sva 4 prikaza (selector / reminder / test / finished) žive u jednoj ogromnoj komponenti.

### Nova arhitektura

```text
MnemonicTest (shell, < 100 LOC) — gleda phase, render <Selector|Reminder|TestRunner|Finished>
   │
   ├── lib/mnemonic/test-tree.ts       (NOVO — pure: buildCategoryTree, hookTypeCounts, filterTestable)
   └── hooks/mnemonic/useTestEngine.ts (NOVO — state machine + tajmer + queue + statistika)
```

#### B1. `src/lib/mnemonic/test-tree.ts` (NOVO, ~50 LOC, čiste funkcije)
- `buildCategoryTree(cards): Record<categoryId, Set<subId>>`
- `buildHookTypeCounts(cards): Record<HookType, number>`
- `filterTestable(cards, { category, subcategory, hookType }): MnemonicCard[]`
- `buildUuidToName(categoryRecords): Record<string, string>`

#### B2. `src/hooks/mnemonic/useTestEngine.ts` (NOVO, ~150 LOC)
- Vlasnik:
  - `phase: "selector" | "reminder" | "test" | "finished"` (useReducer preferiran)
  - `queue`, `currentIndex`, `showTrigger`, `timerActive`, `timeLeft`, `timedOut`, `sessionStats`
  - `timerRef` (interval) + cleanup
- API:
  ```ts
  {
    phase, currentCard, queue, currentIndex,
    showTrigger, timeLeft, timedOut, sessionStats,
    startSession(filteredCards), startRecall(),
    answer(success), gotoSelector(), enterTestPhase(),
  }
  ```
- Konstanta `RECALL_TIME_LIMIT` izložena kao `engine.recallLimit`.

#### B3. Pod-komponente faza (NOVO u `src/components/mnemonic/`)
- `MnemonicTestSelector.tsx` (~140 LOC) — filtri (kategorija/podkat/hook tip) + Start dugme.
- `MnemonicTestReminder.tsx` (~50 LOC) — animirani intro ekran.
- `MnemonicTestRunner.tsx` (~150 LOC) — kartica, tajmer, okidač, dugmad.
- `MnemonicTestFinished.tsx` (~50 LOC) — rezime + restart.
- "Empty state" (139–152) ostaje inline u shell-u.

#### B4. `src/components/MnemonicTest.tsx` (refactor, ~80 LOC shell)
```tsx
export default function MnemonicTest({ cards, onRecordResult, onBack }) {
  const { categoryRecords } = useCategoryData();
  const allTestable = useMemo(() => cards.filter(c => c.mnemonicStatus !== "new"), [cards]);
  const tree   = useMemo(() => buildCategoryTree(allTestable), [allTestable]);
  const counts = useMemo(() => buildHookTypeCounts(allTestable), [allTestable]);
  const names  = useMemo(() => buildUuidToName(categoryRecords), [categoryRecords]);
  const engine = useTestEngine({ onRecordResult });

  if (allTestable.length === 0) return <EmptyState onBack={onBack} />;
  switch (engine.phase) {
    case "selector": return <MnemonicTestSelector ... />;
    case "reminder": return <MnemonicTestReminder ... />;
    case "test":     return <MnemonicTestRunner ... />;
    case "finished": return <MnemonicTestFinished ... />;
  }
}
```
- Filter `useState` ostaju u `MnemonicTestSelector` (lokalni mu state — vraća konačni `filteredTestable` u `engine.startSession`).

### Verifikacija (Dio B)
- Novi test: `src/test/mnemonic-test-tree.test.ts` — `buildCategoryTree`, `filterTestable`, `buildUuidToName`.
- Novi test: `src/test/mnemonic-test-engine.test.ts` — fake timers (`vi.useFakeTimers`): tajmer odbrojava do 0 → `timedOut=true`, `answer(true/false)` ažurira stats i napreduje queue, na kraju queue → `phase="finished"`.

---

## Plan izvršavanja (jedan commit, batch)

1. Dio A: kreirati `useArticleDraft.ts`, `useArticleMutations.ts`, `useArticleIndex.ts`; refaktor `ZettelkastenView.tsx`.
2. Dio B: kreirati `lib/mnemonic/test-tree.ts`, `hooks/mnemonic/useTestEngine.ts`, 4 pod-komponente; refaktor `MnemonicTest.tsx`.
3. Dodati 4 nova test fajla.
4. `vitest run` lokalno (sva postojeća + nova) — paritet ponašanja je nepregovorljiv.

### Garancije pariteta
- **Toast poruke** identične (tekst, tip, vrijeme prikaza).
- **Event-bus emiti** identični (`KB_ARTICLE_UPSERTED`, `KB_ARTICLE_REMOVED`).
- **In-flight dedupe** za wiki-link sačuvan (paralelni klikovi → jedan IDB write).
- **Tajmer ponašanje** identično (interval 100ms, korak 0.1s, prag `prev <= 0.1`).
- `SourceReader.tsx` i ostali konzumenti ostaju nepromijenjeni (oba refaktora su interna).

### Procjena ocjena nakon refaktora
| Modul | SSOT | SOA | UI vs Logika |
|---|---|---|---|
| `ZettelkastenView` (shell) | A | A | A |
| `useArticleDraft` | A | A | A |
| `useArticleMutations` | A | A | A |
| `MnemonicTest` (shell) | A | A | A |
| `useTestEngine` | A | A | A |
| `lib/mnemonic/test-tree` | A | A | A |
