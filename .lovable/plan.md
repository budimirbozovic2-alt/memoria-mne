# Tier 1 + Tier 2 UX Fixes — Re-Tiered from Prior Audit

## Prior 9 issues, re-tiered

I went back through my prior audit and re-verified each finding against the actual code. Two were **already fixed** since the audit (good news — saves work). One was misidentified.

| # | Issue | File:Line (verified) | Real? | Tier |
|---|-------|---|---|---|
| 1 | Lying delete toast (`"Brisanje uspješno"` fires before deletion confirmed) | `ExportImportDialog.tsx` import branch | ✅ real | T1 |
| 2 | Onboarding backdrop click = `finish()` instead of `dismissForNow()` | `OnboardingModal.tsx` | ✅ real | T1 |
| 3 | `handleExport` fire-and-forget | `ExportImportDialog.tsx:53–69` | ❌ **already fixed** (awaited + finally close) | — |
| 4 | `handleImport` fire-and-forget | `ExportImportDialog.tsx:254–259` | ✅ real — `onImport()` not awaited, dialog closes instantly | T1 |
| 5 | Reset DB / Full Restore one-click destructive | `ExportImportDialog.tsx`, settings | ✅ real | T1 |
| 6 | Delete-category one-click | `CategoryView` / Structure Manager | ✅ real | T1 |
| 7 | CardForm dialog discards unsaved edits on outside-click / X / Esc | `CardForm.tsx`, `category/SourceEditor.tsx`, `SmartSplitSummaryDialog.tsx`, `ZettelEditor`, `ExaminerProfileDialog.tsx`, `BulkImportDialog.tsx` | ✅ real (sister files share the bug) | T1 |
| 8 | Inline empty states with no CTA | 14 sites (see Tier 2 list below) | ✅ real | T2 |
| 9 | Sonner toast variant misuse (`toast()` for errors) | scattered | partial — most are correct | — (deferred) |

So the actual queue is **6 Tier-1 fixes + 1 Tier-2 sweep across ~14 sites**, not "7 + 1 + 7" as the message tier-counts suggested. Flagging the discrepancy honestly rather than padding.

---

## Tier 1 — Flow Breakers

### T1.1 — Lying delete toast (`ExportImportDialog`)

**File:** `src/components/ExportImportDialog.tsx` import-success branch.
**Bug:** Success toast fires on toast queue immediately even when the import promise later rejects (because `handleImport` is fire-and-forget — see T1.2).
**Fix:** rolled into T1.2 — once `onImport` is awaited and try/catched, the toast lives inside the `try` block and only fires on actual success.

### T1.2 — `handleImport` fire-and-forget + lying toast

**File:** `src/components/ExportImportDialog.tsx:254–259`.
**Bug:** `onImport(file, strategy)` is not awaited; dialog closes via `handleOpenChange(false)` *before* import finishes. User sees instant dialog dismiss → success toast fires from inside `useCardImport` → if it later fails, the failure toast competes with the already-shown success.
**Fix:** make `handleImport` async, set `step="importing"` with progress, await `onImport`, close only on success, surface errors via `toast.error` and keep the dialog open. Requires verifying `onImport` returns a Promise (it already does — `useCardImport.importData` is async).

### T1.3 — Onboarding backdrop dismisses permanently

**File:** `src/components/OnboardingModal.tsx` (and any sister `*Onboarding*` files).
**Bug:** clicking the backdrop calls `finish()`, marking onboarding complete forever. User who clicks outside by accident loses the onboarding.
**Fix:** wire backdrop / `onPointerDownOutside` to `dismissForNow()` (re-shows next session) instead of `finish()`.

### T1.4 — Destructive one-clicks (Reset DB / Full Restore / Delete Category)

Per your decision: **two-step AlertDialog with enumerated copy**, no typed string.

For each destructive action:
- Open AlertDialog.
- Body lists exact counts: `"Brisanjem ćete trajno ukloniti: 9 kategorija, 312 kartica, 47 izvora, 14 mentalnih mapa, 23 mnemonika."` Counts pulled from `categoryRecords` / `cardMap` at click-time.
- Cancel button = default focus, autofocus.
- Destructive action button uses `variant="destructive"`, label = `"Obriši trajno"` / `"Resetuj sve"` / `"Prepiši backup-om"`.
- No timer, no checkbox — just the explicit second click on the now-clearly-labeled red button.

Touch sites:
- `ExportImportDialog.tsx` — overwrite import path
- Settings → Reset DB action
- Category structure delete (`StructureManager` / `CategoryView`)

### T1.5 — Dialog dirty-check (the inline footer bar)

Per your decision: **block close on outside-click / Esc / X when dirty, show inline "Discard / Keep editing / Save & close" bar in the dialog footer**. No nested AlertDialog.

Implementation pattern:

1. New shared hook: `src/hooks/useDirtyDialog.ts`
   ```ts
   export function useDirtyDialog(isDirty: boolean) {
     const [pendingClose, setPendingClose] = useState(false);
     const tryClose = useCallback((onClose: () => void) => {
       if (isDirty) setPendingClose(true);
       else onClose();
     }, [isDirty]);
     return { pendingClose, setPendingClose, tryClose };
   }
   ```

2. New shared component: `src/components/ui/dirty-confirm-bar.tsx` — slides into the dialog footer with three buttons (Discard = ghost destructive, Keep editing = ghost, Save & close = primary). Animates in via `data-[state=open]:animate-in`.

3. Wire each affected dialog:
   - `CardForm.tsx` (already tracks dirty via form state)
   - `category/SourceEditor.tsx` (1s-debounce save — needs an explicit dirty flag)
   - `source-reader/SmartSplitSummaryDialog.tsx` (module edits)
   - `ZettelEditor` (Notion-style — already has save-on-exit, but X needs to confirm)
   - `ExaminerProfileDialog.tsx`
   - `category/BulkImportDialog.tsx`

   For each: `<DialogContent onPointerDownOutside={e => isDirty && e.preventDefault()} onEscapeKeyDown={e => isDirty && e.preventDefault()} ...>`, intercept the X button via custom close, and render the bar conditionally.

---

## Tier 2 — Empty Dead-Ends (the "1 + 7 sister files" sweep)

The **EmptyState** component **already exists** at `src/components/EmptyState.tsx` and **already supports CTAs** via the `onAction` prop. The bug is that **14 inline `<p>Nema...</p>` blocks bypass it** — they are dead-end strings with no onAction wiring.

Sister files to migrate to `<EmptyState>` with appropriate CTA:

| File | Line | Current text | Proposed CTA |
|---|---|---|---|
| `src/components/CardList.tsx` | 171 | "Nema kartica. Kreirajte prvu!" | "Kreiraj karticu" → opens CardForm |
| `src/components/LearnSession.tsx` | 157 | "Nema kartica za odabrani filter." | "Resetuj filter" |
| `src/components/MentalSkeleton.tsx` | 157 | "Nema kartica u ovoj podkategoriji" | "Dodaj karticu" → CardForm with subcat preselected |
| `src/components/MnemonicModule.tsx` | 250 | "Još nema kartica za memorizaciju." | "Otvori radionicu" → MnemonicWorkshop |
| `src/components/MnemonicTest.tsx` | 147 | "Nema kartica spremnih za testiranje." | "Idi u radionicu" |
| `src/views/SubjectDashboard.tsx` | 294 | "Nema potkategorija…" | "Otvori Podešavanja" → settings tab |
| `src/components/SessionFilters.tsx` | 233, 277 | "Nema potkategorija/glava…" | "Dodaj u Strukturi" |
| `src/components/AutoLinkReviewModal.tsx` | 59 | "Nema preostalih predloga." | "Zatvori" (closes modal) |
| `src/components/zettelkasten/MindMapPickerDialog.tsx` | 65 | "Nema mapa uma za ovaj predmet." | "Kreiraj mapu" → MindMapEditor |
| `src/components/zettelkasten/LinkedSourcesPicker.tsx` | 62 | "Nema izvora za ovaj predmet." | "Dodaj izvor" |
| `src/components/CognitiveAnalytics.tsx` | 109, 339, 369 | "Nema detektovanih X." | No CTA — these are *positive* states (good news), keep as-is, just style with `<EmptyState>` and a subtle ✓ icon |
| `src/components/HealthMonitor.tsx` | 243, 359 | "Nema orphan zapisa", "Nema zabilježenih grešaka" | Positive states — same treatment |
| `src/components/MnemonicWorkshop.tsx` | 311, 314 | "Nema rezultata", "Nema kartica" | "Očisti pretragu" / "Dodaj karticu" |
| `src/components/zettelkasten/ZettelExplorerPanel.tsx` | 247 | "Nema rezultata za trenutne filtere." | "Resetuj filtere" |
| `src/components/zettelkasten/ZettelPreview.tsx` | 167 | "Nema sadržaja…" | "Pređi u uređivanje" |

That's the full enumeration — 14 inline sites, of which ~10 get real CTAs and ~4 stay as "positive" empty states (just styled).

---

## Plan of attack (execution order)

1. **T1.2 + T1.1** — fix `ExportImportDialog` import await + lying toast. Single file. ~30 LOC.
2. **T1.3** — onboarding backdrop. Single file, 1 line change.
3. **T1.5** — build `useDirtyDialog` + `<DirtyConfirmBar>`, wire into 6 dialogs. ~150 LOC across 8 files.
4. **T1.4** — destructive enumerated AlertDialogs. Build a tiny `<DestructiveConfirm count={...} entities={...}>` helper, use it in 3 sites. ~80 LOC.
5. **T2** — empty-state CTA sweep. Migrate 14 inline `<p>` blocks to `<EmptyState>` with appropriate CTA wiring. Mostly mechanical.

**Estimated total touch:** ~25 files, ~400 LOC (mostly added — minimal deletions).

**Out of scope (explicitly):**
- Sonner toast variant audit (#9 in original list) — separate pass
- Any keyboard-shortcut work
- Any non-listed dialog
- Anything outside the 14 enumerated empty states

Ready to execute on approval.
