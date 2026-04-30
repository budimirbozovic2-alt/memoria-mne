# Finish the dependency inversion

The structural refactor (5 sibling providers, no Proxy, `useCards.ts` deleted) is already in place. What's left is to **make consumers feel the inversion** — right now they still go through merged shims that recreate the old "God Object" surface, and a handful of components still reach past the providers into `@/lib/db` directly.

This plan finishes the job in four scoped passes.

## Current state (verified)

- `CardProvider.tsx` is a 78-line composition root mounting `CategoryStateProvider → CardStateProvider → CardActions → CategoryActions → BackupActions`.
- Sub-hooks return stable `useCallback`/`useMemo` references — the Proxy is gone.
- Two back-compat shims survive in `CardProvider.tsx`:
  - `useCardActions()` merges `useCardOnlyActions + useCategoryActions + useBackupActions + updateSRSettings` → consumed by **17 files**.
  - `useCategoryData()` merges category state + `categoryStats` → consumed by **27 files**.
- 45 direct `@/lib/db` imports remain in `src/components` + `src/views`. **The vast majority are type-only** (`type CategoryRecord`, `type Source`, `MindMapDoc`) — those are fine. Only ~6 files pull the runtime `db` instance.
- `useCardData` / `useReviewData` / `useCategoryDataInternal` still silently return empty fallbacks in DEV when no provider is mounted (masks bugs).

## Pass 1 — Migrate `useCardActions` consumers to focused hooks

Each of the 17 callers actually uses 1–4 functions from one domain. We replace the merged shim with the right specific hook.

For each file in the consumer set, classify the calls and rewrite the import:

| Domain used                          | Hook to import                                |
| ------------------------------------ | --------------------------------------------- |
| `addCard`/`updateCard`/`deleteCard`/`patchCard`/`splitCard`/`bulkAddCards`/`addFlashCard` | `useCardOnlyActions` from `CardActionsProvider` |
| `reviewSection`/`markRead`/`toggleTag`/`logError`/`clearErrorLog`/`addKeyPart`/`bulkFlagNeedsReview`/`bulkUpdateChapter` | `useCardOnlyActions` (same provider)            |
| `add/rename/deleteCategory`, subcategory ops, chapter ops, reorders, `updateExaminerProfile` | `useCategoryActions` from `CategoryActionsProvider` |
| `exportData`/`exportTemplate`/`importData`/`importCards` | `useBackupActions` from `BackupActionsProvider`  |
| `updateSRSettings`                  | new `useSettingsActions()` exported from `CardStateProvider` (thin wrapper around the existing internal) |

Then **delete `useCardActions()` from `CardProvider.tsx`**. A component that needs two domains imports two hooks — that's the point of the inversion.

## Pass 2 — Split `useCategoryData` into reader + stats

The 27 callers fall into two groups:

- **Pure list/record consumers** (most of them): only need `categories`, `categoryRecords`, or `subcategories`. Migrate to `useCategoryDataInternal` (renamed to **`useCategoryData`** publicly — the merged shim drops the `Internal` suffix).
- **Stats consumers** (`Dashboard`, `MyStats`, sidebars, dashboards): also need `categoryStats`. They call **`useCategoryStatsData()`** in addition.

Rename in two steps to avoid collisions:

1. Rename the current `useCategoryDataInternal` → `useCategoryData` and re-export from `CategoryStateProvider`.
2. Delete the merged `useCategoryData()` shim in `CardProvider.tsx`.
3. Update the ~6 stats consumers to also call `useCategoryStatsData`.

This guarantees that a component touching only the category list **does not re-render** when card stats change.

## Pass 3 — Harden missing-provider behavior

Today these three hooks silently return empty fallbacks in DEV, which hides real "rendered outside provider" bugs:

- `useCardData` (`CardStateProvider.tsx`)
- `useReviewData` (`CardStateProvider.tsx`)
- `useCategoryDataInternal` (`CategoryStateProvider.tsx`)

Change them to **throw in both DEV and PROD**. The HMR concern in the comments is moot because `CardProvider` is mounted at the App root — there is no legitimate path where a child renders without it.

## Pass 4 — Remove the few real runtime DB leaks

Type-only imports (`type CategoryRecord`, `type Source`, `MindMapDoc`) **stay** — they're free at runtime and types are the lingua franca of the data layer. We only target files that import the `db` instance or runtime query helpers:

- `src/components/HealthMonitor.tsx` — owns orphan-scan logic; this one is legitimately a DB tool, leave it (document as the single sanctioned exception).
- `src/components/ExportImportDialog.tsx` — should call `useBackupActions` only; remove direct `db` import if any read is still inline.
- Audit the remaining handful with `rg -n "import \{[^}]*\bdb\b" src/components src/views` and migrate each to either a domain action or a one-off `db-queries.ts` helper.

We do **not** chase the ~40 type-only imports — that would be churn for no architectural gain.

## Out of scope

- ESLint rules to ban raw Tailwind colors / direct DB imports — separate audit recommendation, not part of the inversion.
- Further decomposition of `useCardCRUD` / `useCategoryManagement` internals — they're already focused.

## Technical notes

- `useSettingsActions` is a 6-line addition to `CardStateProvider.tsx` that exposes `{ updateSRSettings }` from the existing internals context — gives us a clean home for that one stray action without resurrecting a merged shim.
- After Pass 1+2, `src/contexts/cards/CardProvider.tsx` shrinks from ~78 lines to ~40: just the composition root, the `RecoveryGate`, and re-exports.
- Build will surface every missed migration via TS — no runtime risk.
- No changes to data flow, persistence, IDB schema, or boot sequence.

## Files touched (estimate)

- **Modified**: `src/contexts/cards/CardProvider.tsx`, `CardStateProvider.tsx`, `CategoryStateProvider.tsx`, plus ~17 + ~27 (with overlap, net ~35) consumer files for hook renames, plus 2–3 view components for the runtime-DB cleanup.
- **No new files**, **no deletions** beyond the two shim functions.

## Approval

Confirm and I'll execute all four passes in one go. The build will be the regression test — every miscategorized call site fails type-check immediately.
