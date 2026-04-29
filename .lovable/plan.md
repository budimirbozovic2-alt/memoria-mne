# Quick row actions: Uredi + Pasivno čitanje for a specific card

Add inline icon buttons to each card row in the **Pregled** tab so the user can:

1. **Uredi** — jump straight into the editor for that card.
2. **Pasivno čitanje** — switch to the Učenje → Pasivno čitanje tab with the reader already pointing at that card (filters auto-cleared so the card is guaranteed visible).

Both actions are reachable without expanding the row.

## File-by-file changes

### `src/components/category/CardViewTable.tsx`

- Add prop `onPassiveRead?: (card: Card) => void` (sibling to `onEdit`).
- Import `BookOpen` icon (already imported).
- In the collapsed row header (the flex row with the chevron + question), insert a small action cluster on the right BEFORE the existing badges/state chips:
  ```tsx
  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
    {onEdit && (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(card)} title="Uredi">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )}
    {onPassiveRead && (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPassiveRead(card)} title="Pasivno čitanje">
        <BookOpen className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
  ```
  - Wrapped in `onClick={stopPropagation}` so clicking a button doesn't toggle expand.
  - Hidden when `selectionMode` is true to avoid accidental clicks during bulk select.

### `src/components/category/CardViewMode.tsx`

- Add prop `onPassiveRead?: (card: Card) => void`.
- Forward to `<CardViewTable onPassiveRead={onPassiveRead} ... />`.

### `src/components/subject-cards/PassiveReader.tsx`

- Add prop `initialCardId?: string | null` and `onInitialConsumed?: () => void`.
- New effect: when `initialCardId` changes to a non-null value, attempt to find the card in the unfiltered `cards` array.
  - If found and it's not already in `filtered`, **clear filters first** (`setSubFilter("all")`, `setChapterFilter("all")`).
  - Then in another effect (or same after a microtask) locate the index in the freshly recomputed `filtered` list and `setIndex(idx)`.
  - Call `onInitialConsumed?.()` so the parent can null out the request and avoid replays.
- Implementation detail: track via `useRef<string | null>` to compare against `current?.id` and avoid loops. Use `useEffect` keyed on `[initialCardId, filtered]`: when ref differs from `initialCardId`, clear filters or set index appropriately, then mark consumed.

### `src/views/SubjectCardsView.tsx`

- Add state `const [pendingPassiveCardId, setPendingPassiveCardId] = useState<string | null>(null);`.
- Add handler:
  ```ts
  const handlePassiveRead = (card: Card) => {
    setPendingPassiveCardId(card.id);
    setTab("read");
  };
  ```
- Pass `onPassiveRead={handlePassiveRead}` to `<CardViewMode>`.
- Pass `initialCardId={pendingPassiveCardId}` and `onInitialConsumed={() => setPendingPassiveCardId(null)}` to `<PassiveReader>`.

## UX details

- Buttons use `variant="ghost"` + `size="icon"` (h-7 w-7) so they sit cleanly inside the existing row without bloating it.
- `title` attributes give native tooltips; we keep the icon-only treatment to match the row's compact style.
- `stopPropagation` ensures the row's expand-toggle button (the wrapping `<button>`) is not triggered.
- When user lands in PassiveReader via this shortcut, we explicitly **reset filters to "all"** so the card cannot be hidden by a stale persisted filter. The persistence layer continues to save subsequent manual changes.
- No new memory entry needed; this is a UX polish that fits within the documented `subject-cards-hub-v2` feature.

## Verification checklist

1. In Pregled, each card row shows Pencil + BookOpen icon buttons on the right.
2. Clicking Pencil → goes to `/edit` with that card loaded (existing flow).
3. Clicking BookOpen → tab switches to **Pasivno čitanje**, filters reset to "all", card is the active one.
4. Clicking either button does NOT expand the row.
5. In selection mode the buttons are hidden.

## Files touched

- `src/components/category/CardViewTable.tsx`
- `src/components/category/CardViewMode.tsx`
- `src/components/subject-cards/PassiveReader.tsx`
- `src/views/SubjectCardsView.tsx`
