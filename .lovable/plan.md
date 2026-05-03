## Cilj

Premjestiti primarne akcije za kreiranje sa toolbara `SubjectCardsView`-a (gore-desno pored "Pregled i uređivanje" / "Struktura") u **centar gornjeg dijela `CardViewMode` sekcije** (iznad filter bara), i razdvojiti jedno "Dodaj" dugme na **dva odvojena dropdown dugmeta**:

1. **Nova kartica** → `Dodaj esej`, `Dodaj blic pitanje`
2. **Masovni uvoz** → `Masovni uvoz esejskih pitanja`, `Masovni uvoz blic pitanja`

Empty-state CTA ("Nema kartica…") koristi istu komponentu, samo u `prominent` veličini.

## Fajlovi

1. **EDIT** `src/components/category/CardCreateMenu.tsx` — kompletna refaktorizacija: dva odvojena `DropdownMenu`-a, centriran flex-kontejner, novi prop `size?: "compact" | "prominent"` (default `compact`).
2. **EDIT** `src/views/SubjectCardsView.tsx` — ukloniti `<CardCreateMenu>` iz toolbara pored segmented switcha; vratiti taj `<div className="flex items-center gap-2">` na samostalno dugme "Uredi potkategorije i glave" (kao prije refaktora). `useBackupActions().importCards` se i dalje treba propagirati u `CardViewMode` jer se meni sada renderuje tamo. Najčistije: proslijediti `importCards` kao prop ili dodati `useBackupActions()` direktno u `CardViewMode`.
3. **EDIT** `src/components/category/CardViewMode.tsx`:
   - Dodati import `CardCreateMenu` i `useBackupActions` (lokalni read; izbjegava prop-drilling).
   - Iznad postojećeg `<CardViewFilterBar>` ubaciti centrirani wrapper `<div className="flex justify-center pb-1"><CardCreateMenu .../></div>`.
   - U empty-state granu (`cards.length === 0`) zamijeniti staro "Nova kartica" dugme (i pripadajući `AddCardDialog` lokalni state) sa istom `<CardCreateMenu size="prominent" .../>`. Ukloniti `addDialogOpen` state i lokalni `<AddCardDialog>` jer dijaloge sada drži `CardCreateMenu` interno.
   - `Plus` import postaje suvišan u `CardViewMode` — ukloniti (ostaje samo `Trash2`).
   - `AddCardDialog` import iz `./CardViewDialogs` se zadržava SAMO ako se i dalje koristi za neku drugu svrhu; pošto više ne, ukloniti ga (i pripadajući state).

## CardCreateMenu — finalna struktura

```tsx
interface Props {
  categoryId: string;
  allCategoryNames: string[];
  addCard: ...;
  addFlashCard: ...;
  importEssays: (cards, cat) => void;
  size?: "compact" | "prominent"; // NEW
}

// Renderuje:
<div className="flex items-center justify-center gap-2 flex-wrap">
  <DropdownMenu>  // "Nova kartica" — Plus icon
    <DropdownMenuItem>Dodaj esej</DropdownMenuItem>
    <DropdownMenuItem>Dodaj blic pitanje</DropdownMenuItem>
  </DropdownMenu>

  <DropdownMenu>  // "Masovni uvoz" — Upload icon, variant=outline
    <DropdownMenuItem>Masovni uvoz esejskih pitanja</DropdownMenuItem>
    <DropdownMenuItem>Masovni uvoz blic pitanja</DropdownMenuItem>
  </DropdownMenu>
</div>
// + iste 3 modal komponente (AddCardDialog, DocxImporter, MassFlashImportTrigger) kao do sada
```

`size="prominent"` → `h-10 px-4 text-sm`, default `compact` → `h-8 text-xs`.

## SubjectCardsView — uklanjanje toolbar tačke

Unutar `manage` taba, vratiti gornji kontrolni red na minimum:

```diff
- <div className="flex items-center gap-2">
-   {manageMode === MANAGE_MODE.Structure && (
-     <Button ...>Uredi potkategorije i glave</Button>
-   )}
-   <CardCreateMenu .../>     ← UKLONJENO
- </div>
+ {manageMode === MANAGE_MODE.Structure && (
+   <Button ...>Uredi potkategorije i glave</Button>
+ )}
```

Skinuti `useBackupActions` import iz `SubjectCardsView` (koristi se samo unutar `CardViewMode`).

## CardViewMode — integracija

```tsx
import CardCreateMenu from "./CardCreateMenu";
import { useBackupActions } from "@/contexts/AppContext";

// ... unutar render-a:
const { importCards } = useBackupActions();
const allCategoryNames = useMemo(
  () => allCategories.map(c => c.name),
  [allCategories]
);

// EMPTY STATE
if (cards.length === 0) {
  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-sm text-muted-foreground">Nema kartica u ovoj kategoriji.</p>
      <CardCreateMenu
        size="prominent"
        categoryId={categoryId}
        allCategoryNames={allCategoryNames}
        addCard={addCard}
        addFlashCard={addFlashCard}
        importEssays={importCards}
      />
    </div>
  );
}

// NORMAL STATE — iznad CardViewFilterBar:
<div className="flex justify-center pb-1">
  <CardCreateMenu
    categoryId={categoryId}
    allCategoryNames={allCategoryNames}
    addCard={addCard}
    addFlashCard={addFlashCard}
    importEssays={importCards}
  />
</div>
<CardViewFilterBar ... />
```

State koji se uklanja iz `CardViewMode`: `addDialogOpen`, lokalni `<AddCardDialog>` i njegov import, `Plus` ikona iz `lucide-react`.

## Verifikacija

- Toolbar sa segmented switchem više ne sadrži dugme za kreiranje (samo opcioni "Uredi potkategorije i glave" u Structure modu).
- Iznad filter bara u centru su dva dugmeta: **Nova kartica** ▾ i **Masovni uvoz** ▾, sa po 2 stavke u dropdownu.
- Empty-state ekran prikazuje istu kontrolu, samo veću.
- `rg "Nova kartica" src` → samo string u `CardCreateMenu` i `DialogTitle` u `CardViewDialogs`.
- Svi 4 flow-a otvaraju ispravne postojeće dijaloge (AddCardDialog u esej/flash modu, DocxImporter, BulkImportDialog).
