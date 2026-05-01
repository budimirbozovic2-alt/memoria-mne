# C1 — Eliminate ~20 `any` Sites, Then Flip Global Rule to `error`

Goal: replace every legitimate `any` outside critical paths with a real type, then change `@typescript-eslint/no-explicit-any` from `"warn"` to `"error"` globally.

## Audit (verified via ripgrep)

`grep` found **40 non-test `any` sites** across 18 files (plus 11 in test files we'll leave unless trivial). Grouped by category:

### Group 1 — `useRef<any>` for react-window (2)
- `CardList.tsx:104` — `useRef<any>` → `useRef<FixedSizeList>(null)` from `react-window`.
- `MnemonicWorkshop.tsx:138` — same fix.

### Group 2 — Framer Motion variant typings (2)
- `knowledge-map/SubcategoryList.tsx:23,25` — `slideVariants: any`, `transition: any` → `Variants` and `Transition` from `framer-motion`.

### Group 3 — Recharts payloads (1 + 5 chart-data)
- `ForgettingCurve.tsx:45` — `point: any` → `Record<string, number>` (already keyed by `day` + dynamic series names).
- `stats/OverviewTab.tsx:28,96,122,124,126,127` — chart props `any[]` → narrow interfaces (`ActivityPoint`, `CategoryBarPoint`, `RatioHistoryPoint`, `TodayTimeStat`) defined locally and re-exported.

### Group 4 — Typed catch blocks (2)
- `workers/docx-worker.ts:12` — `catch (err: any)` → `catch (err: unknown)` + `err instanceof Error ? err.message : String(err)`.
- `category/SourceEditor.tsx:81` — same fix (already pattern elsewhere in file — see prior typed-error pass).

### Group 5 — Subcategory iteration (4)
- `SessionFilters.tsx:94` — `(ch: any, i)` → `Chapter` from `@/lib/db`.
- `main.tsx:107`, `ErrorBoundary.tsx:95` — `(s: any)` → `Subcategory | string` union (mixed legacy shape).
- `workshop/WorkshopCardItem.tsx:41` — `(s: any)` → `Subcategory`.
- `hooks/useCardActions.ts:191` — `(n: any)` → `Subcategory`.

### Group 6 — Mind-map node iteration (5)
- `category/MindMapViewer.tsx:19`, `useMindMapCanvas.ts:46,64,85,96,233,242` — `(n: any)`, `data as any` → `MindMapNode` (already exported from `@/lib/db`) plus `MindMapNodeData` for the data field.
- `mindmap/ExportToCategory.tsx:17,18` — `currentNodes/Edges: any[]` → `Node[]` / `Edge[]` from `reactflow`.

### Group 7 — Import payload validation (4)
- `ExportImportDialog.tsx:102,124,176,214` — `any`/`any[]` for parsed-JSON branches. Replace with the `BackupV2` shape from the new `src/lib/migrations/backup-schema.ts` (already created in Phase 2). The validator returns a typed object so all four call-sites become typed.

### Group 8 — Misc (small)
- `lib/mnemonic-storage.ts:79` — `(c: any)` → `MnemonicCard` (the same type the array is mapping into).
- `lib/docx-parser.ts:9` — `val: any` for a `resolve|reject` settler → `unknown`.
- `lib/event-bus.ts:20,33` — `T = any` defaults + `Set<(payload: any) => void>` → `T = unknown` and `Set<(payload: unknown) => void>`. Listener call-sites already cast on receive, so no behavior change.

## Test files (skip unless trivial)

`persist-queue-c3c4.test.ts` uses `as any` 8× to construct partial mocks. Allow these via a per-file override block in `eslint.config.js` (testing partial shapes is the legitimate use case). Add:

```js
{
  files: ["src/test/**/*.{ts,tsx}"],
  rules: { "@typescript-eslint/no-explicit-any": "off" },
}
```

## Final step — flip the rule

Once all 40 sites compile with strict types, change `eslint.config.js`:

```diff
- "@typescript-eslint/no-explicit-any": "warn",
+ "@typescript-eslint/no-explicit-any": "error",
```

The dedicated critical-paths block (lines 57–69) becomes redundant — keep it anyway as a defense-in-depth marker.

## Verification

After each group, run lint (handled by harness). At the end, confirm zero `any` warnings in app code (tests excluded by override). Final lint output should have zero `no-explicit-any` violations.

## Estimated touch

~18 files, ~80 LOC of type annotations + 1 ESLint config change. No runtime behavior changes — all edits are type-level. Risk: low; the worst case is a stricter compile that surfaces a real bug, which is the entire point.

## Out of scope

- Refactoring runtime logic (only type annotations change)
- Touching `electron/`, `main.cjs`, `preload.cjs` (already ignored)
- Tier-1/Tier-2 UX work from prior phases

Ready to execute on approval.