

# Fix: UUID prikaz u Podešavanjima (CategoryManager)

## Problem

`CategoryManager.tsx` prima `categories: string[]` (niz UUID-ova) i prikazuje ih direktno:
- **L133**: `{cat}` — UUID umjesto naziva predmeta
- **L40**: Edit prefill koristi UUID
- **L271**: Delete confirmation prikazuje UUID

## Promjene

### 1. `CategoryManager.tsx` — dodati `categoryRecords` prop, lookup nazive

| Lokacija | Promjena |
|----------|----------|
| Props interface | Dodati `categoryRecords: CategoryRecord[]` |
| L133 | `{cat}` → `{nameMap[cat] \|\| cat}` |
| L38-41 | `startEdit` — prefill sa display name umjesto UUID |
| L44 | `confirmEdit` — proslijediti UUID + novi naziv u `onRename` |
| L271 | Delete dialog — prikazati display name |

Napraviti `nameMap` sa `useMemo`:
```ts
const nameMap = useMemo(() => {
  const m: Record<string, string> = {};
  categoryRecords.forEach(r => { m[r.id] = r.name; });
  return m;
}, [categoryRecords]);
```

### 2. `SystemTab.tsx` — proslijediti `categoryRecords`

- Dodati `categoryRecords` u Props interface
- Proslijediti ga u `<CategoryManager>`

### 3. `SRSettingsPanel.tsx` — proslijediti `categoryRecords`

- Dodati `categoryRecords` iz `useCategoryData()`
- Proslijediti u `<SystemTab categoryRecords={categoryRecords}>`

## Scope
- 3 fajla, ~15 linija promjena
- Eliminacija UUID prikaza u Settings/Sistem tabu

