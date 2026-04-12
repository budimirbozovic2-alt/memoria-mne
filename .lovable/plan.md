

# Sakriti dugme "Članovi" za skripte

## Izmjena

**Fajl: `src/components/source-reader/SourceToolbar.tsx`**, linija 100:

Dodati uslov `sourceKind === "propis"` na postojeći guard za "Članovi" dugme:

```tsx
// Prije:
{editMode && onAutoFormat && (

// Poslije:
{editMode && onAutoFormat && sourceKind === "propis" && (
```

## Scope
- 1 fajl, 1 linija izmjene

