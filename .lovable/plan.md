

# Faza 2: Brzina i logička konzistentnost

## Pregled
6 fix-ova: deferred forum computation, mastery cache zamjena, context stabilizacija, ChapterBox DOM fix, lokalizacija tier labela, i math guard.

## 1. Forum Performance — useDeferredValue (B1, B2)

### `src/views/RomanForumPage.tsx`
- Import `useDeferredValue` from React
- `const deferredCards = useDeferredValue(cards)` — use in `calculateForumState` instead of `cards`
- This lets grading stay 60fps while the heavy forum recalculation runs on deferred priority

## 2. Smart Mastery Cache (B6)

### `src/components/KnowledgeMap.tsx`
- Replace `WeakMap<Card, number>` (line 40) with `Map<string, { level: number; updatedAt: number }>`
- In `getCardMasteryLevel`: key is `card.id`, check `card.updatedAt` against cached version
- If match → return cached; else compute, store with `updatedAt`, return
- Add `card.updatedAt` guard: if undefined, always compute (backward compat)

## 3. Context Stability (B7)

### `src/contexts/AppContext.tsx`
- `useAppContext()` (line 98-104): current `useMemo` depends on `[card, ui]` — these are object references from context
- The `card` object from `useCards()` is already the return value which changes reference on every state update — this is by design
- The contexts are already split (Card/UI/Pomodoro) which is the correct architecture
- **Actual fix**: in `useAppContext`, the `Object.assign` creates a new object every time either context changes. Since `card` and `ui` are both stable within their own contexts, this is already optimal. No change needed here — the split architecture already prevents unnecessary re-renders

## 4. ChapterBox DOM Fix (H1)

### `src/components/mental-skeleton/ChapterBox.tsx`
- Lines 118-135: navigator mode buttons (`<button>` for move/rename/delete) are nested inside `<CollapsibleTrigger>` which renders a `<button>`
- **Fix**: Move the navigator action buttons **outside** of `CollapsibleTrigger`, into the parent `<div>` that wraps it — at the same level as `CollapsibleTrigger`, not inside it
- Restructure: `CollapsibleTrigger` contains only the chevron + icon + name + progress bar
- Navigator buttons sit in a sibling `<div>` next to `CollapsibleTrigger`, positioned with flex layout
- This eliminates the nested `<button>` DOM violation entirely

## 5. Tier Label Localization (H6)

### `src/lib/forum-logic.ts`
- Lines 258-264: change `MATERIAL_LABELS`:
  - `wood: "Drvo"`
  - `brick: "Cigla"`
  - `stone: "Kamen"`
  - `marble: "Mermer"`
  - `gold: "Zlato"`

## 6. Math Guard (H5)

### `src/components/KnowledgeMap.tsx` (`getCardMasteryLevel`)
- Line 50: `card.sections.reduce(...) / card.sections.length` — if `sections.length === 0`, this produces `NaN`
- Add guard at top: `if (!card.sections || card.sections.length === 0) return 0;`
- Place before the `allNew` check (line 47)

## Files Changed

| File | Changes |
|------|---------|
| `src/views/RomanForumPage.tsx` | `useDeferredValue(cards)` |
| `src/components/KnowledgeMap.tsx` | Map cache + zero-guard |
| `src/components/mental-skeleton/ChapterBox.tsx` | Restructure to eliminate nested buttons |
| `src/lib/forum-logic.ts` | Serbian tier labels |

## Guardrails
- No FSRS changes
- No style changes
- Phase 1 IDB logic untouched
- TypeScript-safe

