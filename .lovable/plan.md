## Cilj

Reorganizovati `SubjectCardsView` u dvije čiste hijerarhijske sekcije sa pravim spajanjem srodnih operacija:

1. **Upravljanje karticama** (jedan tab) — interno prebacivanje između:
   - Uređivanje i dodavanje kartica (lista, pretraga, edit)
   - Struktura i raspored kartica (drag&drop u potkategorije/glave)
2. **Pasivno čitanje** (zaseban tab pod grupom "Učenje")

Mnemonička radionica je već uklonjena — ostaje uklonjena.

## Zatečeno stanje

`src/views/SubjectCardsView.tsx` već ima dvije grupe (Upravljanje, Učenje), ali pod "Upravljanje" stoje **dva odvojena taba** (`manage` i `structure`). Korisnik traži **spajanje u jedan tab** — jer su oba operacije nad istim entitetom (karticama + njihovom hijerarhijom).

## Izmjene

**`src/views/SubjectCardsView.tsx`**

1. State:
   - `tab` postaje `"manage" | "read"` (umjesto string).
   - Dodaje se `manageMode: "edit" | "structure"` kao internal sub-mode unutar "Upravljanje" taba.
   - `handlePassiveRead` ostaje (postavlja `tab="read"`).

2. TabsList:
   - Grupa **Upravljanje** dobiva **jedan** trigger: `value="manage"` → `Pencil` ikona, label "Upravljanje karticama", badge sa `cards.length`.
   - Grupa **Učenje** ostaje sa jednim triggerom: `value="read"` → "Pasivno čitanje".
   - Ukupno 2 taba (umjesto 3).

3. `TabsContent value="manage"`:
   - Na vrhu: kompaktan **segmented switch** (dva dugmeta — "Uređivanje i dodavanje" / "Struktura i raspored") koji mijenja `manageMode`.
   - Pretraga + source filter prikazani **samo** kad je `manageMode === "edit"` (nemaju smisla u struct grid pogledu).
   - "Uredi potkategorije i glave" dugme prikazano **samo** kad je `manageMode === "structure"`.
   - Conditional render: `manageMode === "edit"` → `<CardViewMode .../>`; `manageMode === "structure"` → `<CardOrgMode .../>`.

4. `TabsContent value="read"` ostaje neizmijenjen (`PassiveReader`).

5. Header subtitle ostaje: "Kartice — uređivanje, struktura i pasivno čitanje".

## Što ostaje van skopa

- Bez izmjena u `CardViewMode`, `CardOrgMode`, `PassiveReader`, `StructureManagerDialog`.
- Bez izmjena ruta (URL i dalje `subject-cards/:categoryId`).
- Bez perzistencije `manageMode` — resetuje se na `"edit"` pri remount-u (komponenta se već remount-uje preko `key={categoryId}` u parentu).
- Memorija `mem://features/subject-cards-hub-v2` će se ažurirati u istom prolazu da odražava novu strukturu (1 manage tab + segmented switch + 1 read tab).
