# Phase 2 — Type-Safety / Lint Hardening (Audit + Targeted Fixes)

## Reality check vs. the brief

I read every file mentioned. **Three of the four tasks are already shipped.** I'm flagging this so we don't introduce churn-for-the-sake-of-churn.

| # | Task | Current state | Action needed |
|---|------|---------------|---------------|
| 1 | `backup-schema.ts` with type guard | **Exists.** 438 LOC of Zod schemas + `isMinimalBackup` type guard + `ParsedBackup` type. Far stricter than the requested hand-rolled guard. | **Add** the requested `isValidBackupPayload(data: unknown): data is ParsedBackup` as a thin `safeParse` wrapper — gives you the exact API surface the brief asks for, on top of the existing Zod machinery. |
| 2 | Remove `any` from `useCardImport.ts` | **Already done.** Zero `any`. Zero `eslint-disable`. Already calls `BackupSchema.safeParse(raw)` and throws/toasts on failure. | **No change.** Replacing `safeParse` with the thinner `isValidBackupPayload` wrapper would *lose* per-field validation errors (currently we surface the failing field path in a toast). |
| 3 | Global `no-explicit-any: 'error'` | **Partially done.** Already `'error'` on critical paths (`useCardImport.ts`, `useCardExport.ts`, `migrations/**`, `sanitize.ts`, `persist-queue.ts`, `db-queries.ts`, `db-schema.ts`, `contexts/cards/**`). Globally `'warn'`. | **DECISION POINT** — see below. ~20 legitimate `any` sites still exist outside critical paths (e.g. `CardList.tsx:104` `useRef<any>` for `react-window`, `ForgettingCurve.tsx:45`, `workshop/WorkshopCardItem.tsx:41`, several test files). Flipping to `'error'` globally **will fail the lint/build** until each is fixed. |
| 4 | Delete duplicate filter hook | **Both are zombies.** Neither `useCardListFilters` nor `useCardViewFilters` is imported anywhere in the project. | **Delete both** (or pick one to keep as the canonical). Since neither has callers, the safe move is to delete both. Recommending we delete both. |

---

## Proposed actions

### A. `src/lib/migrations/backup-schema.ts` — append the requested guard

Append (no other changes — preserve the existing 438 lines):

```ts
/**
 * Strict type guard wrapper around `BackupSchema.safeParse`.
 *
 * The hook layer (`useCardImport`) already uses `safeParse` directly so it can
 * surface per-field error paths in a toast. This export exists for callers
 * that just need a boolean predicate (e.g. drag-and-drop dropzone, restore
 * preview, tests).
 */
export function isValidBackupPayload(data: unknown): data is ParsedBackup {
  return BackupSchema.safeParse(data).success;
}
```

### B. `src/hooks/useCardImport.ts` — leave as-is

It's already strongly typed. The brief's instruction "wrap in `isValidBackupPayload` and throw on failure" would be a **regression** — it loses the per-field error message currently shown in the toast (`"Backup nije validan: cards.3.sections.1.id — ..."`). I will only touch it if you explicitly want the simpler-but-worse error UX.

### C. `eslint.config.js` — DECISION REQUIRED

Two paths:

**C1 (safe, recommended) — Audit first, flip second.** Keep global `'warn'` until I run the lint, then fix each remaining `any` (≈20 sites — mostly `useRef<any>` for `react-window` and chart `point: any`), THEN flip global to `'error'` in a follow-up commit. This is a 30-min pure-fix pass.

**C2 (fast, breaks build) — Flip now.** Change `'warn'` → `'error'` immediately. Build will fail; we then chase down failures.

I recommend **C1**. Either way I will list every remaining site and propose typed replacements.

### D. Delete zombie filter hooks

Delete both:
- `src/hooks/useCardListFilters.ts`
- `src/hooks/useCardViewFilters.ts`

Confirmed via project-wide search — no imports of `useCardListFilters`, `useCardViewFilters`, `CardListFilters`, or `CardViewFilters` exist anywhere outside their own files. (The brief assumed one was used — neither is.)

---

## Decisions needed before I execute

1. **`isValidBackupPayload`** — add it as the additive helper described in (A)? *(Recommended: yes.)*
2. **`useCardImport.ts`** — leave as-is, or downgrade to the boolean wrapper as the brief literally requests? *(Recommended: leave as-is.)*
3. **eslint global `no-explicit-any`** — C1 (audit + fix + then flip) or C2 (flip now, break build)? *(Recommended: C1.)*
4. **Filter hooks** — delete both, or keep one as the canonical for future use? *(Recommended: delete both.)*

Once you answer, I'll execute the chosen subset in a single pass.
