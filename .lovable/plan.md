

# Ready Guard za preostale stranice

## Stranice koje koriste `cards` iz konteksta BEZ ready guarda

| Stranica | Koristi `cards`? | Ima `ready`? |
|----------|-----------------|-------------|
| `KnowledgeMapPage` | ✅ Da | ❌ Ne |
| `CategoriesPage` | ✅ Da (`cardCountByCategory`) | ❌ Ne |
| `PlannerPage` | ✅ Da | ❌ Ne |
| `MetacognitivePage` | ✅ Da | ❌ Ne |
| `FrequentErrorsPage` | ✅ Da | ❌ Ne |
| `RomanForumPage` | ✅ Da | ✅ **Već ima** |
| `MindMapPage` | ❌ Ne (koristi IDB direktno) | N/A |
| `MnemonicPage` | ❌ Ne (interno) | N/A |
| `SpeedReaderPage` | ❌ Ne | N/A |

## Plan

Dodati `ready` iz `useCardContext()` i early return loader u **5 fajlova**:

### 1. `src/views/KnowledgeMapPage.tsx`
- Dodati `ready` u destructuring
- Loader: "Učitavanje mape znanja..."

### 2. `src/views/CategoriesPage.tsx`
- Dodati `ready` u destructuring
- Loader: "Učitavanje kategorija..."

### 3. `src/views/PlannerPage.tsx`
- Dodati `ready` u destructuring
- Loader: "Učitavanje planera..."

### 4. `src/views/MetacognitivePage.tsx`
- Dodati `ready` u destructuring
- Loader: "Učitavanje analitike..."

### 5. `src/views/FrequentErrorsPage.tsx`
- Dodati `ready` u destructuring
- Loader: "Učitavanje podataka..."

Svaki guard koristi isti pattern:
```tsx
if (!ready) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Učitavanje...</p>
    </div>
  );
}
```

## Scope
- 5 fajlova, ~5 linija po fajlu
- Bez promjena logike, samo dodavanje guard blokera

