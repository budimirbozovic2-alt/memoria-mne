

# FAZA 1: Stabilizacija Temelja — Single Source of Truth & Service Layer

## Rezime za korisnika
Eliminišemo trostruko stanje kategorija, uvodimo pouzdane async operacije sa rollback-om, i popravljamo `addChapter` koji trenutno ne ažurira UI.

---

## Promjena 1: Konsolidacija category state-a (Finding #2)

**Problem**: Trenutno postoje 3 paralelna stanja: `categories: string[]`, `categoryRecords: CategoryRecord[]`, `subcategories: Record<string, string[]>`. Svaka mutacija mora ručno sinhronizovati sva tri + IDB.

**Rješenje**: `categoryRecords` postaje jedini kanonski state. Ostalo se derivira.

### useCards.ts
- **Ukloniti** `categories`, `setCategoriesState` i `subcategories`, `setSubcategoriesState`
- **Zadržati** samo `categoryRecords`, `setCategoryRecordsState`
- **Dodati** dva `useMemo` derivata:
  ```ts
  const categories = useMemo(() => 
    categoryRecords.map(r => r.id), [categoryRecords]);
  
  const subcategories = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of categoryRecords) {
      map[r.id] = (r.subcategories || []).map(n => 
        typeof n === "string" ? n : n.name);
    }
    return map;
  }, [categoryRecords]);
  ```
- **Ukloniti** `setCategories` wrapper (L87-107) i `setSubcategories` wrapper (L109-132) — više nisu potrebni
- **Ukloniti** `reorderCategories` i `reorderSubcategories` inline funkcije (L262-304) — prebaciti u `useCategoryManagement`
- Derived `useMemo` za `dueCards/stats/categoryStats` ostaje isti, samo zamijeni `categories` dependency sa `categoryRecords`

### useCategoryManagement.ts — novi interfejs
- Promijeniti parametre: umjesto `setCategories` + `setSubcategories`, prima `setCategoryRecords: Dispatch<SetStateAction<CategoryRecord[]>>`
- Sve CRUD operacije (add/rename/delete/reorder za kategorije, podkategorije, glave) mutiraju `categoryRecords` state direktno + pišu u IDB
- Primjer za `addCategory`:
  ```ts
  const addCategory = useCallback((name: string) => {
    const newRec: CategoryRecord = { 
      id: crypto.randomUUID(), name, sortOrder: 9999, subcategories: [] 
    };
    setCategoryRecords(prev => [...prev, newRec]);
    // async persist (sa rollback-om — vidi Promjenu 2)
  }, [setCategoryRecords]);
  ```

### useCardBootstrap.ts
- Ukloniti `setCategoriesState` i `setSubcategoriesState` iz `BootSetters`
- Zadržati samo `setCategoryRecordsState` za kategorije
- Bootstrap i dalje čita iz IDB i postavlja `categoryRecords`

### AppContext.tsx
- `CardDataContextValue` zadržava `categories`, `categoryRecords`, `subcategories` — ali su sada derivirani, ne zasebni state-ovi
- Nema promjena u interfejsu za potrošače (backward compatible)

---

## Promjena 2: Async integritet sa rollback-om (Finding #3)

**Problem**: Fire-and-forget `(async () => { ... })()` pattern — ako IDB fail-uje, UI prikazuje promjenu koja ne postoji u bazi.

**Rješenje**: Optimistički update sa rollback-om.

### Helper funkcija u `useCategoryManagement.ts`
```ts
async function optimisticCategoryUpdate(
  setCategoryRecords: Dispatch<SetStateAction<CategoryRecord[]>>,
  updater: (prev: CategoryRecord[]) => CategoryRecord[],
  persist: (records: CategoryRecord[]) => Promise<void>,
  label: string
) {
  let rollbackSnapshot: CategoryRecord[] | null = null;
  setCategoryRecords(prev => {
    rollbackSnapshot = prev;
    return updater(prev);
  });
  try {
    // Čitaj trenutni state iz IDB, primijeni istu transformaciju, snimi
    const current = await idbLoadCategories();
    const updated = updater(current);
    await idbSaveCategories(updated);
  } catch (e) {
    console.error(`[${label}] IDB persist failed, rolling back`, e);
    if (rollbackSnapshot) setCategoryRecords(rollbackSnapshot);
    toast({ title: "Greška", description: "Promjena nije sačuvana.", variant: "destructive" });
  }
}
```

Svaka CRUD operacija koristi ovaj helper umjesto fire-and-forget.

---

## Promjena 3: Fix addChapter — in-memory update (Finding #3, specifičan bug)

**Problem**: `addChapter` (L248-260) samo piše u IDB, bez ažuriranja React state-a. UI ne prikazuje novi chapter do reload-a.

**Rješenje**: Koristiti `optimisticCategoryUpdate` helper:
```ts
const addChapter = useCallback((categoryId, subName, chapterName) => {
  optimisticCategoryUpdate(
    setCategoryRecords,
    records => records.map(r => {
      if (r.id !== categoryId) return r;
      return { ...r, subcategories: r.subcategories.map(n => {
        if (n.name !== subName || n.chapters.includes(chapterName)) return n;
        return { ...n, chapters: [...n.chapters, chapterName] };
      })};
    }),
    async (updated) => {
      const rec = updated.find(r => r.id === categoryId);
      if (rec) await saveNodes(categoryId, rec.subcategories as SubcategoryNode[]);
    },
    "addChapter"
  );
}, [setCategoryRecords]);
```

---

## Promjena 4: Smanjenje useCards.ts (Finding #7)

Nakon Promjene 1, useCards.ts gubi:
- `setCategories` wrapper (~20 linija)
- `setSubcategories` wrapper (~22 linija)
- `reorderCategories` (~17 linija)
- `reorderSubcategories` (~24 linija)

Ukupno ~83 linija manje. Hook pada sa ~354 na ~270 linija.

`reorderCategories` i `reorderSubcategories` se prebacuju u `useCategoryManagement` jer sada direktno mutiraju `categoryRecords`.

---

## Fajlovi koji se mijenjaju

| Fajl | Promjena | ~Linija |
|------|----------|---------|
| `src/hooks/useCards.ts` | Ukloni 3 state-a, dodaj 2 useMemo, ukloni inline wrappere | -83, +15 |
| `src/hooks/useCategoryManagement.ts` | Novi interfejs (setCategoryRecords), rollback helper, fix addChapter, preuzmi reorder | -30, +60 |
| `src/hooks/useCardBootstrap.ts` | Ukloni setCategoriesState/setSubcategoriesState iz BootSetters | -8, +2 |
| `src/hooks/useCardImport.ts` | Prilagodi interfejs (setCategoryRecords umjesto setCategories+setSubcategories) | ~10 |
| `src/contexts/AppContext.tsx` | Bez promjena interfejsa — derivirani `categories`/`subcategories` se i dalje proslijeđuju | ~5 |

## Guardrails
- FSRS logika: netaknuta
- UUID kategorija: netaknut — ovo je refaktoring oko njega, ne zamjena
- Ready Guard: svi `if (!ready)` ostaju
- Backward compatibility: svi potrošači i dalje dobijaju `categories: string[]` i `subcategories: Record<string,string[]>` kroz context — samo je izvor podataka sada deriviran umjesto zasebnog state-a

## Scope
- 5 fajlova, ~180 linija promjena
- Nema IDB schema promjena
- Nema novih zavisnosti

