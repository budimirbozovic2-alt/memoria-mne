

# Phase 5.1: Targeted Eradication of Legacy Card Logic

## Findings Summary

### TASK 1: String-Based Fallbacks Still Active

| Location | Problem |
|---|---|
| `src/hooks/useCardActions.ts:106` | `categories[0] ?? "Opšte"` — falls back to name string |
| `src/components/DocxImporter.tsx:47` | `categories[0] ?? "Opšte"` — same pattern |
| `src/hooks/useCategoryManagement.ts:87,107` | `deleteCategory` reassigns orphaned cards to `"Opšte"` string instead of a real UUID |
| `src/hooks/useCards.ts:28` | Initial state `["Opšte"]` — harmless but misleading |

### TASK 2: Legacy localStorage Registries Still Active

| Key | Location | Status |
|---|---|---|
| `codex-monument-types` | `src/lib/forum-logic.ts:22-41` | **ACTIVE** — read/write monument building types in localStorage |
| `codex-nav-category` / `codex-nav-subcategory` | `src/components/KnowledgeMap.tsx:76-101` | **ACTIVE** — persists navigation state for Knowledge Map drill-down |
| `codex-source-registry` | `src/lib/db.ts:250` | Already cleaned (only removal code remains) |

**Decision needed on `codex-monument-types`**: This is the Forum's building type assignment (amphitheatrum, basilica, etc.). It's actively used by the Forum feature. Moving it to Dexie requires a new table or column. For now, it's a **legitimate localStorage use** (small config data, not relational). Same for `codex-nav-*` (UI navigation state, not data).

### TASK 3: Orphaned Functions

No orphaned hooks found that were exclusive to `CardsView`/`SourcesView` — those views used shared context hooks. The CRUD was already refactored into `useCardCRUD`.

---

## Plan

### Fix 1: `useCardActions.ts` — Remove `"Opšte"` fallback
Line 106: `categories[0] ?? "Opšte"` → `editCard?.categoryId ?? categories[0] ?? ""`
This hook is used inside `CardForm` which is now only invoked from category-scoped views where `categories[0]` is already a UUID. The `"Opšte"` fallback is dead code since categories are now UUIDs.

### Fix 2: `DocxImporter.tsx` — Remove `"Opšte"` fallback + scope by UUID
Line 47: `categories[0] ?? "Opšte"` → `categories[0] ?? ""`
The `DocxImporter` receives `categories` from `MainLayout` which passes `useCardContext().categories` (now UUID strings). The `"Opšte"` fallback is impossible but dangerous.

### Fix 3: `useCategoryManagement.ts` — Fix `deleteCategory` reassignment
Lines 86-87, 107: When deleting a category, orphaned cards/sources are reassigned to `"Opšte"` (a name string). This must use the **first available category UUID** from `categoryRecords`, or leave cards unassigned. 

**Change**: Pass `categoryRecordsRef` into the hook. On delete, find the first remaining category UUID and reassign orphans there. If no categories remain, use empty string (which effectively hides the cards).

### Fix 4: `useCards.ts` — Clean initial state
Line 28: `useState<string[]>(["Opšte"])` → `useState<string[]>([])` — boot will populate this immediately.

### TASK 2 Decision: Keep `codex-monument-types` and `codex-nav-*`
These are **UI preference storage**, not relational data. They don't create categories or cards. Migrating them to Dexie adds complexity for no integrity benefit. Mark as "reviewed and intentionally retained."

---

## File Changes

| File | Change |
|---|---|
| `src/hooks/useCardActions.ts` | Line 106: remove `"Opšte"` fallback |
| `src/components/DocxImporter.tsx` | Line 47: remove `"Opšte"` fallback |
| `src/hooks/useCategoryManagement.ts` | `deleteCategory`: accept `categoryRecords`, reassign orphans to first remaining UUID |
| `src/hooks/useCards.ts` | Line 28: initial categories `[]` instead of `["Opšte"]`; pass `categoryRecords` to `useCategoryManagement` |

