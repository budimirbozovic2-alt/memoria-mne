

# UUID Display Fix — Prikaz naziva umjesto UUID-ova

## Rezime
7 komponenti prikazuje sirove UUID-ove za `subcategoryId` i `chapterId` umjesto čitljivih naziva. Svaka već ima pristup `categoryId` i koristi `useLiveQuery` za `catName` — proširujemo taj lookup da uključi subcategory i chapter nazive.

---

## Problem
Korisnik vidi npr. `› a3f8c2d1-...` umjesto `› Obligaciono pravo` u headeru kartice tokom učenja, ponavljanja, i pregleda.

## Pattern za fix
Svaka pogođena komponenta već radi `useLiveQuery(() => db.categories.get(card.categoryId))` — iz tog `catRecord` možemo izvući subcategory i chapter nazive:

```text
const subName = catRecord?.subcategories
  ?.find(s => s.id === card.subcategoryId)?.name ?? card.subcategoryId;
const chName = catRecord?.subcategories
  ?.flatMap(s => s.chapters)
  ?.find(ch => (typeof ch === 'string' ? ch : ch.id) === card.chapterId)
  ?.name ?? card.chapterId;  // za chapter koji je objekat
```

## Fajlovi za izmjenu (7 fajlova, ~3-5 linija svaki)

| Fajl | Linija | Trenutno | Poslije |
|------|--------|----------|---------|
| `SessionHeader.tsx` | L89 | `{card.subcategoryId}` | `{subName}` |
| `ReviewCard.tsx` | L202 | `{card.subcategoryId}` | `{subName}` |
| `LearnModal.tsx` | L117 | `{card.subcategoryId}` i L118 `{card.chapterId}` | `{subName}` i `{chName}` |
| `SpeedReader.tsx` | L597 | `{card.subcategoryId}` | `{subName}` |
| `CardViewMode.tsx` | L370 | `{card.subcategoryId}` | `{subName}` |
| `LinkToExistingCardModal.tsx` | L93 | `{card.subcategoryId}` | `{subName}` |
| `GlobalSearch.tsx` | L83 | `${c.subcategoryId}` | lookup iz catRecords |

### Detalji po komponenti

**1-4. SessionHeader, ReviewCard, SpeedReader, CardViewMode** — sve koriste `useLiveQuery` za `catRecord`. Dodajemo `subName` derivat i zamjenjujemo u JSX-u.

**5. LearnModal** — već ima `catRecord` i `catName`. Dodajemo `subName` i `chName` derivate, zamjenjujemo L117-118.

**6. LinkToExistingCardModal** — nema `useLiveQuery`. Ovdje dodajemo `catNameMap` prop (isti pattern kao `CardList`) ili koristimo `categoryRecords` iz konteksta.

**7. GlobalSearch** — koristi `subtitle` string. Proslijediti `categoryRecords` iz AppContext za lookup.

### Bonus: forum-logic cleanup
- Obrisati `src/test/construction-phases.test.ts` (testira obrisani Forum)
- `src/lib/forum-logic.ts` — ostaviti za sada (ne koristi se nigdje osim u testu)

## Scope
- 7 fajlova, ~40 linija promjena ukupno
- Nema novih zavisnosti
- FSRS: netaknut

