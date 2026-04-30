## Cilj

Pretvoriti Zettelkasten iz "grid potkategorija + lista" u **organski istraživački prostor** vođen wiki-linkovima, sa stalno dostupnim **Explorer panelom** sa strane koji prikazuje sve članke kao slobodnu strukturu — bez nametanja taksonomije predmeta.

## Filozofija promjene

Trenutno Zettelkasten **nasljeđuje** strukturu predmeta (potkategorije postaju filter chip-ovi, svaki članak je vezan za `rootSubcategoryId`). To je u suprotnosti sa svrhom Zettelkastena: organska, emergentna mreža misli koja ne mora pratiti formalnu organizaciju gradiva.

Nova logika:
- **Index članak** (auto-kreiran kao prvi članak, naslov = ime predmeta) je ulazna tačka — korisnik započinje istraživanje od njega i grana se kroz `[[wiki-linkove]]`.
- **Bočni Explorer** je uvijek vidljiv u listi i u čitanju članka — daje "vraćanje gore" kad se korisnik izgubi ili traži konkretnu oblast.
- **Potkategorije se uklanjaju iz UI-ja** kao primarni navigacioni element. `rootSubcategoryId` se zadržava kao opcioni metapodatak (nije obavezan, ne prikazuje se kao filter), da postojeći podaci ne padnu.

## Šta gradimo

### 1. Index članak (Predmet kao polazna tačka)

Pri prvom učitavanju Zettelkastena, ako ne postoji nijedan članak, automatski se kreira jedan članak sa:
- `title = categoryRec.name` (npr. "Ustavno pravo")
- `content` = onboarding šablon sa nekoliko predloženih `[[wiki-linkova]]` izvedenih iz `categoryRec.subcategories` (kao **smjernice za istraživanje**, ne kao struktura).
- Posebna oznaka `isIndex: true` — ne može se obrisati, uvijek se otvara prvi.

Na "Nazad na listu" iz bilo kog članka, fokus se vraća na Index članak (ne na grid). Lista svih članaka i dalje postoji ali kao sekundarni prikaz unutar Explorer panela.

### 2. Explorer Panel (lijevo, kolapsibilan)

Stalno prisutan panel sa lijeve strane — i u čitanju i u uređivanju, i na Index pogledu. Sadrži:

- **Search box** (top, sticky) — pretraga po naslovu članka.
- **Sortiranje**: Najnoviji / Abecedno / Najviše linkovan (broj backlinkova). Default = Najnoviji.
- **Lista svih članaka** (virtualizovana, koristi postojeći `ArticleListVirtual` adaptiran za uži panel):
  - Naslov + mala metrika (broj backlinkova, datum)
  - Index članak je zakačen na vrh sa ikonom kompasa
  - Prazni placeholderi (bez sadržaja) imaju vizuelnu oznaku (slabija boja)
- **Footer**: dugme "+ Novi članak" i "Statistika" (ukupno članaka, ukupno linkova, sirote — članci bez ulaznih linkova).

Panel je collapsible (širina 280px otvoren / 0 zatvoren) sa toggle dugmetom u top baru. Stanje (otvoreno/zatvoreno) se pamti u `localStorage` po korisniku.

### 3. Uklanjanje grid prikaza potkategorija

Trenutni "Koju oblast biste željeli više da istražite?" grid + chip filter se uklanja. Zamjenjuje ga ulazak direktno u Index članak. Lista filtrirana po potkategoriji prestaje biti primarna navigacija — ako korisnik želi sličnu funkciju, postoji Explorer Search.

`rootSubcategoryId` polje na članku ostaje u shemi (zbog kompatibilnosti i mogućnosti budućeg "tag" sistema), ali se **ne prikazuje** u UI-ju i **ne postavlja automatski** za nove članke kreirane preko wiki-linkova (oni se kreiraju "slobodni").

### 4. Vizuelni layout

```text
┌────────────────────────────────────────────────────────────────┐
│  ← Nazad na predmet         Zettelkasten — Ustavno pravo       │
├────────────┬───────────────────────────────────────────────────┤
│ Explorer   │                                                   │
│ ┌────────┐ │   ┌──── Index članak / aktivni članak ────────┐   │
│ │ Search │ │   │                                            │   │
│ └────────┘ │   │  # Ustavno pravo                           │   │
│ Sort: ▾    │   │                                            │   │
│            │   │  Dobrodošli. Krenite od:                   │   │
│ ★ Ustavno  │   │  - [[Načela ustavnosti]]                   │   │
│   pravo    │   │  - [[Ljudska prava]]                       │   │
│   12 link. │   │  - [[Organi vlasti]]                       │   │
│            │   │                                            │   │
│ Načela ust.│   │                                            │   │
│   3 link.  │   └────────────────────────────────────────────┘   │
│ Ljudska pr.│                                                    │
│   ...      │   ┌──── Backlinks ─────────────────────────────┐   │
│            │   │  Pominje se u: ...                         │   │
│ + Novi     │   └────────────────────────────────────────────┘   │
└────────────┴────────────────────────────────────────────────────┘
```

## Tehnički plan

### Schema (`src/lib/db.ts` + `zettelkasten-storage.ts`)
- Dodati `isIndex?: boolean` polje na `KnowledgeBaseArticle`. Bez migracije sheme (Dexie tolerantno).
- Nova storage funkcija `ensureIndexArticle(subjectId, subjectName, suggestedLinks)` — atomično (rw tx): ako već postoji `isIndex=true` za subject, vrati ga; inače kreiraj sa onboarding sadržajem koji koristi `[[suggestedLinks]]`.
- `deleteArticle` u `ZettelkastenView.handleDelete`: dodati guard koji blokira brisanje Index članka (toast: "Index članak se ne može obrisati").

### Novi komponenta: `src/components/zettelkasten/ZettelExplorerPanel.tsx`
- Props: `articles`, `activeId`, `onOpen`, `onCreate`, `categoryName`, `collapsed`, `onToggleCollapsed`.
- Interno: search input (lokalni state), sort dropdown (3 opcije), virtualizovana lista (re-use `ArticleListVirtual` ili novi tanji red).
- Statistika u footeru — izračunata iz `articles` + backlink indeks (`backlinkIndex.getCounts(subjectId)` — dodati helper koji vraća `Map<articleId, backlinkCount>`).

### Backlink helper (`src/lib/backlink-index.ts`)
- Dodati javni `getCountsByArticle(subjectId): Map<string, number>` — broji koliko ulaznih linkova ima svaki članak (po njegovom normalizovanom naslovu).
- Dodati `getOrphans(subjectId, articles): string[]` — članci bez ijednog ulaznog linka i koji nisu Index. Koristi se za "Sirote" sekciju u statistici.

### `ZettelkastenView.tsx` — refaktor
- Ukloniti `selectedSubId`, `articleCountByRoot`, root-subs grid blok (linije ~565–626).
- Ukloniti chip filter; `filteredArticles` postaje samo search-driven (Explorer panel sadrži svoju pretragu).
- Initial load effect: nakon `loadArticlesBySubject`, ako lista prazna → pozvati `ensureIndexArticle` i postaviti `activeId` na njegov ID, otvoriti odmah u read modu.
- Layout postaje split: levi `ZettelExplorerPanel` + desni glavni sadržaj (Index/aktivni članak/empty state).
- "Nazad na listu" dugme se preimenuje u "Nazad na Index" i postavlja `activeId = indexArticleId`.
- `handleCreate` više ne prima `rootSubId` po defaultu — članci se kreiraju slobodni.

### Memoization
- `backlinkCounts` Map se računa jednom po `articles` i koristi i u Explorer panelu i u statistici (preko `useMemo`).
- Explorer panel je `React.memo` da kucanje u editoru ne re-render-uje listu članaka.

### Migracija postojećih korisnika
- Pri prvom otvaranju nakon update-a, ako postoje članci ali nijedan nema `isIndex=true`:
  - Ako postoji članak čiji naslov tačno odgovara `categoryRec.name` → označi ga kao Index (`isIndex=true`).
  - Inače → kreiraj novi Index članak iznad postojećih (postojeći ostaju netaknuti).
- Ovo se radi unutar `ensureIndexArticle` da bude atomično.

### Testovi (`src/test/`)
- `zettelkasten-index-article.test.ts` — `ensureIndexArticle` idempotentnost, atomičnost pri paralelnim pozivima, migracija postojećih (matching by name), guard na delete.
- `zettelkasten-backlink-counts.test.ts` — `getCountsByArticle` i `getOrphans` korektnost.

### Šta se NE mijenja
- `ZettelEditor`, `ZettelPreview`, `BacklinksPanel`, `LinkedSourcesPicker`, `SourceSidePanel` — svi ostaju.
- `bulkCreateArticlesIfMissing` i wiki-link auto-create flow — netaknuti (već je solidan).
- `rootSubcategoryId` na shemi (samo se ne koristi iz UI-ja).
- Ostali pogledi predmeta (Cards, Sources, MindMaps) — Zettelkasten promjena je izolovana.

## Redoslijed izvršavanja

1. Schema flag `isIndex` + `ensureIndexArticle` storage funkcija + testovi.
2. Backlink helpers (`getCountsByArticle`, `getOrphans`) + testovi.
3. `ZettelExplorerPanel` komponenta (sa search/sort/stat).
4. Refaktor `ZettelkastenView` — ukloniti grid, integrisati panel, default na Index članak, delete guard.
5. Memorija (`mem://features/zettelkasten-organic`) + ručni QA pasovi (prazan predmet, postojeći predmet sa člancima, paralelni klikovi i dalje rade).

## Otvoreno pitanje

Index članak može imati 1 od 2 ponašanja kad korisnik nema potkategorija na predmetu:
- (a) Kreirati ga sa praznim onboarding tekstom ("Počnite kucanjem prvog `[[wiki-linka]]`...").
- (b) Kreirati ga sa generičkim šablonom za pravne predmete (Pojam, Izvori, Načela, Klasifikacija, Praksa) kao 5 inicijalnih wiki-linkova.

Idem sa **(a) + ako postoje potkategorije, koristi njih**; korisnik može ručno proširiti. Ako preferiraš (b) za bogatiji start, javi.
