## Cilj

Dodati filter za tip pitanja (Sve / Esejska / Blic) u `PassiveReader`, uz postojeće filtere za potkategoriju i glavu, sa istom persistencijom po kategoriji.

## Izmjene

**Fajl:** `src/components/subject-cards/PassiveReader.tsx`

### 1. Tip + persistencija
- Uvesti tip `type TypeFilter = "all" | "essay" | "flash"`.
- Proširiti `PersistedFilters` sa `typeFilter: TypeFilter`.
- `loadPersistedFilters` validira vrijednost (`"essay" | "flash"`, inače `"all"`) — backward-compatible sa starim ključem koji nema polje.

### 2. State
- Dodati `const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => loadPersistedFilters(categoryId).typeFilter);`.
- Persist effect proširiti da serijalizuje `typeFilter` zajedno sa ostalima.

### 3. Filter logika
- U `filtered` useMemo dodati: `if (typeFilter !== "all") list = list.filter(c => c.type === typeFilter);`.
- Dodati `typeFilter` u dependency niz.
- Reset-index effect proširiti sa `typeFilter` u dep listi (već prati `subFilter`/`chapterFilter`).

### 4. UI — novi Select pored postojećih (linija ~209)
```tsx
<Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
  <SelectTrigger className="h-9 w-[160px]">
    <SelectValue placeholder="Tip" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Svi tipovi</SelectItem>
    <SelectItem value="essay">Esejska</SelectItem>
    <SelectItem value="flash">Blic</SelectItem>
  </SelectContent>
</Select>
```

### 5. Quick-action kompatibilnost
- U effect-u koji honoruje `initialCardId`: ako je kartica skrivena trenutnim filterima, pored `subFilter`/`chapterFilter` treba resetovati i `typeFilter` na `"all"` da bi se uvijek mogla pozicionirati na traženu karticu.

## Van opsega
- Brojači po tipu u Select-u (ostavljamo čisto kao subcategory select).
- Promjene u `SubjectCardsView` ili strukturi taba — nisu potrebne.