## Goal

Reorganize the cluttered top of the **Source Reader / Editor** page (`SourceReader.tsx` + `SourceToolbar.tsx`) and **completely remove the "Pokrivenost" (Coverage) feature**.

The current single-row toolbar crams 9 controls + title onto one line: Back · Title · Auto-Split · [Čitanje | Pokrivenost] · [S/M/L/XL/Full] · Uredi · Članovi · Pitanja · Sadržaj. Result: cramped, visually noisy.

---

## Changes

### 1. `src/components/source-reader/SourceToolbar.tsx` — split into two rows, remove Coverage toggle

- **Remove** the `[Čitanje | Pokrivenost]` segmented switch entirely (and `BarChart3`, `Eye` icon imports, `viewMode`/`setViewMode`/`isCoverage` reads).
- **Reorganize into two rows** with `space-y-2`:
  - **Row 1 — Identity** (single visual line): `← Back` · `<SourceHeader>` (title + meta, flex-1) · `Sadržaj` toggle pinned to the right.
  - **Row 2 — Tools** (action bar):
    - Left group: `Uredi` (primary action) → contextual edit-mode tools next to it (`Auto-Split` when reading propis, `Članovi` when editing propis).
    - `ml-auto` spacer.
    - Right group: `Pitanja` button (with badge), then the compact `[S M L XL Full]` width selector.
- Keep all existing functionality (edit, exam sidebar, outline, width, auto-split, auto-format) — only Coverage is removed.

### 2. `src/components/SourceReader.tsx` — drop Coverage rendering

- Remove imports: `CoverageArticleList`, `CoverageStatsBar`.
- Remove `viewMode`/`isCoverage` reads from the store.
- Remove the `{isCoverage && <CoverageStatsBar … />}` block.
- Replace the `{isCoverage ? <CoverageArticleList … /> : <SourceContent … />}` ternary with just `<SourceContent … />`.
- Simplify `{!isCoverage && selection && <SourceTooltip … />}` to `{selection && <SourceTooltip … />}`.

### 3. `src/hooks/useSourceReaderActions.ts` — drop coverage derivations

- Remove `import { analyzeCoverage } …`.
- Remove the `coverage` `useMemo` block (lines ~27–30).
- Remove `handleOpenCoveredCard` (~line 415) and its export from `actions`.
- Remove `coverage` from the returned `derived` object.
- Keep the `[data-coverage-container]` selector fallback in `handleMouseUp` removed (selection container now relies solely on `contentRef.current`).

### 4. `src/store/useSourceReaderStore.ts` — drop viewMode field

- Remove `viewMode` field, `setViewMode` action, and the `"standard" | "coverage"` type union.
- Remove `viewMode: "standard"` initial value.

### 5. Delete dead files

- `src/components/source-reader/CoverageArticleList.tsx` — delete.
- `src/components/source-reader/CoverageStatsBar.tsx` — delete.
- Verify nothing else imports `@/lib/coverage-analysis`; if it's only consumed by the removed hook code, leave the lib file in place (no harm — it's tree-shaken) and skip touching it. **Will verify with `rg` after edits and report.**

---

## Visual result

```text
Before (1 row, 9+ controls):
[←] Title · meta · v1   [Auto-Split] [Čitanje|Pokrivenost] [S M L XL Full] [Uredi] [Pitanja] [Sadržaj]

After (2 rows, breathing room):
Row 1:  [←]  Title · meta · v1                                                         [Sadržaj]
Row 2:  [Uredi] [Auto-Split / Članovi]                          [Pitanja]  [S M L XL Full]
```

---

## Out of scope

- No changes to the content area, selection tooltip, exam sidebar, navigation outline, dialogs, or any business logic.
- `coverage-analysis.ts` library file kept in place (tree-shaken) unless `rg` confirms zero remaining importers, in which case it can be deleted in a follow-up.
