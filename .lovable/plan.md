## Cilj

Završiti audit preostalih Dialog komponenti i refaktorisati one koje još uvijek izvršavaju teške mutacije / toastove **prije** `onClose()`/`setOpen(false)`. Time se eliminiše posljednji oslonac na `body-pointer-events-guard`.

## Nalazi audita

Pregledao sam svih 21 preostali Dialog (van ranije refaktorisanih). Većina je čista — ili samo zatvaraju (AutoSplitDialog, StructureManagerDialog, MnemonicModule, ReviewCard, ExamSidebar, HealthMonitor, SourceReader, CardRow, CardViewMode, ZettelkastenView, SubjectCardsView, SubjectDashboard, ExportImportDialog, RemapFromBackupDialog) ili već koriste pattern.

Pronađeno **4 lokacije sa kršenjem patterna**:

### 1. `src/components/category/SourceEditor.tsx` — `commitSave` (linije 161–181)
Sekvenca: `await saveSource` → `onSourceUpdated` (parent state mutation) → `toast.success` → `onClose()`. Toast i state-update treba da se desi **nakon** zatvaranja.

### 2. `src/components/category/SourceEditor.tsx` — `handleDiffConfirm` (linije 183–203)
Isti problem: `bulkFlagNeedsReview` → `saveSource` → `onSourceUpdated` → `toast.success` → `onClose()`.

### 3. `src/components/category/SourcesTab.tsx` — `handleDelete` (linije 83–96)
Brisanje izvora: `await deleteSource` → `toast.success` → `setDeleteTarget(null)` (zatvara dijalog). Toast da ide nakon zatvaranja.

### 4. `src/components/category/CardCreateMenu.tsx` — DocxImporter `onImport` callback (linije 174–188)
Sekvenca: `bulkAddFlashCards` ili `importEssays` (teška mutacija nad globalnim store-om) → `setDocxOpen(false)`. Treba prvo zatvoriti pa odgoditi mutaciju.

## Refaktor (uniforman pattern)

Za sve 4 lokacije primijeniti:

```tsx
import { afterDialogClose } from "@/lib/dialog-utils";

// PRIJE
await heavyWork();
parentMutation();
toast.success("...");
onClose();

// POSLIJE
await heavyWork();        // I/O ostaje sinhrono
onClose();                // 1) zatvori prvo
afterDialogClose(() => {  // 2) odgodi sve što triggeruje React commit / toast
  parentMutation();
  toast.success("...");
});
```

Specifičnosti:
- **SourceEditor**: dva handler-a (`commitSave`, `handleDiffConfirm`) — oba dele isti shape. Dodati import.
- **SourcesTab**: `setDeleteTarget(null)` zatvara dijalog → premjestiti **prije** `toast.success`, a toast obmotati u `afterDialogClose`.
- **CardCreateMenu**: `setDocxOpen(false)` ide prvo, pa `afterDialogClose(() => bulkAddFlashCards(...) ili importEssays(...))`.

## Ne dirati (nalaz: već OK)

- `SmartSplitSummaryDialog.onSmartSplitConfirm` — handler ne zatvara dijalog sinhrono (čeka `splitDone` state flip), nema race-a.
- `RemapFromBackupDialog.handleApply` — ostaje u `phase="done"`, korisnik manuelno zatvara → odvojeno.
- `BackupCard ExportImportDialog onImport` — koristi vlastiti progres flow; close-tracking je interni za dialog.
- `AutoSplitDialog` — samo `onClose()`, sve mutacije su unutar `useAutoSplitImport` hook-a koji ne triggeruje sinhroni close.

## Verifikacija

1. Build mora proći (TS strict).
2. `bunx vitest run` — očekujem 394/398 (4 pre-postojeća Zettelkasten wiki-link fail-a, nepovezana).
3. Smoke test ručno (samo opisno u commit poruci):
   - Brisanje izvora → toast, bez "zaledjenog" UI-ja.
   - Sačuvanje izmjena u SourceEditoru → dijalog se zatvara, toast nakon.
   - Diff confirm → kartice flagovane, dijalog zatvoren.
   - DOCX import → dijalog zatvoren prije velikog `bulkAddFlashCards` commita.

## Out of scope

- Uklanjanje `body-pointer-events-guard.ts` — ostaje kao "belt-and-suspenders" do potpune verifikacije u produkciji (Electron buildu).
- Preostali P0 (#2 lint cap, #3 SafeHtml) — odvojeni taskovi.
