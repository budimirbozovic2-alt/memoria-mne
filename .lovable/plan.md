

# Tier 3 Zombie File Audit — Results

## Methodology

Compared every file in `src/views/`, `src/components/`, and `src/lib/` against actual imports across the entire codebase. A file is classified as "zombie" only if **zero other files** import from it.

---

## Confirmed Zombies — Safe to Delete

### Components (0 confirmed zombies in src/components/)

All components are imported somewhere. Files that initially looked suspicious but are **actively used**:
- `AutoSplitDialog.tsx` — lazy-loaded by `SourceReader.tsx`
- `AutoLinkReviewModal.tsx` — imported by `SourceReader.tsx` (via `useSourceLogic` types)
- `LinkToExistingCardModal.tsx` — lazy-loaded by `SourceReader.tsx`
- `SourceSnippetDialog.tsx` — lazy-loaded by `CardList.tsx` and `StudyModeFree.tsx`
- `SourceDiffView.tsx` — **ZOMBIE CANDIDATE** — zero imports found

Wait — let me confirm `SourceDiffView`:

| File | Status | Reason |
|---|---|---|
| `src/components/SourceDiffView.tsx` | **ZOMBIE** | Zero imports across entire codebase |

### Views (0 zombies)

All 19 files in `src/views/` are routed in `App.tsx` or imported by `CategoriesRoutePage.tsx`. No orphans.

### Libraries (0 confirmed zombies)

All lib files are imported. `boot-trace.ts` is used by `main.tsx` and `useCardBootstrap.ts`.

### Public Files (2 zombies)

| File | Status | Reason |
|---|---|---|
| `public/test-import.html` | **ZOMBIE** | Dev-only test file, not referenced anywhere in src/ |
| `public/test-select.html` | **ZOMBIE** | Dev-only test file, not referenced anywhere in src/ |

---

## Summary — Files Safe to Delete

| # | File Path | Reason |
|---|---|---|
| 1 | `src/components/SourceDiffView.tsx` | Zero imports — orphaned after Source Reader refactor |
| 2 | `public/test-import.html` | Dev-only test harness, not referenced by any code |
| 3 | `public/test-select.html` | Dev-only test harness, not referenced by any code |

## Verdict

The codebase is remarkably clean. The v2.0 migration left only **1 component zombie** and **2 dev test files**. No dead views, no dead libs, no dead hooks. The previous refactoring phases were thorough.

### Recommended Action

Delete these 3 files in the next implementation step. Total bundle savings: minimal (SourceDiffView is tree-shaken since nothing imports it), but it eliminates confusion and reduces maintenance surface.

