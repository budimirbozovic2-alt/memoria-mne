

# Fix: UUID prikaz u Mapi Znanja — potkategorije i glave

## Pronađeni problemi

### Problem 1: Source hierarchy mode — UUID prikazan umjesto naziva
**Fajl**: `src/hooks/useSourceHierarchy.ts` L69, L72

```
const sub = card.subcategoryId || "Ostalo";  // ← UUID
const chap = card.chapterId || "Ostalo";     // ← UUID
```

Ovi UUID-ovi postaju `name` polje u `HierarchyNode`/`HierarchyLeaf` i prikazuju se u UI-u.

### Problem 2: Fallback mode — display name proslijeđen umjesto UUID-a
**Fajl**: `src/components/knowledge-map/SubcategoryList.tsx` L112, L147, L160

```
return { name: subNameMap[sub] || sub, ... };  // name = display naziv
...
const realIndex = subs.indexOf(name);          // ← -1 jer subs ima UUID-ove
onSelectSubcategory(name)                      // ← šalje display naziv umjesto UUID-a
```

MentalSkeleton zatim filtrira `c.subcategoryId === subcategory`, ali prima display naziv umjesto UUID-a → **0 kartica se prikaže**.

---

## Plan promjena

### 1. `useSourceHierarchy.ts` — dodati `categoryRecords` parametar, lookup nazive

- Dodati `CategoryRecord[]` kao parametar
- Napraviti `subNameMap` i `chapterNameMap` iz category record-a
- Zamijeniti `card.subcategoryId` sa lookup-om za `name`, zadržati UUID kao `id`
- Dodati `id` polje u `HierarchyNode` i `HierarchyLeaf` interfejse

### 2. `SubcategoryList.tsx` — razdvojiti `id` od `name`

**Fallback path:**
- Zadržati UUID kao `id` u `subsWithStats` objektima
- Koristiti `subNameMap[sub]` za prikaz
- Proslijediti `id` (UUID) u `onSelectSubcategory()` umjesto `name`
- Koristiti `id` za `realIndex` lookup u `subs` nizu

**Source hierarchy path:**
- Koristiti `node.id` za navigaciju, `node.name` za prikaz

### 3. `SubcategoryList.tsx` Props — proslijediti `categoryRecords`
- Već ima pristup preko `categoryRecords` prop-a (iz parent-a)

### 4. `useSourceHierarchy` pozivači — proslijediti `categoryRecords`
- `SubcategoryList.tsx` — jedini potrošač, dodati argument

| Fajl | Promjena |
|------|----------|
| `src/hooks/useSourceHierarchy.ts` | Dodati `id` polje, lookup nazive iz categoryRecords |
| `src/components/knowledge-map/SubcategoryList.tsx` | Razdvojiti id/name, proslijediti UUID za navigaciju |

## Scope
- 2 fajla, ~25 linija promjena
- Fiksira UUID prikaz u oba moda Mape Znanja
- Fiksira navigaciju u fallback modu (kartica se nisu prikazivale)

