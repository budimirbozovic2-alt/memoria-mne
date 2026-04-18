

# Plan: Suptilna separacija pasusa unutar kartica

## Dijagnoza

Odgovori u karticama renderuju HTML iz `RichTextEditor`-a koji proizvodi `<p>...</p>` tagove. Trenutno postoje **dva problema** u zavisnosti od konteksta:

1. **Bez `prose` klase** ili sa `whitespace-pre-wrap` (StudyModeRecall, StudyModeChain, StudyModeFree, CardRow flash) → svi `<p>` tagovi se "lijepe" jedan na drugi → **monolit** (jer browser default `<p>` margine bivaju nadjačane resetom).
2. **Sa `prose` klasom** (CardViewTable, WorkshopCardItem, SourceSnippetDialog, CoverageArticleList) → Tailwind Typography postavlja `margin-top: 1.25em` između `<p>` → **prevelika praznina**, izgleda kao prazan red.

Korisnik želi **tanku, suptilnu vertikalnu separaciju** — dovoljnu da vizuelno razdvoji pasuse, ali znatno užu od praznog reda.

## Rješenje: jedna utility klasa `card-prose`

Umjesto da diram svaku komponentu, dodajem **jednu globalnu CSS klasu** u `src/index.css` koja postavlja konzistentan paragraph spacing svuda:

```css
/* Kartice: suptilna separacija pasusa (oko 0.5em umjesto 1.25em) */
.card-prose p + p,
.card-prose p + ul,
.card-prose p + ol,
.card-prose ul + p,
.card-prose ol + p {
  margin-top: 0.55em;
}
.card-prose p {
  margin-block: 0;
}
```

Ovo:
- Daje **~7-8px** razmaka između pasusa (umjesto ~20px za prazan red).
- Ne kreira "extra" prostor na kraju kartice (margin samo između susjednih paragrafa).
- Funkcioniše i sa `prose` i bez `prose` (override `prose p` margine kad se kombinuje sa `card-prose`).
- Pokriva i listove (često sljede paragraf).

## Tačke primjene (5 fajlova)

Dodajem `card-prose` klasu na render kontejnere odgovora u karticama:

1. **`CardRow.tsx`** (linije 130, 147) — flash i essay collapsed view
2. **`CardViewTable.tsx`** (linija 135) — tabelarni pregled sekcija
3. **`WorkshopCardItem.tsx`** (linija 192) — mnemo workshop
4. **`StudyModeRecall.tsx`** (linije 102, 133) — recall sesija
5. **`StudyModeChain.tsx`** (linije 150, 178) — chain sesija
6. **`StudyModeFree.tsx`** (linije 90, 113) — free sesija

**Posebna napomena za Study mode-ove:** Trenutno koriste `whitespace-pre-wrap` što je rudimentarno. Ostavljam tu klasu (za legacy plain-text kartice), ali `card-prose` će se aktivirati za HTML pasuse.

## Što NE diram

- `RichTextEditor` (input layer) — paragrafi se već generišu korektno.
- `SourceContent` i `CoverageArticleList` — to su **izvori**, ne kartice; tu želimo punu prose tipografiju.
- `SourceSnippetDialog` — dijalog poređenja eseja sa izvorom; tu je puna typografija opravdana.
- Sanitizacija — DOMPurify već dozvoljava `<p>` tagove.

## Fajlovi

- `src/index.css` — dodati `.card-prose` blok (~10 linija)
- `src/components/card-list/CardRow.tsx` — 2 izmjene
- `src/components/category/CardViewTable.tsx` — 1 izmjena
- `src/components/workshop/WorkshopCardItem.tsx` — 1 izmjena
- `src/components/learn/StudyModeRecall.tsx` — 2 izmjene
- `src/components/learn/StudyModeChain.tsx` — 2 izmjene
- `src/components/learn/StudyModeFree.tsx` — 2 izmjene

Ukupno: **7 fajlova**, ~12 izmijenjenih linija. Globalni efekat na sve prikaze odgovora u karticama (esej, blic, mnemo).

