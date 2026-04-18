

## Plan: Sortiranje `dueSubcategories` u ReviewSetup po `sortOrder`

### Dijagnoza

U `ReviewSetup.tsx:124-128`, `dueSubcategories` koristi `Array.from(...).sort()` što sortira UUID-ove leksikografski (random redoslijed). Iako pillovi potkategorija idu kroz `SessionFilters` koji već dobija sortiranu mapu iz `useCards.subcategories` (riješeno u prethodnoj rundi), ovaj lokalni memo se ne koristi za UI direktno — ali postoji kao **dead-ish code** koji može zbuniti budući rad.

Provjerom `SessionFilters.tsx`, lista potkategorija u pillovima se gradi iz `subcategories` propa (UUID liste već sortirane po `sortOrder`), tako da je vizuelni redoslijed već ispravan. Međutim, da bi `ReviewSetup` lokalna logika bila konzistentna sa ostatkom koda, ima smisla ovaj memo uskladiti.

### Rješenje

U `ReviewSetup.tsx` zamijeniti `dueSubcategories` memo da koristi poziciju iz `categoryRecords`:

```ts
const subPosMap = useMemo(() => {
  const m: Record<string, number> = {};
  for (const r of categoryRecords) {
    (r.subcategories || []).forEach((sub, i) => {
      const id = typeof sub === "string" ? sub : sub.id;
      const pos = typeof sub === "string" ? i : (sub.sortOrder ?? i);
      m[id] = pos;
    });
  }
  return m;
}, [categoryRecords]);

const dueSubcategories = useMemo(() => {
  if (!selectedCategory) return [];
  const subs = new Set(
    dueCards.filter(c => c.categoryId === selectedCategory && c.subcategoryId)
      .map(c => c.subcategoryId!)
  );
  return Array.from(subs).sort((a, b) => (subPosMap[a] ?? 999) - (subPosMap[b] ?? 999));
}, [dueCards, selectedCategory, subPosMap]);
```

Isto principijelno za `dueChapters` (linija 130-134) — sortirati po `sortOrder` glava umjesto UUID stringa.

### Fajlovi

- `src/components/review/ReviewSetup.tsx` — ~20 izmijenjenih linija (novi `subPosMap` + `chapPosMap` memo + izmjene postojećih `dueSubcategories` i `dueChapters` memo-a)

Ukupno: **1 fajl**. Konzistentnost sa `SessionFilters` pristupom iz prethodne runde.

