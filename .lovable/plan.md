

# Faza 1: Inženjerska stabilizacija (Data & IDB)

## Pregled

Četiri fix-a: DB recovery UI, review log migracija na IDB, source registry IDB backup, i error handling za persist operacije.

## 1. DB VersionError Recovery (C3)

### `src/lib/db.ts`
- Add exported mutable: `export let dbErrorState: { type: "version" | "timeout"; message: string } | null = null;`
- In `ensureDbOpen` catch block, on `VersionError`/`UpgradeError`, set `dbErrorState = { type: "version", message: e.message }`
- On `DB_OPEN_TIMEOUT`, set `dbErrorState = { type: "timeout", message: "..." }`

### New: `src/components/DatabaseRecoveryPanel.tsx`
- Glass-card panel centered on screen with error icon
- Shows error description (version mismatch or timeout)
- Two buttons:
  - **"Pokušaj ponovo"** → `window.location.reload()`
  - **"Resetuj bazu (uz preuzimanje backupa)"** → attempts emergency IDB export via `db.export()` blob download, then `db.delete()` + reload, with confirm dialog
- Styled with existing `glass-card`, `font-display`, gold accent classes

### `src/hooks/useCardBootstrap.ts`
- Import `dbErrorState` from db.ts
- After `ensureDbOpen` returns false, check `dbErrorState` — if set, store it in a ref/state
- Add `dbError` to return: `return { ready, dbError }`

### `src/hooks/useCards.ts`
- Destructure `dbError` from `useCardBootstrap` return
- Add `dbError` to the return object

### `src/App.tsx`
- In `CardProvider` (inside `AppContext.tsx`), check `dbError` — if truthy, render `<DatabaseRecoveryPanel error={dbError} />` instead of children
- Actually: simpler to check in `AppContext.tsx`'s `CardProvider` since it wraps `useCards()`

### Actually — cleanest approach:
- `AppContext.tsx` `CardProvider`: if `cardsHook.dbError`, render `<DatabaseRecoveryPanel>` instead of `<CardContext.Provider>`

## 2. Review Log: localStorage → IDB (C1)

### `src/views/RomanForumPage.tsx`
- Remove `import { loadReviewLog } from "@/lib/storage"`
- Add `import { idbLoadReviewLog } from "@/lib/db"`
- Replace sync `useMemo` with async pattern:
  ```
  const [reviewLog, setReviewLog] = useState<ReviewLogEntry[]>([]);
  useEffect(() => { idbLoadReviewLog().then(setReviewLog); }, []);
  ```
- `forumState` useMemo depends on `[cards, sources, reviewLog]`
- Also fix `Object.values(cards)` → just `cards` (it's already `Card[]` from context)

### `src/components/LearnSession.tsx`
- Add `reviewLog` to `LearnSessionProps` interface (in `src/components/learn/types.ts`)
- Remove `import { loadReviewLog } from "@/lib/storage"` (keep other imports from storage)
- Line ~152: replace `const reviewLog = loadReviewLog()` with the prop
- Line ~297: replace `const reviewLog = loadReviewLog()` with the prop

### `src/components/learn/types.ts`
- Add `reviewLog?: ReviewLogEntry[]` to `LearnSessionProps`

### `src/views/LearnPage.tsx`
- Pass `reviewLog={reviewLog}` to `<LearnSession>` (already available from `useCardContext()`)

## 3. Source Registry → IDB Backup (H7)

### `src/lib/db.ts`
- Add version 6 with new `sourceConfigs: "key"` store
- Add `idbLoadSourceRegistry()` and `idbSaveSourceRegistry()` helpers
- In `migrateFromLocalStorage`, add v3 migration block: if `codex-source-registry` exists in LS, write to IDB `sourceConfigs` store, clear LS key

### `src/lib/source-registry.ts`
- Keep sync `loadSourceRegistry()` / `saveSourceRegistry()` unchanged (too many sync consumers)
- Add `migrateSourceRegistryToIDB()` called from db.ts migration
- Add `syncSourceRegistryToIDB()` called after each `saveSourceRegistry()` — fire-and-forget async write to IDB for backup consistency

## 4. Error Handling (C4 & C5)

### `src/hooks/useCardAnnotations.ts`
- Wrap `idbAddReviewLogEntry(entry)` call (line ~51) in async IIFE with try/catch:
  ```ts
  (async () => {
    try { await idbAddReviewLogEntry(entry); }
    catch (err) {
      console.error("[reviewSection] log write failed", err);
      const { toast } = await import("sonner");
      toast.error("Memorija puna, istorija učenja se ne čuva!");
    }
  })();
  ```

### `src/lib/persist-queue.ts`
- Add dirty flag: before flush starts, `sessionStorage.setItem("codex-flush-pending", "1")`, after flush completes, remove it
- In `cleanup()`, set dirty flag synchronously before calling flush
- Export `checkInterruptedFlush()` for boot to call and log warning

### `src/hooks/useCardBootstrap.ts`
- After migration, call `checkInterruptedFlush()` — if dirty flag found, log `console.warn("[boot] Previous session had interrupted writes")` and clear the flag

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/db.ts` | `dbErrorState` export, v6 schema, source registry IDB helpers, migration |
| `src/components/DatabaseRecoveryPanel.tsx` | **NEW** — recovery UI |
| `src/hooks/useCardBootstrap.ts` | Expose `dbError`, check interrupted flush |
| `src/hooks/useCards.ts` | Pass through `dbError` |
| `src/contexts/AppContext.tsx` | Render recovery panel when `dbError` set |
| `src/views/RomanForumPage.tsx` | Async IDB review log, fix `Object.values` |
| `src/components/LearnSession.tsx` | Use `reviewLog` prop instead of `loadReviewLog()` |
| `src/components/learn/types.ts` | Add `reviewLog` prop |
| `src/views/LearnPage.tsx` | Pass `reviewLog` prop |
| `src/hooks/useCardAnnotations.ts` | try/catch on log write |
| `src/lib/persist-queue.ts` | Dirty flag mechanism |
| `src/lib/source-registry.ts` | IDB sync helper |

## Guardrails
- No FSRS algorithm changes
- No UI style changes — Modern-Imperial aesthetic untouched
- Internal enum values unchanged
- All TypeScript-safe

