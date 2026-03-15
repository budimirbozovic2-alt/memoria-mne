

## Plan: Tag System for Essay Cards

### Data Model Change — `src/lib/spaced-repetition.ts`
Add `tags` field to `Card` interface:
```typescript
tags?: string[];  // e.g. ["često-na-ispitu", "rijetko-na-ispitu"]
```

### Storage Migration — `src/lib/storage.ts`
Ensure `loadCards` initializes `tags: []` for existing cards without it.

### Hook — `src/hooks/useCards.ts`
Add `toggleTag(cardId: string, tag: string)` function that adds/removes a tag from a card.

### UI — `src/components/CardList.tsx`
- Replace the Scissors button with a Tag button (using `Tag` icon from lucide-react)
- On click, show a small popover/dropdown with two toggle options:
  - "Često dolazi na ispitu" 
  - "Rijetko dolazi na ispitu"
- These are mutually exclusive (selecting one removes the other)
- Display active tags as small colored badges next to the card metadata (category, score, etc.)
- Show tag button for essay cards only (replacing the split button which is already in the edit form)

### Props Threading — `src/pages/Index.tsx`
- Pass `toggleTag` to `CardList` instead of `onSplit`
- Update CardList props interface accordingly

### Filter Enhancement (optional, included)
- Add tag filter buttons in the cards view alongside type/category filters

