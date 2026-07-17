# Plan: Zettelkasten kao obavezan međukorak u toku učenja

Datum: 2026-07-05
Status: ✅ **Faze 0–4 sprovedene** (0: 2026-07-05, 1–4: 2026-07-06) — glavni tok kompletan; ostaju odložene stavke (§7) i bonus (§8)
Autor razrade: razgovor Budimir + Claude (arhitekturna odluka, prije pisanja koda)

> **Zamjenjuje** raniji `docs/zettelkasten-hub-restructure-plan.md` (2026-07-01), koji je
> obrisan. Taj plan je bio radikalno drugačiji: ukidao je taksonomiju kartica
> (`categoryId/subcategoryId/chapterId`), uvodio „Node stablo" umjesto potkategorija/glava i
> pravio karticu zavisnom od Note. **Taj pravac je odbačen.** Ovaj plan zadržava postojeću
> taksonomiju kartica i drži zettelkasten kao odvojen sloj.

---

## 1. Cilj i motivacija

Trenutno aplikacija u učenju **potpuno zaobilazi zettelkasten** — kartice se prave direktno iz
izvora preko smart-splita (`handleSmartSplitConfirm` u
[useSourceMapping.ts](../src/hooks/source-reader/useSourceMapping.ts)). Zettelkasten članci
(`knowledgeBaseArticles`) su paralelan sloj koji se samo *linkuje*, a ne *proizvodi* kartice.

Novi tok (pipeline):

```
Izvori (sirovi propisi)
      │
      ▼
Zettelkasten  ── obrađena, interno povezana baza znanja: propis + teorija u istom članku,
      │           sa JASNO vidljivom razlikom između propisa i teorije
      ▼
Aktivno učenje ── memorizacija ODABRANIH djelova zettelkastena (esej + blic kartice)
```

Suština: zettelkasten postaje glavni put ka karticama; kartica nastaje iz **odabranog dijela
članka**, a ne više isključivo iz sirovog izvora.

---

## 2. Usvojene odluke (odgovori na sva otvorena pitanja)

| # | Pitanje | Odluka |
|---|---|---|
| 1 | Kako modelovati propis vs teoriju? | **Tipizovani blokovi unutar istog članka** (propis-blok / teorija=obična proza). Ne dvije vrste članaka, ne tagovan pasus. |
| 2 | Sudbina smart-splita izvor→kartica? | **Zadržati oba puta, ali specijalizovana po tipu kartice** (vidi §2b): autosplit izvora → **blic** (čisti propisi); zettelkasten → **esej** (teorija). |
| 3 | Migracija postojećih kartica? | **Legacy + postepeno.** Stare kartice rade netaknuto; novi sistem važi od sad; migracija ručno kad se stigne. Bez „big bang"-a. |
| 4 | Provenijencija (veza do zakona)? | **Članak** drži vezu do zakona (`article.linkedSourceIds`). Kartica iz članka drži samo `linkedArticleId`. Kartica iz prečice drži `sourceId`. |
| 5 | Propis blok = živa referenca ili kopija? | **Kopija sa tragom** — statična kopija teksta u trenutku izvlačenja, pamti `sourceId` + anchor radi provjere; ažuriranje ručno. |
| 6 | Granularnost članka vs taksonomija? | **Zettelkasten je POTPUNO ODVOJEN od taksonomije kartica.** Kartice zadržavaju ručno biran `category→subcategory→chapter`. Kartica iz članka dobija `linkedArticleId`, ali taksonomiju biraš ručno. Članku NE treba sub/glava. |
| 7 | Opseg zettelkastena? | **Ostaje po predmetu** (`subjectId`), interno organizovan zettelkasten-native (indeks-članci, tagovi, interni linkovi), ne po sub/glavi. |
| 8 | Odakle koji tip kartice? | **Blic ← autosplit izvora** (propisi, jedan modul). **Esej ← zettelkasten** (teorija, više modula). Vidi §2b. |
| 9 | Kako čuvati „trag" propis-bloka? | **Isti mehanizam kao veza kartica↔izvor** (`textAnchor` obrazac koji već postoji). |
| 10 | Duplikati (isti član preko oba puta)? | **Mekano upozorenje, ne blokada.** |
| 11 | UX ulazna tačka? | [ZettelkastenView](../src/views/ZettelkastenView.tsx) **postaje glavni hub**, sa vidljivim „→ generiši kartice" iz članka. |

### 2b. Podjela puteva po tipu kartice

Dva puta za kartice nisu „glavni + prečica" nego **specijalizovana po tipu**, jer propisi i
teorija imaju različitu prirodu:

| Tip kartice | Izvor nastanka | Zašto | Provenijencija |
|---|---|---|---|
| **Blic** (čisti propisi) | **Autosplit u izvorima** (postojeći smart-split) | Propis je atomaran — jedan član = jedan modul; ne treba obrada kroz zettelkasten | `sourceId` |
| **Esej** (teorija) | **Zettelkasten** (članak, teorijski dio) | Teorija zahtijeva sintezu / više modula; nastaje iz obrađenog znanja | `linkedArticleId` |

Posljedice:
- **Propis blok u članku ostaje** — ali njegova primarna uloga je *kontekst/razumijevanje uz
  teoriju* (da članak jasno prikaže propis pored teorije), a **ne** primarni izvor blic kartica.
  Blic i dalje dolazi iz autosplita izvora.
- Generisanje kartice iz članka (Faza 2) je **prvenstveno za esej iz teorije**. Pravljenje blica
  iz propis-bloka ostaje moguće, ali nije glavni put.
- Opciono (kasnije): povezati blic (iz autosplita) sa esejom/člankom preko postojeće esej↔blic
  saga veze, da se propis i teorija istog gradiva drže zajedno.

---

## 3. Šta se svjesno NE mijenja

- **Taksonomija kartica** (`category→subcategory→chapter`) i njeno ručno uređivanje ostaju.
- **Postojeći smart-split izvor→kartica** ostaje kao prečica (blic).
- **Postojeće kartice (legacy)** rade netaknuto; nema prisilne migracije.
- **FSRS/review, mnemonike, mind-mape, planer** — netaknuti.
- **FK/cascade šema** — netaknuta (nedavno popravljen `cards.categoryId ON DELETE CASCADE` bug; ne dirati).

---

## 4. Postojeći temelji na koje se oslanjamo

- **`legalProvision` blok već postoji** ([legal-provision.ts](../src/lib/editor-v4/extensions/legal-provision.ts)) — TipTap node, blok-omotač za tekst propisa, vizuelno odvojen od teorije. Trenutno dostupan samo u editoru izvora (gate u `SourceBubbleMenu`). → **Ovo je „propis" blok.** „Teorija" = obična proza van tog bloka.
- **Editor-v4** sa ekstenzijama (`wiki-link`, `key-part`, `smart-paste`, `legal-provision`) i kodecima (`doc-to-text`, `doc-to-html`) — koristi se za generisanje teksta kartice iz bloka.
- **Veze već postoje u šemi:** `card.linkedArticleId`, `card.sourceId`, `article.linkedSourceIds`, backlink indeks. Nema nužde za novim FK-ovima.
- **`LinkCardsToArticleDialog` / `LinkedCardsPanel`** — postojeći UI za vezu kartica↔članak.

---

## 5. Izmjene modela (minimalne)

- **Članak (`contentDoc: EditorDoc`)**: blokovi žive unutar `contentDoc` (payload), pa **nije potrebna nova kolona** u `knowledgeBaseArticles`. `legalProvision` node dobija atribute za trag: `sourceId` + anchor.
- **`knowledgeBaseArticles`**: ostaje `subjectId`-nivo; **bez** sub/chapter polja.
- **`Card`**: **bez izmjena šeme** — `linkedArticleId` i `sourceId` već postoje.
- **Backup**: blokovi su dio `contentDoc` payload-a koji se već serijalizuje → vjerovatno **bez bump-a verzije**; potvrditi da postojeći članci bez tipizovanih blokova i dalje validno parsiraju (default = teorija).

---

## 6. Faze implementacije

### Faza 0 — Model članka (blokovi propis/teorija) ✅ SPROVEDENO (2026-07-05)
**Cilj:** članak može da sadrži `legalProvision` (propis) blokove sa tragom do izvora.

**Urađeno:**
- **Trag na propis-bloku** — `legalProvision` node dobio atribute `sourceId` + `anchor` (default `null`, renderuju se kao `data-source-id` / `data-anchor`, round-trip kroz HTML kodeke). `anchor` je opaque string, isti obrazac kao kartica↔izvor `textAnchor`. Fajl: [legal-provision.ts](../src/lib/editor-v4/extensions/legal-provision.ts).
- **Propis toggle u editoru članka** — dugme „Propis blok" (ikona Scale) u toolbaru [EditorV4](../src/components/editor-v4/EditorV4.tsx) kad je `embedKind="article"` (poziva `toggleLegalProvision`). Ranije dostupno samo u `SourceBubbleMenu` (izvori).
- **Vizuelni stil** — propis blok u editoru članka dobio isti izgled kao u čitanju izvora (`PROPIS_BLOCK_STYLE`: lijeva ivica + „Propis" labela), tako da je razlika propis vs teorija jasno vidljiva; primijenjeno samo za članke.
- **Napomena:** `legalProvision` je već bio u dijeljenoj šemi ([schema.ts](../src/lib/editor-v4/schema.ts)), pa članak već serijalizuje/deserijalizuje blok; Faza 0 je dodala trag, UI i stil.

**Testovi** ([editor-v4-schema.test.ts](../src/test/editor-v4-schema.test.ts)): deklaracija atributa `sourceId`/`anchor`; round-trip `data-source-id`/`data-anchor`; stari propis-blokovi bez traga parsiraju kao null (unazadna kompatibilnost). Svih 16 u fajlu prolazi; typecheck + lint čisti.

**Nije dirano:** kartice, taksonomija, backup šema (blok živi u `contentDoc` payload-u koji se već serijalizuje).

### Faza 1 — Izvor → Članak ✅ SPROVEDENO (2026-07-06)
**Cilj:** iz izvora se izvlači tekst u propis-blok NOVOG članka.

**Usvojene odluke (UX):**
- **Ciljni članak: uvijek NOVI** (MVP), naslov iz prvih riječi selekcije. (Picker postojećih i „skupljač" po predmetu su razmatrani i odloženi.)
- **Poslije izvlačenja: ostani u izvoru + toast** (ne prekida čitanje).

**Urađeno:**
- **Pure builder** [build-propis-article.ts](../src/lib/source-reader/build-propis-article.ts): od `SelectionPayload` + izvora pravi `KnowledgeBaseArticle` — `subjectId = source.categoryId`, `linkedSourceIds = [source.id]`, sadržaj = jedan `legalProvision` blok sa **cijelim** tekstom selekcije i atributima `sourceId` + `anchor` (`createTextAnchor`). Naslov se izvodi zasebno (prvih 8 riječi) — za razliku od eseja, tekst se NE hoist-uje u naslov (cio propis ostaje u bloku).
- **Hook akcija** `handleExtractToArticle` u [useSourceMapping.ts](../src/hooks/source-reader/useSourceMapping.ts): builder → `saveArticle` → toast; izloženo preko [useSourceReaderActions.ts](../src/hooks/useSourceReaderActions.ts).
- **UI:** dugme „Izvuci u članak (propis)" (ikona NotebookPen) u [SourceBubbleMenu](../src/components/source-reader/SourceBubbleMenu.tsx), always-on grupa; povezano u [SourceReader.tsx](../src/components/SourceReader.tsx).
- Postojeći smart-split izvor→kartica (BLIC) **nije diran** (§2b).

**Testovi** [build-propis-article.test.ts](../src/test/build-propis-article.test.ts): filing pod predmet + linkovan izvor; `legalProvision` blok sa `sourceId`/`anchor` i cijelim tekstom; `block+` invarijanta (fallback paragraf). Postojeći source-reader/editor testovi i dalje prolaze; typecheck + lint čisti.

### Faza 2 — Članak → Kartica (prvenstveno ESEJ iz teorije) ✅ SPROVEDENO (2026-07-06)
**Cilj:** memorizacija odabranog dijela zettelkastena → **esej** kartica (teorija).

**Usvojene odluke (UX):**
- **Okidač: bubble meni u editoru članka** (edit mod, TipTap selekcija) — ogledalo toka iz izvora.
- **Poslije: kreiraj esej + otvori CardForm** (`/edit`) da se ručno izabere potkategorija/glava; vraća na članak po završetku.
- **Predmet (categoryId): pred-popunjen iz članka** (`article.subjectId`); potkategorija/glava ručno.

**Urađeno:**
- **Pure builder** [build-essay-from-article.ts](../src/lib/source-reader/build-essay-from-article.ts): od `SelectionPayload` + `subjectId` pravi esej draft (`question` = prve riječi selekcije, `sections` = tijelo, `categoryId` = predmet). Za razliku od propisa, esej hoist-uje naslov u pitanje; fallback na cijelu selekciju ako tijelo ostane prazno.
- **Bubble meni** [ArticleBubbleMenu.tsx](../src/components/zettelkasten/ArticleBubbleMenu.tsx): jedno dugme „Memoriši" (GraduationCap) na selekciji ≥5 znakova.
- **ZettelEditor** [ZettelEditor.tsx](../src/components/zettelkasten/ZettelEditor.tsx): novi prop `onMemorizeSelection`; kad je prisutan, hvata TipTap editor (`onEditorReady`) i montira `ArticleBubbleMenu`.
- **ZettelkastenView** [ZettelkastenView.tsx](../src/views/ZettelkastenView.tsx): `handleMemorizeSelection` — builder → `addCard` (esej) → `cardRepository.linkCardsToArticle` → `setEditingCardId` + `setEditReturn` (nazad na članak) → `navigate("/edit")`.
- Blic i dalje dolazi iz autosplita izvora (§2b); ovaj tok je isključivo esej iz teorije.

**Testovi** [build-essay-from-article.test.ts](../src/test/build-essay-from-article.test.ts): predmet pred-popunjen; naslov→pitanje + tijelo zadržano; fallback za kratku selekciju. Postojeći zettelkasten/veza-članak testovi (19) prolaze; typecheck + lint čisti.

**Odloženo iz ove faze:** mekano dedup upozorenje (nema jasnog ključa za selekciju u članku) — prebačeno u §7 rizike; blic-iz-propis-bloka nije poseban tok (autosplit pokriva blic).

### Faza 3 — Provjera / drift ✅ SPROVEDENO (2026-07-06)
**Cilj:** kontrola nad „kopijom sa tragom" i signal kad povezani članak zastari.

**Usvojene odluke (UX):**
- **„Provjeri uz izvor": dugme na propis-bloku** koje otvara povezani izvor u bočnom panelu (ručno poređenje). Automatski tekst-diff je razmotren i odložen.
- **„Za pregled" vidljivost:** koristi postojeći `needsReview` (tabela kartica, review) **+ novi badge** u `LinkedCardsPanel`.

**Urađeno:**
- **Drift-flag:** novi `SQL_SET_NEEDS_REVIEW_BY_ARTICLE` ([cards-json-patches.ts](../src/lib/db/queries/cards-json-patches.ts)) + `cardRepository.markNeedsReviewByArticle(articleId)` ([cardRepository.ts](../src/lib/repositories/cardRepository.ts)) — postavlja `needsReview` na sve kartice sa tim `linkedArticleId`. Okida se u [useArticleDraft.ts](../src/hooks/zettelkasten/useArticleDraft.ts) `flush()` **samo kad se tijelo članka promijeni** (`bodyChanged`), ne na izmjenu naslova/tagova.
- **Provjeri uz izvor:** `onOpenSource` provučen kroz [AstNodeRenderer](../src/components/ui/AstNodeRenderer.tsx) → [ContentRenderer](../src/components/ui/ContentRenderer.tsx) → [ZettelPreview](../src/components/zettelkasten/ZettelPreview.tsx); propis blok sa `sourceId` prikazuje dugme „Provjeri uz izvor" koje zove postojeći `setReadingSourceId` (SourceSidePanel).
- **Badge „za pregled":** [LinkedCardsPanel](../src/components/zettelkasten/LinkedCardsPanel.tsx) prikazuje warning badge na karticama sa `needsReview`.

**Testovi** [drift-needs-review.test.ts](../src/test/drift-needs-review.test.ts): flag pogađa samo kartice datog članka; no-op kad nema povezanih. Postojeći card-repository/editor/veza-članak testovi (52) prolaze; typecheck + lint čisti.

**Odloženo:** automatski tekst-diff bloka vs izvora (za sada samo otvaranje izvora radi ručne provjere).

### Faza 4 — Legacy i hub ✅ SPROVEDENO (2026-07-06)
**Cilj:** koegzistencija starog i novog + UX centar.

**Usvojene odluke:**
- **„Legacy" = esej kartica bez `linkedArticleId`.** Blic/flash iz izvora NIJE legacy (validan put, §2b).
- **„Prebaci u zettelkasten" akcija: ODLOŽENA** — u ovoj fazi samo oznaka/indikator.
- **Hub: minimalno** — obogatiti postojeći ulaz „Lokalni Wiki" na subject dashboardu (bez preuređenja navigacije).

**Urađeno:**
- **Util** [legacy-card.ts](../src/lib/cards/legacy-card.ts): `isLegacyCard` (esej && !linkedArticleId) + `countLegacyCards`.
- **Oznaka:** badge „Van zettelkastena" (Compass, isprekidana ivica) na legacy karticama u [CardTableRow](../src/components/category/CardTableRow.tsx).
- **Hub:** ulaz „Lokalni Wiki" na [SubjectDashboard](../src/views/SubjectDashboard.tsx) prikazuje broj eseja van baze (`N eseja van baze`) kad ih ima; zettelkasten ruta je već postojala.
- **Backup kompatibilnost:** potvrđeno da `EditorDocV4` (passthrough) čuva propis atribute `sourceId`/`anchor`, a `linkedArticleId` je već u kartičnoj šemi — nema promjene backup formata (bez bump-a verzije).

**Testovi:** [legacy-card.test.ts](../src/test/legacy-card.test.ts) (definicija legacy + brojanje); [backup-schema.test.ts](../src/test/backup-schema.test.ts) prošireno (round-trip `linkedArticleId` + propis `sourceId`/`anchor`). Typecheck + lint čisti.

**Odloženo:** automatska „Prebaci u zettelkasten" akcija (od kartice napravi/poveži članak) — vidi §7.

**Redoslijed:** 0 → 1 → 2 → 3 → 4. Faze 0–2 su srž; 3–4 su dorada.

---

## 7. Odloženo / poznati rizici

- **Automatska sinhronizacija propisa** (živa referenca) — svjesno odbijeno u korist „kopije sa tragom"; ako zatreba, nadograditi kasnije.
- **„Prebaci u zettelkasten" akcija** (Faza 4) — od legacy eseja automatski napravi/poveži članak i postavi `linkedArticleId`. Zasad samo oznaka „Van zettelkastena"; akcija odložena.
- **Mekano dedup upozorenje** (Faza 2) — pri „memoriši" nema jasnog ključa za proizvoljnu selekciju; odloženo.
- **Automatski tekst-diff** propis-blok vs izvor (Faza 3) — zasad samo otvaranje izvora radi ručne provjere.
- **Napredni dedup** (spajanje/otkrivanje dupliranih kartica) — zasad samo mekano upozorenje.
- **Migracija stvarnih legacy podataka** — ručno, postepeno; nije blokada za nove funkcije.
- **Stabilnost numeracije kroz izmjene zakona** — odloženo dok se stvarno ne desi izmjena unesenog zakona.

---

## 8. Bonus korak — izvoz kartica za postojeću iOS flashcard aplikaciju

**Motiv:** iskoristiti izgrađenu bazu kartica na iOS-u **bez** pravljenja zasebne aplikacije —
generisati backup/izvozni fajl koji neka postojeća iOS flashcard aplikacija može da uveze.

Status: 🔲 ideja, van glavnog toka (nezavisno od Faza 0–4).

**Otvoreno pitanje — koju aplikaciju ciljati (odlučiti naknadno):**
- **Anki / AnkiMobile** — najportabilnije; uvoz preko `.apkg` (SQLite paket) ili prosto `.txt`/`.csv`
  (polje-separator). Najveća šansa da „samo radi", ali AnkiMobile je plaćen.
- **Quizlet** — uvoz preko teksta (pojam/definicija sa separatorima). Jednostavno, ali slabija
  kontrola nad formatiranjem i tipovima kartica.
- **Flashcards Deluxe / Mochi / RemNote** — razne uvozne opcije; provjeriti FSRS/raspored podršku.

**Šta razjasniti prije implementacije:**
1. Da li izvozimo samo sadržaj (pitanje/odgovor) ili i FSRS stanje/raspored (većina iOS aplikacija ne
   uvozi tuđe FSRS parametre → vjerovatno samo sadržaj).
2. Kako mapirati esej (više modula) i blic kartice na ciljni format (front/back).
3. Kako serijalizovati bogati sadržaj — koristiti postojeće kodeke [docToPlainText / docToHtml](../src/lib/editor-v4/index.ts).
4. Format izlaza: `.txt/.csv` (najlakše) vs `.apkg` (najmoćnije, ali traži SQLite paket + medij).

**Za iskoristiti (postoji):** backup pipeline i row-bindings u [src/lib/backup/](../src/lib/backup/),
kodeci sadržaja u [editor-v4](../src/lib/editor-v4/index.ts).

**Preporuka za start (kad se krene):** `.txt`/`.csv` izvoz za Anki (samo sadržaj, front/back) kao
MVP — najbrži put do upotrebljivog rezultata; `.apkg` i FSRS-prijenos tek ako zatreba.

---

## 9. Reference (ključni fajlovi)

- Editor blok propisa: [src/lib/editor-v4/extensions/legal-provision.ts](../src/lib/editor-v4/extensions/legal-provision.ts)
- Editor članka: [src/components/zettelkasten/ZettelEditor.tsx](../src/components/zettelkasten/ZettelEditor.tsx)
- Izvor→kartica (smart-split): [src/hooks/source-reader/useSourceMapping.ts](../src/hooks/source-reader/useSourceMapping.ts)
- Tipovi (Card, KnowledgeBaseArticle): [src/lib/db-types.ts](../src/lib/db-types.ts)
- Kartica↔članak veze: [src/lib/repositories/cardRepository.ts](../src/lib/repositories/cardRepository.ts), [src/components/zettelkasten/LinkedCardsPanel.tsx](../src/components/zettelkasten/LinkedCardsPanel.tsx)
- Zettelkasten hub: [src/views/ZettelkastenView.tsx](../src/views/ZettelkastenView.tsx)
- Backup šema: [src/lib/migrations/backup-schema/](../src/lib/migrations/backup-schema/)
