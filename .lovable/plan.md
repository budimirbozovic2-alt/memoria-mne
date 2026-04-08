

# Popravka "Mapa znanja" dugmeta u headeru predmeta

## Problem

Dugme "Mapa znanja" toggleuje `showKnowledge` stanje, ali sadržaj mape se renderuje **ispod** Tabs sekcije (na dnu stranice), pa korisnik ne vidi promjenu i misli da dugme ne radi. Sadržaj treba da **zamijeni** tabove kad je aktivan, umjesto da se dodaje ispod.

## Rješenje

### Fajl: `src/views/CategoryView.tsx`

1. **Premjestiti knowledge map sadržaj iznad/umjesto Tabs bloka**
   - Kad je `showKnowledge === true`, prikazati SubcategoryList/MentalSkeleton **umjesto** Tabs komponente
   - Kad je `showKnowledge === false`, prikazati standardne Tabs (Kartice, Izvori, Mentalne mape)
   - Koristiti uslovni rendering: `{showKnowledge ? <KnowledgeContent /> : <Tabs>...</Tabs>}`

2. **Ukloniti stari overlay blok** (L375-409) koji renderuje knowledge map ispod tabova

## Scope
- 1 fajl, ~10 linija promijenjeno — premještanje bloka iz dna u conditional umjesto Tabs

