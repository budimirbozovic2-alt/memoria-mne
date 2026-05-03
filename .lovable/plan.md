## Cilj

Optimizovati Smart-Split wizard (`SmartSplitSummaryDialog`) tako da:
1. **Originalni formating** (bold, italic, podvlačenja, liste, paragrafi) se sačuva iz selekcije izvora kroz cijeli tok wizard-a — uključujući i nakon ručnog rezanja modula.
2. **Pitanja** (naslov eseja + naziv svake cjeline) se uređuju u **RichTextEditor**-u (isti kao u CardForm-u), sa fokusom na formatiranje (bold/italic/lists/H2/boja).

## Trenutni problemi

- Editor sadržaja modula je obični `<textarea>` (plain text) — pri svakoj izmjeni se HTML rebuilduje iz `plainTextToHtml`, **gubeći sav formating** koji je `handleConvertToEssay` inicijalno spasio u `safeHtml`.
- `CuttingView` radi nad plain tekstom i `splitTextByParagraphs` razbija po `\n\n`, pa rez vraća rezultat kroz `plainTextToHtml` → ponovo gubitak formatinga.
- Naslov eseja i nazivi modula koriste `<Input>` (čisti tekst) — bez ikakvog formatinga.

## Izmjene

### 1. `src/lib/selection-split-engine.ts` — novi helperi (čisti, bez vanjskih dep)
Dodati i exportovati:
- `splitHtmlIntoBlocks(html: string): string[]` — parsira HTML preko `DOMParser`, vraća listu top-level blok-elemenata kao HTML stringove (`<p>…</p>`, `<h1-3>`, `<ul>`, `<ol>`, `<blockquote>`, `<pre>`). Inline elementi se grupišu u prateći `<p>`.
- `joinHtmlBlocks(blocks: string[]): string` — `blocks.join("\n")`.
- `htmlBlocksToPlain(blocks: string[]): string` — zadržati postojeći `htmlToPlain` ali ga eksportovati za izvođenje `contentText`/`plainSnippet` iz HTML-a.

### 2. `src/components/source-reader/SmartSplitSummaryDialog.tsx`

**A. Editor sadržaja modula → RichTextEditor**
- Ukloniti `<textarea>` blok (linije ~423-437).
- Zamijeniti sa `<RichTextEditor value={mod.contentHtml} onChange={(html) => updateModule(i, { contentHtml: html, contentText: htmlToPlain(html), plainSnippet: htmlToPlain(html).trim() })} placeholder="Sadržaj ove cjeline odgovora..." />`.
- Ukloniti lokalne helpere `escapeHtml`, `plainTextToHtml` i `splitTextByParagraphs` iz fajla — zamijeniti sa `splitHtmlIntoBlocks` / `joinHtmlBlocks` / `htmlToPlain` iz engine-a.

**B. Cutting view radi nad HTML blokovima**
- `CuttingView` prima `htmlBlocks: string[]` umjesto `text`, a svaki blok renderuje `<div dangerouslySetInnerHTML={{__html: sanitizeHtml(block)}} />` — formating ostaje vidljiv tokom rezanja.
- Scissors između susjednih blokova → `onCut(blockIdx)`.
- `performManualCut(moduleIdx, blockIdx)`:
  - `blocks = splitHtmlIntoBlocks(mod.contentHtml)`.
  - `before = joinHtmlBlocks(blocks.slice(0, blockIdx))`, `after = joinHtmlBlocks(blocks.slice(blockIdx + 1))`.
  - Naslov novog modula = `htmlToPlain(blocks[blockIdx]).slice(0,200)` (kratki labelni tekst).
  - `contentHtml` novog modula = `blocks[blockIdx] + "\n" + after` (zadrži prvi blok kao body novog modula umjesto da ga "pojede" kao naslov; alternativa: pure split sa naslov-only blok izbačen iz body-a — uskladiti sa postojećim ponašanjem; default = blok ostaje u novom modulu jer želimo očuvanje sadržaja).

**C. Pitanja u RichTextEditor (minimal)**
- "Naslov eseja" `<Input>` (linije ~316-321) → `<RichTextEditor value={splitParentName} onChange={setSplitParentName} placeholder="Unesite naslov eseja..." minimal />`.
- Per-module "naziv cjeline" `<Input>` (linije ~376-382) → `<RichTextEditor value={edit.question} onChange={(v) => updateEditAt(i, { question: v })} placeholder={mod.title || "Naziv cjeline..."} minimal />`.
- Validacija "non-empty" za parent name → koristiti `htmlToPlain(splitParentName).trim()` kao guard za disabled dugme.

**D. Sitne posljedice**
- `paragraphCount` (za enable/disable scissors) → preimenovati u `blockCount = splitHtmlIntoBlocks(mod.contentHtml).length`; disabled kad je `< 2`.
- `useEffect` za reset `cuttingIndex` ostaje vezan za `total`.

### 3. `src/hooks/useSourceReaderActions.ts`
- `handleConvertToEssay` već koristi `sanitizeHtml(html || ...)` — ostaje. Dodati: ako selekcija ima HTML, izračunati `plainSnippet = htmlToPlain(safeHtml)` umjesto `text.trim()` da bi snippet odgovarao očuvanom HTML-u (sitno usklađenje).
- `handleSmartSplitConfirm` već prosljeđuje `mod.contentHtml` u `sections[i].content` kroz `sanitizeHtml` — bez izmjena.

## Što se NE mijenja

- Engine za auto-detekciju Član X (ostaje za buduće upotrebe; manualni flow je jedini ulaz u wizard, kako i jeste).
- Tagovi, metapodaci (subcat/chapter), splitMode, dirty-confirm ponašanje.
- Mapiranje na `addCard` (`sections[].content` već prima HTML).

## Tehničke napomene

- `RichTextEditor` već postoji (`src/components/RichTextEditor.tsx`) sa `minimal` propom — koristimo ga 1:1 (isti UX kao u CardForm-u).
- Sav HTML koji ulazi/izlazi iz wizard-a prolazi kroz `sanitizeHtml` (DOMPurify) — XSS politika ostaje očuvana.
- Bez novih dependencija, bez promjena tipova kartica, bez migracija.
