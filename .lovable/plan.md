## Analiza posljednjih izmjena — pronađene greške i suboptimizacije

Tri kategorije: **kritična greška**, **funkcionalna greška**, **suboptimizacija**.

---

### 🔴 KRITIČNO #1 — Save-on-navigate izgubljen u Zettelkastenu

**Fajl:** `src/hooks/zettelkasten/useArticleDraft.ts`, linije 119–126

```ts
const flushRef = useRef(flush);
useEffect(() => { flushRef.current = flush; }, [flush]);

useEffect(() => {
  return () => { void flushRef.current(); };
}, [activeId]);
```

**Problem:** Cleanup koristi `flushRef.current`, koji se sinkronizuje na NAJNOVIJI `flush` (`useEffect [flush]`). Kad korisnik prebaci A→B:

1. Render sa `activeId=B` → `flush` se rekreira sa `activeId=B`
2. Commit → `flushRef.current = flush(B)`
3. Cleanup starog efekta sa `activeId=A` se pokreće → poziva `flushRef.current()` koji **čita B-jev članak**, ne A-jev
4. `draftRef.current` je već null (jer `open()` poziva `resetForArticle` koji postavlja `draft=null`)
5. Flush vraća null — **A-ovi neuredeni izmjeni se gube bez riječi**

`backToIndex` to izbjegava jer ručno `await draftApi.flush()` prije `setActiveId`. Ali `open()` (klik u Explorer panelu) ne. To je glavni navigacijski put i tu se gube izmjene.

**Test pokriva flush dirty/no-op, ali ne pokriva cleanup-on-activeId-change.**

**Fix:** Zaboraviti `flushRef`. Cleanup mora pozvati flush koji je vezan za STARI `activeId`. Najjednostavnije:

```ts
useEffect(() => {
  return () => { void flush(); }; // koristi closure flush, ne ref
}, [flush]); // dep na flush umjesto activeId
```

ili eksplicitno snimiti staru verziju:

```ts
useEffect(() => {
  const prevFlush = flush;
  return () => { void prevFlush(); };
}, [activeId]); // ili samo [flush]
```

---

### 🔴 KRITIČNO #2 — AutoSplitDialog "done" stanje nestaje odmah

**Fajl:** `src/hooks/useAutoSplitImport.ts`, linije 68–75

```ts
useEffect(() => {
  dispatch({ type: "set", rows: buildArticleRows(detected, linkedCards) });
  setPhase("preview");
  setProgress(0);
  setImportedCount(0);
  setMergeNameDialog(false);
}, [detected, linkedCards]);
```

**Problem:** `linkedCards` se izvodi iz `cards` koji se ažurira nakon `bulkAddCards`. Tok:

1. `startImport` → `executeImportPlan` → `bulkAddCards` mutuje cards
2. `setPhase("done")` se postavlja na kraju
3. Re-render: `linkedCards` memo daje novi array (sad sadrži upravo dodane kartice)
4. Efekat reset-a okida → `dispatch set` + `setPhase("preview")` + `setImportedCount(0)`
5. **Korisnik ne vidi success ekran** — vraća se na preview odmah

Postoji i suptilnija varijanta: tokom `importing`, ako persistQueue flush probudi state update prije nego što `setPhase("done")` izvrši, faza se prebacuje preview→preview, ali `importedCount` se nuli.

**Fix:** Reset samo kad se dijalog otvara ili izvor mijenja, ne na svaku promjenu kartica.

```ts
useEffect(() => {
  if (!open) return;
  dispatch({ type: "set", rows: buildArticleRows(detected, linkedCards) });
  setPhase("preview");
  setProgress(0);
  setImportedCount(0);
  setMergeNameDialog(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, source.id]);
```

(Ili razdvojiti reset od refresh-a redova: redove osvježiti kad se kartice promijene SAMO ako je faza "preview".)

---

### 🟠 FUNKCIONALNO #3 — Lažni "Sačuvano" toast nakon greške

**Fajl:** `src/hooks/zettelkasten/useArticleDraft.ts`, linije 142–147

```ts
const saveAndClose = useCallback(async () => {
  await flushRef.current();
  setIsEditing(false);
  setDraft(null);
  toast.success("Sačuvano");
}, []);
```

**Problem:** `flush` već prikazuje `toast.error("Članak NIJE sačuvan…")` na grešku, a zatim `saveAndClose` prikaže `toast.success("Sačuvano")`. Korisnik vidi dva oprečna toasta.

**Fix:**

```ts
const saved = await flushRef.current();
setIsEditing(false);
setDraft(null);
if (saved) toast.success("Sačuvano");
```

---

### 🟡 SUBOPTIMIZACIJA #4 — Pristrasni shuffle u Mnemonic test engineu

**Fajl:** `src/hooks/mnemonic/useTestEngine.ts`, linija 72

```ts
setQueue([...cards].sort(() => Math.random() - 0.5));
```

`Array.sort` sa nasumičnim komparatorom nije uniformno raspoređen (poznata neispravnost — V8 koristi TimSort koji daje pristrasan rezultat). Za test gdje uvijek dobijaš slične redoslijede, to znači da su rane kartice češće na vrhu.

**Fix:** Fisher–Yates u `test-tree.ts` kao pure helper:

```ts
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

---

### 🟡 SUBOPTIMIZACIJA #5 — `useArticleMutations.open` se rekreira na svaku promjenu članaka

**Fajl:** `src/hooks/zettelkasten/useArticleMutations.ts`, linije 66–71

```ts
const open = useCallback((id: string) => {
  ...
  const target = articles.find(a => a.id === id) ?? null;
  draftApi.resetForArticle(target, { autoEditEmpty: true });
}, [articles, setActiveId, setReadingSourceId, draftApi]);
```

`articles` u dep-u znači da se `open` rekreira pri svakom upsert/delete. Pošto se `open` prosljeđuje u `ZettelExplorerPanel` kao `onOpen`, panel re-renderuje (osim ako koristi memo komparator). Wiki-link auto-create rekonstruiše više članaka u nizu — ovo postaje kaskadno.

**Fix:** Držati `articles` u ref-u (`articlesRef.current = articles`) i pristupiti mu unutar callback-a:

```ts
const articlesRef = useRef(articles);
useEffect(() => { articlesRef.current = articles; }, [articles]);
const open = useCallback((id: string) => {
  ...
  const target = articlesRef.current.find(a => a.id === id) ?? null;
  ...
}, [setActiveId, setReadingSourceId, draftApi]);
```

---

### 🟡 SUBOPTIMIZACIJA #6 — Auto-Split mid-import re-reset rizik

**Fajl:** `src/hooks/useAutoSplitImport.ts` (povezano sa #2)

`executeImportPlan` poziva `persistQueue.flush()` koji u kontekstu CardActions može sinkronisati cards prije `setPhase("done")`. To znači da postoji prozor u kojem efekat resetuje `progress` na 0 dok je faza još uvijek `"importing"`. UX glich.

Pokriveno fix-om iz #2.

---

### Sažetak prioriteta

| # | Težina | Fajl | Problem |
|---|--------|------|---------|
| 1 | 🔴 Kritična | `useArticleDraft.ts` | Cleanup-flush gubi izmjene pri navigaciji A→B |
| 2 | 🔴 Kritična | `useAutoSplitImport.ts` | "Done" ekran nestaje odmah nakon import-a |
| 3 | 🟠 Funkcionalna | `useArticleDraft.ts` | Lažni success toast nakon save-greške |
| 4 | 🟡 Subopt. | `useTestEngine.ts` | Pristrasan shuffle |
| 5 | 🟡 Subopt. | `useArticleMutations.ts` | `open` callback re-kreira preterano |
| 6 | 🟡 Subopt. | `useAutoSplitImport.ts` | Glich u progress baru tokom importa |

### Plan implementacije (kad odobriš)

1. **#1 i #3** — `useArticleDraft.ts`: zamijeniti cleanup ref pattern tako da koristi `flush` iz closure-a starog efekta; conditional toast u `saveAndClose`.
2. **#2 i #6** — `useAutoSplitImport.ts`: razdvojiti reset (zavisi od `open`, `source.id`) od refresh-a redova (zavisi od `linkedCards`, samo u fazi "preview").
3. **#4** — Premjestiti `shuffle` u `test-tree.ts` kao pure helper, koristiti u `startSession`.
4. **#5** — `articlesRef` pattern u `useArticleMutations.ts`.
5. **Tests:**
   - Novi test za `useArticleDraft`: navigation A→B čuva A-jeve izmjene.
   - Novi test za `useAutoSplitImport`: faza ostaje "done" nakon što kartice u kontekstu apdejtuju.

Procjena: ~30 LOC izmjena + 2 nova testa. Svi fix-evi su lokalni, bez API-promjena.