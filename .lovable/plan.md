

# Premjesti "Mapa znanja" iz tabova u header pored "Struktura"

## Šta se mijenja

"Mapa znanja" tab se uklanja iz TabsList (gdje je pored Kartica, Izvora i Mentalnih mapa) i postaje dugme u headeru, pored postojećeg dugmeta "Struktura". Sadržaj mape znanja se prikazuje umjesto tabova kad je aktivan — slično full-screen režimu.

## Fajl: `src/views/CategoryView.tsx`

### 1. Dodati state za knowledge view
- Dodati `showKnowledge` boolean state (default `false`)

### 2. Header — dodati dugme pored "Struktura" (L192-195)
- Novo dugme sa `Map` ikonom i tekstom "Mapa znanja", isti stil kao "Struktura" (`variant="outline" size="sm"`)
- `onClick` toggleuje `showKnowledge`

### 3. Ukloniti "Mapa znanja" iz TabsList (L267-270)
- Obrisati `TabsTrigger value="knowledge"`

### 4. Ukloniti `TabsContent value="knowledge"` (L372-404)
- Premjestiti sadržaj u conditional renderovanje ispod mastery bara, iznad Tabs bloka
- Kad je `showKnowledge === true`, prikazati SubcategoryList/MentalSkeleton umjesto Tabs sekcije
- Dodati kompaktan header sa back dugmetom za povratak na tabove

### 5. Cleanup
- Ukloniti `Map` iz importa ako se premjesti na dugme (ostaje u importu)
- Resetovati `showKnowledge` na `false` kad se klikne back

## Scope
- 1 fajl, ~15 linija promijenjeno

