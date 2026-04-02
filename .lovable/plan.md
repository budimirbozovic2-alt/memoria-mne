

# Fix: GlobalSearch navigacija za izvore

## Problem
Klik na izvor u GlobalSearch navigira na nepostojeću rutu `/database` → 404. SessionStorage ključ `sr-open-source-id` se postavlja ali nigdje ne čita.

## Rješenje

Izvor ima `categoryId` — navigiramo na `/category/${categoryId}` i postavljamo sessionStorage flag. `CategoryView` čita flag pri mount-u i automatski otvara SourceReader.

### 1. `src/components/GlobalSearch.tsx`

**SearchResult interface** — dodati `categoryId?: string` polje.

**Kreiranje rezultata** (L104-112) — dodati `categoryId: s.categoryId` uz subtitle koji prikazuje ime kategorije:
```ts
subtitle: uuidToName[s.categoryId] ?? s.categoryId,
```

**handleSelect** (L146-149) — zamijeniti:
```ts
sessionStorage.setItem("sr-open-source-id", result.id);
navigate(`/category/${result.categoryId}`);
```

### 2. `src/views/CategoryView.tsx`

**useEffect pri mount-u** (~nakon L74) — pročitati `sr-open-source-id` iz sessionStorage. Ako postoji i source sa tim ID-om je učitan, otvoriti ga u reader-u:
```ts
useEffect(() => {
  const openId = sessionStorage.getItem("sr-open-source-id");
  if (!openId || sources.length === 0) return;
  sessionStorage.removeItem("sr-open-source-id");
  const found = sources.find(s => s.id === openId);
  if (found) setReaderSource(found);
}, [sources]);
```

## Scope
- 2 fajla, ~15 linija
- Nema novih zavisnosti

