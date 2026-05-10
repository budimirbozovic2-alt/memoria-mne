## Cilj

Riješiti problem padeža u Zettelkastenu:
- **Manuelno**: omogućiti `[[Krivično djelo|krivičnog djela]]` (target | display).
- **Automatski**: dodati polje `aliases: string[]` na članku, koje auto-linker i backlink-indeks tretiraju kao dodatne ulaze za isti članak.

Sve promjene su kompatibilne unazad — postojeći `[[Naslov]]` linkovi nastavljaju da rade nepromijenjeno.

---

## 1. Shema (`src/lib/db-schema.ts`)

`KnowledgeBaseArticle` dobija opciono polje:
```ts
aliases?: string[]; // normalized: trim + lowercase, dedup, max ~20
```

Dexie verzija se podiže na `version(8)` sa `.upgrade()` callback-om koji svim postojećim člancima postavlja `aliases: []` (no-op migracija — Dexie ne zahtijeva schema change kad je polje neindeksirano, ali bumpamo radi jasnoće verzije i `KB_VERSION` u backup-u).

Novi indeks NIJE potreban (alias matching radi se preko in-memory mape).

## 2. Parser sintakse (jedinstveni regex helper)

Novi modul `src/lib/zettelkasten-wiki-link.ts`:
```ts
// Hvata [[Target]] ili [[Target|Display]]
export const WIKI_LINK_RE = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g;

export interface WikiLinkMatch {
  target: string;   // trimmed, original case
  display: string;  // trimmed, original case (= target ako nema pipe)
  index: number;
  raw: string;
}

export function* iterateWikiLinks(text: string): Generator<WikiLinkMatch> { ... }
export function normalizeKey(s: string): string { return s.trim().toLowerCase(); }
```

Sve trenutne lokacije sa lokalnim regex-om migriraju na ovaj helper:
- `src/lib/backlink-index.ts` (linija 58 `WIKI_RE`)
- `src/components/zettelkasten/ZettelPreview.tsx` (linija 42)
- `src/hooks/useWikiLinkAutoCreate.ts` (linija 32)

## 3. Render (`ZettelPreview.tsx`)

Rješavanje target → article ID (poredak provjera):
1. egzaktan match na `title` (lowercase).
2. match preko `aliases` (lowercase).
3. inače: nepostojeća stranica (postojeća crvena/dimmed klasa).

Prikazuje se **uvijek** `display`, link vodi na `target`-ov članak.
**Auto-create se NIKAD ne okida iz pipe sintakse** — `[[X|y]]` je signal autora da X postoji ili će postojati, ali alias `y` se ne kreira kao zaseban članak.

## 4. Backlink indeks (`src/lib/backlink-index.ts`)

`upsertArticle(subjectId, article)`:
- za svaki članak, pored `norm(article.title)`, dodaje sve `aliases.map(norm)` u internu `aliasToArticleId` mapu (per subject).
- prilikom skeniranja sadržaja za linkove, `target` se prvo normalizira pa se traži kroz: `titleToId` → `aliasToId`. Ako pogodi alias, backlink se evidentira pod **kanonskim title-om** (ne pod aliasom), tako da `BacklinksPanel` i dalje grupiše po jednom članku.
- `removeArticle` čisti i alias unose.

Dodaje se `aliasToArticleId: Map<string, string>` u `SubjectState`. Verzija se bumpa na isti način kao za title.

## 5. Auto-create (`src/hooks/useWikiLinkAutoCreate.ts`)

Skeniranje koristi novi `iterateWikiLinks`. Pravilo:
- ako match ima `display` (pipe sintaksa) → **preskoči** (autor je svjesno linkovao na target koji već postoji ili planira).
- ako nema pipe-a → ponašanje ostaje identično današnjem (provjera kroz `existingTitlesLowerRef`, koja sada uključuje i sve `aliases` svih članaka, da `[[krivičnog djela]]` ne kreira duplikat ako već postoji `Krivično djelo` sa tim aliasom).

`existingTitlesLowerRef` se gradi iz `titles ∪ aliases`.

## 6. UI za uređivanje aliasa

U postojećem editor panelu članka (locirati u `src/components/zettelkasten/`), iznad ili ispod TagBar-a, dodati novi `AliasBar` (mini chip-input):
- input "Dodaj padež/sinonim..." + Enter / zarez razdvaja.
- chips sa `×` za brisanje.
- normalizacija: trim, lowercase, dedup, max 20.
- prikaz suptilan (badge-secondary, manji font), tooltip: "Sinonimi i padeži za auto-povezivanje".

Persist preko postojećeg `updateArticle` poziva (samo dodatno polje u patch-u).

## 7. Backup / Import

- `src/lib/backup/import-transaction.ts` i `migrate.ts`: `aliases` se nosi `as-is` u `bulkPut`. Migracioni step osigurava `aliases: a.aliases ?? []` pri restore-u starijih backup-a.
- Schema ladder dobija jedan korak: ako `_kbVersion < 2` → mapiraj `aliases ??= []`.

## 8. Testovi

Novi `src/test/zettelkasten-wiki-link.test.ts`:
- pipe parsing (`[[A|b]]` → `target="A"`, `display="b"`).
- mixed: `[[A]] i [[B|c]]` u istom tekstu.
- escaping: `[[A|b|c]]` → `target="A"`, `display="b|c"` (uzimamo prvi pipe).

Proširiti `src/test/zettelkasten-backlink-counts.test.ts`:
- alias indeksiranje: članak `Krivično djelo` sa `aliases: ["krivičnog djela"]` se nalazi kao backlink iz teksta koji sadrži `[[krivičnog djela]]`, grupisano pod kanonskim title-om.
- pipe sintaksa: `[[Krivično djelo|krivičnog djela]]` proizvodi backlink na `Krivično djelo`.

Proširiti `useWikiLinkAutoCreate` test ako postoji (pipe se ne auto-kreira; alias spriječava duplikat).

---

## Tehnički detalji

- **Regex sigurnost**: novi regex zabranjuje `[`, `]` u `target` i `display` da spriječi ugnježdene konstrukcije; `|` se uzima samo prvi (ostatak ide u display). Bez backtracking-a (lazy kvantifikatori sa eksplicitnim character class-om).
- **Performanse**: alias mapa se gradi inkrementalno u `upsertArticle`; full rebuild ostaje O(N · prosjek_aliases) — beznačajno na 1-2K članaka.
- **Migracija postojećih `[[wiki]]` linkova**: nije potrebna. Polje je opciono i nema breaking change-a.
- **Memory file**: po implementaciji ažurirati `mem://features/zettelkasten-notion-ux` da pomene aliases + pipe sintaksu.

## Procjena

Srednja izmjena (~7 fajlova taknuto, 2 nova). Bez breaking change-a. Hook-ovi i rendering ostaju arhitektonski isti — samo prošireni helper-i.
