## Cilj

Razdvojiti **kreiranje kartica** od **filtera/pregleda** u "Pregled i uređivanje kartica", i centralizovati 4 creation flow-a u jedan **Dodaj** dropdown postavljen pored segmentnog prekidača "Pregled i uređivanje" / "Struktura i raspored".

## Fajlovi koji se mijenjaju / kreiraju

1. **NOVO** `src/components/category/CardCreateMenu.tsx` — `DropdownMenu` sa 4 stavke; renderuje sve potrebne dijaloge interno; kontroliše svoj state.
2. **NOVO** `src/components/category/MassFlashImportTrigger.tsx` — tanki wrapper oko `BulkImportDialog`. Modularna izolacija da se u sljedećoj iteraciji target lako zamijeni "Wizardom" — `CardCreateMenu` zna samo za ovaj wrapper, ne za `BulkImportDialog`.
3. **EDIT** `src/components/category/CardViewFilterBar.tsx` — uklanja se `Plus`/`Upload` ikone, props `onBulkImport`, `onAddCard`, i oba dugmeta ("Nova kartica", "Masovni Import"). Filter postaje strogo read-only/filter površina.
4. **EDIT** `src/components/category/CardViewMode.tsx` — uklanjaju se `addDialogOpen`, `bulkImportOpen`, `AddCardDialog`, `BulkImportWrapper` render i odgovarajući props na `CardViewFilterBar`. Ostaje samo "empty-state" CTA (jedno dugme, otvara `AddCardDialog` lokalno) — ovo je read-only fallback i nije u filter baru.
5. **EDIT** `src/components/category/CardViewDialogs.tsx` — `AddCardDialog` dobija opcioni `defaultMode?: "essay" | "flash"` (default ostaje `"flash"`) da bi "Dodaj esej" odmah otvorio dijalog u esej-modu, "Dodaj blic pitanje" u flash-modu.
6. **EDIT** `src/views/SubjectCardsView.tsx` — između segmentnog prekidača (`MANAGE_MODES`) i dugmeta "Uredi potkategorije i glave" ubacuje `<CardCreateMenu categoryId=... addCard=... addFlashCard=... allCategoryNames=... importCards=... />`. Ovo je vidljivo u oba moda (Edit i Structure), pošto je primarna akcija na nivou tab-a.

## CardCreateMenu — struktura

```tsx
// src/components/category/CardCreateMenu.tsx
import { useState } from "react";
import { Plus, Pencil, Sparkles, FileText, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AddCardDialog } from "./CardViewDialogs";
import MassFlashImportTrigger from "./MassFlashImportTrigger";
import DocxImporter from "@/components/DocxImporter";
import type { Card } from "@/lib/spaced-repetition";

interface Props {
  categoryId: string;
  allCategoryNames: string[];
  addCard: (q: string, sections: { title: string; content: string }[], cat: string, sub?: string, ch?: string) => Card;
  addFlashCard: (q: string, a: string, cat: string, sub?: string) => Card;
  importEssays: (cards: { question: string; sections: { title: string; content: string }[] }[], category: string) => void;
}

export default function CardCreateMenu({
  categoryId, allCategoryNames, addCard, addFlashCard, importEssays,
}: Props) {
  const [addOpen, setAddOpen]   = useState(false);
  const [addMode, setAddMode]   = useState<"essay" | "flash">("flash");
  const [docxOpen, setDocxOpen] = useState(false);
  const [bulkFlashOpen, setBulkFlashOpen] = useState(false);

  const open = (mode: "essay" | "flash") => { setAddMode(mode); setAddOpen(true); };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Dodaj
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
            Pojedinačno
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => open("essay")}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Dodaj esej
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open("flash")}>
            <Sparkles className="h-3.5 w-3.5 mr-2" /> Dodaj blic pitanje
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
            Masovni uvoz
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setDocxOpen(true)}>
            <FileText className="h-3.5 w-3.5 mr-2" /> Masovni uvoz eseja
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBulkFlashOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-2" /> Masovni uvoz blic pitanja
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddCardDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categoryId={categoryId}
        addCard={addCard}
        addFlashCard={addFlashCard}
        defaultMode={addMode}
      />

      {docxOpen && (
        <DocxImporter
          open={docxOpen}
          onClose={() => setDocxOpen(false)}
          categories={allCategoryNames}
          onImport={(cards, cat, type) => {
            if (type === "flash") {
              cards.forEach(c =>
                addFlashCard(c.question, c.sections.map(s => s.content).join("\n"), cat),
              );
            } else {
              importEssays(cards, cat);
            }
            setDocxOpen(false);
          }}
        />
      )}

      <MassFlashImportTrigger
        open={bulkFlashOpen}
        onOpenChange={setBulkFlashOpen}
        categoryId={categoryId}
        addFlashCard={addFlashCard}
      />
    </>
  );
}
```

`MassFlashImportTrigger` je trivijalan re-export sloj:
```tsx
// src/components/category/MassFlashImportTrigger.tsx
import BulkImportDialog from "./BulkImportDialog";
// Buduća iteracija: zamijeniti BulkImportDialog višestepenim Wizardom.
export default function MassFlashImportTrigger(props) { return <BulkImportDialog {...props} />; }
```

## Diff za `CardViewFilterBar.tsx` (dokaz dekupliranja)

```diff
-import { Filter, X, Plus, Upload, CheckSquare } from "lucide-react";
+import { Filter, X, CheckSquare } from "lucide-react";
@@
 interface Props {
   ...
   selectionMode: boolean;
   onToggleSelectionMode: () => void;
-  onBulkImport: () => void;
-  onAddCard: () => void;
   onDelete?: (id: string) => void;
 }
@@
-  selectionMode, onToggleSelectionMode,
-  onBulkImport, onAddCard, onDelete,
+  selectionMode, onToggleSelectionMode, onDelete,
 }: Props) {
@@
         {onDelete && ( ... selekcija ... )}
-        <Button variant="outline" size="sm" onClick={onBulkImport} className="h-7 gap-1.5 text-xs">
-          <Upload className="h-3.5 w-3.5" /> Masovni Import
-        </Button>
-        <Button variant="default" size="sm" onClick={onAddCard} className="h-7 gap-1.5 text-xs">
-          <Plus className="h-3.5 w-3.5" /> Nova kartica
-        </Button>
       </div>
```

## Integracija u `SubjectCardsView.tsx`

Pored postojećeg `inline-flex` segmented switcha (linija ~265) i dugmeta "Uredi potkategorije i glave", umetnuti:

```tsx
<CardCreateMenu
  categoryId={categoryId!}
  allCategoryNames={categoryRecords.map(c => c.name)}
  addCard={addCard}
  addFlashCard={addFlashCard}
  importEssays={(cards, cat) => importCards(cards, cat)}
/>
```

`importCards` se uzima iz `useBackupActions()` (isti pattern kao postojeći `DocxImporterWrapper` u `MainLayout`). Time se DocxImporter više ne zove iz `MainLayout` u kontekstu predmeta — `MainLayout` instanca se može sačuvati za globalni uvoz iz sidebar-a (van scope-a ovog refactora).

## Cleanup u `CardViewMode.tsx`

- Obrisati state `addDialogOpen`, `bulkImportOpen`.
- Obrisati `<AddCardDialog />` i `<BulkImportWrapper />` na dnu.
- Obrisati `onBulkImport` / `onAddCard` props na `<CardViewFilterBar />`.
- Empty-state CTA: zadržati JEDNO "Nova kartica" dugme koje renderuje lokalni `AddCardDialog` samo kada je lista prazna (UX: korisnik bez kartica ne mora prvo otvarati gornji meni).

## Verifikacija

- Filter bar nema više `Plus`/`Upload` ikone niti props (`rg "onAddCard|onBulkImport" src` → 0 hitova).
- "Dodaj" dropdown ima tačno 4 stavke; svaka pokreće postojeći flow.
- `MassFlashImportTrigger` je jedina tačka koja zna za `BulkImportDialog` — buduća zamjena je 1-line edit.
- Provjera: render `SubjectCardsView`, kliknuti svaku od 4 stavke, potvrditi da se otvara odgovarajući dijalog/komponenta.
