

# Dodaj progres po predmetima za danas u dnevnik

## Šta se dodaje

Ispod sedmičnog grafikona (WeeklyChart), a iznad lapsusa/uspjeha, dodaje se kompaktan blok "Danas po predmetima" koji prikazuje za svaki predmet koliko je cjelina odrađeno danas — izvučeno iz `reviewLog` za danas.

## Tehnički detalji

### Fajl: `src/components/metacognitive/DiarySection.tsx`

1. **Import** `BookOpen` već postoji (koristiće se za ikonu sekcije)

2. **Novi `useMemo`** — grupiše današnje review log entryje po kategoriji:
   - Filtrira `reviewLog` za `timestamp >= startOfDay(today)`
   - Grupiše po `category` → broji unique sekcije (cardId + sectionIndex)
   - Rezultat: `{ categoryId, name (iz catNameMap), count }[]` sortiran po count desc
   - Prikazuje se samo ako ima barem 1 entry

3. **UI blok** — ubacuje se na L120 (nakon WeeklyChart Suspense, prije lapsusa):
   - `rounded-xl border bg-card p-5` kartica
   - Naslov: `BookOpen` ikona + "Danas po predmetima"
   - Lista predmeta: ime + badge sa brojem odrađenih cjelina
   - Kompaktan layout — svaki red ima ime lijevo, broj desno

### Scope
- 1 fajl, ~30 linija dodato
- Nema novih zavisnosti ili props-a — koristi postojeći `reviewLog`, `catNameMap`, `startOfDay`

