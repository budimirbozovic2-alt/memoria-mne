# Refaktorisanje `useSourceReaderActions` → A/A/A + batch implementacija sa AutoSplitDialog

## Trenutno stanje (`useSourceReaderActions.ts`, 525 lin.)

Hook je narastao u "boga svega": miješa **5 različitih odgovornosti**.

### Detektovani prekršaji

| # | Linije | Prekršaj | Princip |
|---|---|---|---|
| 1 | 38-66 | DOM selekcija + globalni `mousedown` listener — manipulacija `window.getSelection()`, `getBoundingClientRect()` u hook-u | UI/Logika |
| 2 | 99-169 | `handleSmartSplitConfirm` zna sve o `splitMode`, gradi `sections`/`sourceModules`/`childCardIds`, zove `addCard`, `incrementDailyMapped`, `dispatchEvent`, toast | SOA (domen+I/O+UI) |
| 3 | 207-247 | `handleMapSelection` duplira logiku gradnje sekcija/sourceModules iz `handleSmartSplitConfirm` | SSOT |
| 4 | 249-368 | `handleSetHeading`/`handleFormatAsList`/`handleFormatSelectionAs` — 120 linija direktne DOM manipulacije + `saveSource`/`extractOutline`/`injectHeadingIds`/`parseArticles` inline | UI/Logika + SOA |
| 5 | 446-490 | `handleAutoFormatArticles` + `persistContent` — ista I/O sekvenca (sanitize → outline → articles → saveSource) ponovljena **4 puta** u fajlu | SSOT |
| 6 | 412-430 | Globalni keyboard listener u istom hook-u | SOA |
| 7 | 383-402 | Sopstveni Zustand subscribe + `window.addEventListener` cleanup za heading menu | SOA |

`useState` nema, ali hook drži **ref + 4 useEffect-a + 16 callback-a** i raspoređen je između 3 različita izvora podataka (Zustand store, AppContext, `source` prop).

---

## Ciljana arhitektura (4 sloja, isti šablon kao HealthMonitor / SpeedReader)

### 1. Domenski sloj — `src/lib/source-reader/`

Čiste funkcije, bez Reacta i bez baze. Ovdje se centralizuje **gradnja kartica** koja je trenutno duplirana u 3 funkcije.

**`build-essay-payload.ts`**
- `buildSeparateEssaysFromModules(modules, edits, source, sub, chap)` → `Array<AddCardArgs>`
- `buildCombinedEssayFromModules(modules, edits, parentName, source, sub, chap)` → `AddCardArgs | null`
- `buildEssayFromSelection(text, html, question, source)` → `AddCardArgs` (za exam mapping single-shot)
- `buildLinkPatch(card, snippetText, snippetHtml, sourceId, appendSnippet)` → `Card`

Tip `AddCardArgs = { question, sections, categoryId, subId?, chapId?, options }`.

**`source-html-pipeline.ts`** — eliminiše duplikat "sanitize → injectHeadingIds → outline → parseArticles → saveSource":
- `rebuildSourceFromHtml(source, rawHtml): Promise<Source>` — pure transform + jedan `saveSource` poziv
- `applyHeadingChange(container, el, level): { html }` — pure DOM op
- `applyListWrap(container, range, type): { html }` — pure DOM op

### 2. I/O / Servisni sloj — `src/lib/services/sourceEditingService.ts`

Tanak omotač oko `sources-storage` + `planner-storage`:
- `persistSourceHtml(source, container.innerHTML, onSourceUpdated)`
- `persistAutoFormat(source, onSourceUpdated)`
- `commitMappingCreated(count)` → `incrementDailyMapped(count) + dispatchEvent("codex-mapping-created")`

Hook nikad više ne `import()` direktno `sources-storage`/`article-parser`/`article-autoformat` u 4 različita callback-a.

### 3. Decomposed hooks (orkestracija)

Razbijamo monolit na **3 fokusirana hook-a** koja koristi `SourceReader.tsx`:

**`useSourceSelection.ts`** (~70 lin.)
- DOM selekcija + globalni mousedown reset (linije 38-66)
- Vraća: `{ contentRef, handleMouseUp, clearSelection }`
- Sav DOM accessible kroz Zustand store kao i sad

**`useSourceMapping.ts`** (~120 lin.)
- Esej/split/link/exam akcije (linije 71-247)
- Zove `build-essay-payload` + `addCard`/`patchCard` + `commitMappingCreated`
- Vraća: `{ handleConvertToEssay, handleSmartSplitConfirm, handleLinkToExisting, handleLinkConfirm, handleMapSelection }`

**`useSourceEditing.ts`** (~140 lin.)
- Heading menu + format + auto-format + autosave (linije 249-502)
- Zove `source-html-pipeline` + `sourceEditingService`
- Vraća: `{ handleSetHeading, handleFormatSelectionAs, handleContextMenu, handleAutoFormatArticles, handleEditInput, handleInlineFormat, scrollToHeading }`

**`useSourceReaderShortcuts.ts`** (~30 lin.)
- Samo keyboard listener (linije 412-430), prima `{ onConvertToEssay }`

### 4. Fasada — `useSourceReaderActions.ts` (~50 lin.)

Postaje tanak agregator koji zove gornja 4 hook-a i vraća isti `{ contentRef, derived, actions }` API kao danas — **`SourceReader.tsx` nema promjena**.

```ts
export function useSourceReaderActions(source, onSourceUpdated) {
  const { cards } = useCardData();
  const sel = useSourceSelection();
  const map = useSourceMapping(source, sel.contentRef);
  const edit = useSourceEditing(source, sel.contentRef, onSourceUpdated);
  useSourceReaderShortcuts({ onConvertToEssay: map.handleConvertToEssay });
  const sourceCards = useMemo(() => cards.filter(c => c.sourceId === source.id), [cards, source.id]);
  const safeHtml = useMemo(() => sanitizeHtml(source.htmlContent), [source.htmlContent]);
  return {
    contentRef: sel.contentRef,
    derived: { sourceCards, safeHtml, linkedCount: sourceCards.length, cards },
    actions: { ...sel, ...map, ...edit },
  };
}
```

---

## Batch plan (oba refaktora u jednom prolazu)

Pošto su oba čisto interna i ne mijenjaju public API, izvršavamo ih **paralelno u istom commit-u**:

### Faza A — AutoSplitDialog (po prethodno odobrenom planu)
1. `src/lib/auto-split/import-planner.ts` (čisti domen)
2. `src/lib/services/autoSplitImportService.ts` (I/O + persistQueue + db.cards.count provjera)
3. `src/hooks/useAutoSplitImport.ts` (orkestrator)
4. `src/components/AutoSplitDialog.tsx` → dumb UI (~140 lin.)
5. `src/test/auto-split-import-planner.test.ts`

### Faza B — useSourceReaderActions
6. `src/lib/source-reader/build-essay-payload.ts`
7. `src/lib/source-reader/source-html-pipeline.ts`
8. `src/lib/services/sourceEditingService.ts`
9. `src/hooks/source-reader/useSourceSelection.ts`
10. `src/hooks/source-reader/useSourceMapping.ts`
11. `src/hooks/source-reader/useSourceEditing.ts`
12. `src/hooks/source-reader/useSourceReaderShortcuts.ts`
13. `src/hooks/useSourceReaderActions.ts` → fasada (~50 lin.)
14. `src/test/source-reader-build-essay.test.ts` (testira buildSeparate/buildCombined/buildLinkPatch)

### Faza C — Verifikacija
- `bunx vitest run` (postojeći testovi + 2 nova suite-a)
- Smoke check: `SourceReader.tsx` i `AutoSplitDialog.tsx` ne uvoze direktno `db`, `persistQueue`, `sources-storage` u callback-ima.

---

## Ocjene nakon refaktora

| Modul | SSOT | SOA | UI vs Logika |
|---|---|---|---|
| AutoSplitDialog | A | A | A |
| useSourceReaderActions (fasada) | A | A | A |
| build-essay-payload | A | A | n/a |
| source-html-pipeline | A | A | n/a |

## Garancije
- `SourceReader.tsx` i `AutoSplitDialog` zadržavaju **identičan public API** i ponašanje (isti toast-ovi, isti event-i, isti shortcuts).
- Svi side-effect-i (`incrementDailyMapped`, `dispatchEvent`, `toast`) ostaju samo u orkestratorskim hook-ovima — nisu rasuti po domenskim funkcijama.
- Nema novih dependencija.

Ako odobravaš ovaj batch plan, krećem direktno u implementaciju oba refaktora.
