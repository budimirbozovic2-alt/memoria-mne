

# Fix: Phantom subcategories with UUID names

## Root Cause
In `src/hooks/useCardBootstrap.ts`, the orphan-detection loop (lines 169-184) checks if a card's `subcategoryId` matches any node's **name** instead of its **id**. Since cards store UUIDs, the match always fails, causing a phantom `SubcategoryNode` to be created with the UUID string as its display name. Same bug for chapters.

## Fix (1 file, 4 line changes)

**File: `src/hooks/useCardBootstrap.ts`**

1. **Line 173**: Change `nodes.find((n) => n.name === sub)` to `nodes.find((n) => n.id === sub)`
2. **Line 180**: Change `node.chapters.some(c => c.name === ch)` to `node.chapters.some(c => c.id === ch)`

## Cleanup: Remove existing phantoms

After the fix, existing phantom entries are already persisted in IDB. Add a one-time cleanup pass right after the orphan scan loop (before `needsPersist` check) that removes any `SubcategoryNode` where:
- `name` looks like a UUID (regex: `/^[0-9a-f]{8}-/`)
- it has zero cards assigned to it (no card has `subcategoryId === node.id`)

Same for chapters within each node.

## Risk
- Very low — only changes the comparison field from `name` to `id`
- Cleanup only removes nodes with UUID-shaped names and zero cards

