

## Bulk kategorizacija kartica

### Problem
Trenutno moraš ući u svaku karticu pojedinačno da promijeniš kategoriju. Kad imaš 50+ kartica, to je nepraktično.

### Rješenje
Dodati **režim selekcije** u listu kartica sa checkbox-ovima, gdje možeš označiti više kartica i odjednom im promijeniti kategoriju/podkategoriju.

### Kako će izgledati

1. **Dugme "Označi"** u zaglavlju liste kartica (pored "Nova") — uključuje/isključuje režim selekcije
2. U režimu selekcije, svaka kartica dobija **checkbox** lijevo
3. Na vrhu se pojavljuje **akciona traka** koja prikazuje:
   - Broj označenih kartica
   - "Označi sve" / "Poništi sve" 
   - Dropdown za izbor kategorije
   - Dropdown za izbor podkategorije
   - Dugme "Primijeni"
4. Klik na "Primijeni" mijenja kategoriju/podkategoriju svim označenim karticama

### Tehnički plan

**1. `useCards.ts`** — nova funkcija `bulkUpdateCategory(ids: string[], category: string, subcategory?: string)`

**2. `CardList.tsx`** — dodati:
- Prop `selectionMode: boolean`
- Lokalni state `selectedIds: Set<string>`
- Checkbox za svaku karticu kad je `selectionMode` uključen
- Callback `onBulkAction(ids: string[])`

**3. `Index.tsx`** — dodati:
- State `selectionMode` i `selectedIds`
- Akciona traka iznad liste sa Select komponentama za kategoriju/podkategoriju
- Dugme za toggle režima selekcije
- Poziv `bulkUpdateCategory` na "Primijeni"

### Fajlovi za izmjenu
- `src/hooks/useCards.ts` — nova `bulkUpdateCategory` funkcija
- `src/components/CardList.tsx` — checkbox selekcija
- `src/pages/Index.tsx` — akciona traka i kontrola režima

