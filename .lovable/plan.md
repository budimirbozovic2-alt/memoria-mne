

# STEP 1: Codebase Pruning — Kanban Elimination & Dead Code Cleanup

## Summary

Remove the Kanban Board feature entirely, clean up KnowledgeMap.tsx to render only MentalSkeleton, remove unused npm packages, and clean up a Kanban reference in onboarding text.

---

## Deletion Plan

### A. File Deletion
| File | Reason |
|------|--------|
| `src/components/KanbanBoard.tsx` | Entire Kanban module (263 lines) — no other consumers |

### B. KnowledgeMap.tsx Cleanup (lines to modify)
1. **Remove imports**: Delete `lazy` import of `KanbanBoard` (line 19), remove `Columns3 as Kanban` and `List` from lucide imports (line 16), remove `TabSkeleton` import (line 15) if no longer needed after simplification
2. **Remove state**: Delete `detailMode` state (line 78)
3. **Remove toggle UI**: Delete the entire view-mode toggle block (lines 120-141) — the `<div className="flex justify-end">` with skeleton/kanban buttons
4. **Simplify detail rendering**: Replace the conditional `detailMode === "skeleton" ? ... : <KanbanBoard ...>` block (lines 143-162) with unconditional `<MentalSkeleton>` render inside `<Suspense>`
5. **Keep**: `TabSkeleton` import stays (still used as Suspense fallback)

### C. AppOnboarding.tsx Text Cleanup
- Line 68: Remove the bullet `"Kanban — kolone po glavama ili mastery nivou sa drag-and-drop"` from the knowledge map feature description

### D. Package.json — Remove Unused Dependencies
| Package | Reason |
|---------|--------|
| `@dnd-kit/sortable` | Zero imports anywhere in codebase |
| `@dnd-kit/utilities` | Zero imports anywhere in codebase |

**Keep**: `@dnd-kit/core` — actively used by MentalSkeleton

### E. Schema Audit Result
- `chapterOrder` field on Card: **KEEP** — used extensively by MentalSkeleton and CardsView for drag-and-drop ordering
- No Kanban-exclusive DB fields exist. No migration needed.

---

## Guardrails Checklist
- MentalSkeleton dnd-kit logic: untouched
- FSRS/SM-2: untouched
- Boot timers: untouched
- Electron/Vite config: untouched
- Layout logic: untouched
- Icon deep imports: maintained
- Map node snapping: untouched
- Consolidation terminology: untouched
- Info corner & shortcuts: untouched

---

## Execution Order (one point per response)
1. Delete `KanbanBoard.tsx`
2. Clean up `KnowledgeMap.tsx` (remove Kanban state, imports, toggle, conditional render)
3. Clean up `AppOnboarding.tsx` (remove Kanban bullet)
4. Remove `@dnd-kit/sortable` and `@dnd-kit/utilities` from `package.json`

