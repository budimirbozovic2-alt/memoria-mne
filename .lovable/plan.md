

# Fix: Udvostručavanje kategorija nakon importa backupa

## Root Cause analiza

**Problem je na liniji 116 u `useCardImport.ts`:**

```typescript
// Za non-overwrite strategije (keep, skip, newer):
await dbCat.categories.bulkPut(catRecords);
```

`bulkPut` koristi primarni ključ (`id`) za upsert. Ovo bi trebalo raditi ispravno **ako su UUID-ovi isti**. Ali problem nastaje kada:

1. Korisnik exportuje backup (kategorije dobiju UUID-ove iz baze)
2. Korisnik importuje backup u **istu bazu** sa strategijom "keep" ili "skip" ili "newer"
3. `bulkPut` zaista ažurira kategorije po ID-u — **ali kartice se importuju kao "skip" (preskočene)**
4. **Pravi problem**: Dijalog za import (linija 436) nudi "Potvrdi import" sa strategijom `"skip"` kad nema duplikata, ali kad JE conflict detektovan, nudi tri opcije. Međutim — **conflict detekcija na linijama 219-222 provjerava samo `id` match**. Ako su kategorije identične (isti UUID), `duplicateCategoryCount > 0` i ide na conflict ekran, ali ako korisnik odabere "Dodaj samo nove (Merge)" sa strategijom `"keep"` — `bulkPut` zapravo UPSERTUJE sve kategorije iz fajla, što je korektno.

**Pravi uzrok udvostručavanja**: Postoji scenario gdje backup fajl sadrži kategorije sa **istim imenima ali RAZLIČITIM UUID-ovima** — npr. ako je baza bila resetovana/recreirana između exporta i importa. U tom slučaju `bulkPut` dodaje nove redove jer su ID-ovi različiti, što rezultira duplikatima po imenu.

## Fix

### Fajl: `src/hooks/useCardImport.ts` (~15 linija izmjena)

Za non-overwrite strategije, prije `bulkPut` dodati **deduplikaciju po imenu**:

```
1. Učitati postojeće kategorije iz IDB
2. Za svaku importovanu kategoriju:
   - Ako postoji kategorija sa istim ID-om → bulkPut će update-ovati (OK)
   - Ako postoji kategorija sa istim IMENOM ali različitim ID-om → remapirati
     kartice i izvore iz backup fajla da koriste postojeći ID, preskočiti
     insert te kategorije
   - Ako ne postoji ni po ID ni po imenu → dodati kao novu
3. Ažurirati remapped IDs u importedCards prije nego se zapišu
```

### Fajl: `src/components/ExportImportDialog.tsx` (~3 linije)

Poboljšati conflict detekciju da prikaže i **name-based duplikate** (ne samo ID-based):

```
duplicateCategoryCount treba uključiti i kategorije sa istim imenom
ali različitim UUID-om, jer su to de facto duplikati.
```

## Detalji implementacije

**Korak 1**: U `useCardImport.ts`, linija 109-117 (isRecordFormat + non-overwrite grana):
- Dodati `existingByName` mapu: `Map<string, string>` (name → existing ID)
- Filtrirati catRecords: za svaki record čije ime već postoji pod drugim ID-om, kreirati remap entry
- Primijeniti remap na `importedCards` (zamjena `categoryId`) PRIJE merge logike na linijama 81-98
- Filtrirati catRecords da se ne insertuju duplikati po imenu

**Korak 2**: U `ExportImportDialog.tsx`, linija 219-222:
- Dodati name-based provjeru: učitati `existingCatNames` i uporediti sa imenima iz backup fajla
- Uračunati name-based duplikate u `duplicateCategoryCount`

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `src/hooks/useCardImport.ts` | Name-based deduplikacija kategorija + ID remap |
| `src/components/ExportImportDialog.tsx` | Name-based conflict detekcija |

## Scope
- 2 fajla, ~25 linija neto
- Fix je backward-compatible
- Rješava i edge case kad ista baza bude resetovana pa ponovo importovana

