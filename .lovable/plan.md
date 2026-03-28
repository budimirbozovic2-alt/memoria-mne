

# Filter Auto-Link to Essay Cards Only

## Change

One line added in `src/lib/auto-link-suggestion.ts` — skip flash cards in the main loop.

### `src/lib/auto-link-suggestion.ts` — Line 53 area (inside the `for (const card of cards)` loop)

Add a type check right after the existing `sourceId` skip:

```ts
// Skip cards already linked
if (card.sourceId) continue;
if (seen.has(card.id)) continue;
if (card.type === "flash") continue;  // ← NEW: only essay cards
```

No other files need changes.

