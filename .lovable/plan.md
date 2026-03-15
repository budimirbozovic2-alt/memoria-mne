

## Plan: Update Learn Mode Sort Options

### Changes to `src/components/LearnSession.tsx`

1. **Rename "Najslabija prvo"** → "Pitanja sa najslabijim rezultatima" (keep same `weakest` sort logic)

2. **Replace "Najjača prvo"** with new option **"Pitanja sa najmanje pregleda"**:
   - Key: `leastRead` (instead of `strongest`)
   - Sort by `card.readCount` ascending (0 first, then 1, 2, etc.)
   - Cards never read appear first, then least-read cards
   - Icon: `Eye` (instead of `TrendingUp`)

3. **Update `SortMode` type**: `"order" | "weakest" | "leastRead"`

4. **Update sort logic** in `sortedCards` useMemo:
   - `leastRead`: `filtered.sort((a, b) => (a.readCount || 0) - (b.readCount || 0))`

