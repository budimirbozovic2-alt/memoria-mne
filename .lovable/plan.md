

## Plan: "Informacije o predmetu" — Examiner Profile

Wire-up the Info meta-button to open a modal where the user picks examiner difficulty and preferred answer type for the current subject. Persist on the existing `categories` table as a new optional `examinerProfile` field.

### 1. Schema — `src/lib/db-schema.ts`

Extend `CategoryRecord`:
```ts
export type ExaminerDifficulty = "tezak" | "lak";
export type PreferredAnswerType = "esej" | "definicija" | "potpitanja";

export interface ExaminerProfile {
  difficulty?: ExaminerDifficulty;
  preferredAnswerType?: PreferredAnswerType;
  notes?: string;       // free-form, optional
  updatedAt?: number;
}

export interface CategoryRecord {
  // ...postojeća polja
  examinerProfile?: ExaminerProfile;
}
```

Bump Dexie to **v13** as a no-op marker (no new index — `examinerProfile` is an embedded object, not queried):
```ts
this.version(13).stores({
  categories: "id, name, sortOrder",   // no schema change, marker only
});
```
Existing data stays intact (Dexie tolerates new optional fields without migration).

### 2. Persistence action — `src/hooks/useCategoryManagement.ts`

Add a new orchestrated action:
```ts
const updateExaminerProfile = useCallback(
  (categoryId: string, profile: ExaminerProfile) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r =>
        r.id === categoryId
          ? { ...r, examinerProfile: { ...profile, updatedAt: Date.now() } }
          : r
      ),
      "updateExaminerProfile"
    );
  },
  [setCategoryRecords],
);
```
Export it from the hook and propagate through `useCards.ts` → `AppContext` (categoryActions Proxy already forwards declared keys; we add `updateExaminerProfile` to the surface).

### 3. New modal — `src/components/ExaminerProfileDialog.tsx`

A `Dialog` (shadcn) component:
- Props: `open`, `onOpenChange`, `categoryId`, `categoryName`, `initialProfile`, `onSave(profile)`
- Body:
  - **Težina ispitivača** — `Select`: "Težak" / "Lak" / "Nije označeno" (clear)
  - **Preferirani tip odgovora** — `Select`: "Esej" / "Definicija" / "Potpitanja" / "Nije označeno"
  - **Napomena** (optional) — `Textarea`, kratak slobodan tekst (do 500 char)
- Footer: `Otkaži` + `Sačuvaj` button
- On save: calls `onSave({ difficulty, preferredAnswerType, notes })`, toast "Profil sačuvan", closes modal.

Sanitization: notes pass through `sanitizeText` (existing util) before save.

### 4. Wire-up in `src/views/SubjectDashboard.tsx`

- Replace the static "Informacije o predmetu" link with a button that opens local state `infoOpen`.
- Read `categoryRec.examinerProfile` as `initialProfile`.
- On save, call `categoryActions.updateExaminerProfile(categoryId, profile)`.
- Keep BarChart3 → `/stats` and Settings → `/settings?...` as `<Link>`s as today.

Refactored meta-tools row will mix `<Link>` (Stats, Settings) and `<button>` (Info opens modal).

### Files

| File | Action |
|------|--------|
| `src/lib/db-schema.ts` | +ExaminerProfile types, +`examinerProfile?` on CategoryRecord, +v13 marker (~15 lines) |
| `src/hooks/useCategoryManagement.ts` | +`updateExaminerProfile` action, exported (~12 lines) |
| `src/hooks/useCards.ts` | Forward new action from `useCategoryManagement` (~2 lines) |
| `src/contexts/AppContext.tsx` | Expose `updateExaminerProfile` on category actions (~2 lines) |
| `src/components/ExaminerProfileDialog.tsx` | **NEW** — modal with 2 selects + textarea (~110 lines) |
| `src/views/SubjectDashboard.tsx` | Wire Info button to open modal, pass categoryRec.examinerProfile (~25 lines) |

**6 fajlova, ~165 linija. Postojeći podaci ostaju netaknuti — `examinerProfile` je opcionalno polje. Bez novih indeksa.**

