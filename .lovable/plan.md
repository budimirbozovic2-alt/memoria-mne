

# Source Registry UI Enhancement

## Overview
Add "Unmapped Sources" section, improve category override UX, and ensure Forum cache invalidation on every registry save.

## 1. Unmapped Sources Section (`SourceManager.tsx`)

**New computed list**: Sources in `db.sources` whose `label` is NOT present in any `registry.aliases[].rawLabel` AND is not itself a `masterSource` target. These are "unrecognized" sources.

**UI**: New section between stats and the existing "Izvori" list:
- Header: "Neprepoznati izvori" with warning icon and count badge
- Each unmapped source shows label + card count + two action buttons:
  - "Kreiraj Master" — creates a new master source (alias pointing rawLabel → itself, essentially a no-op but marks it as "recognized")
  - "Dodaj u postojeći" — opens a small dropdown/dialog listing existing master sources to pick from, then creates an alias `rawLabel → selectedMaster`

**Logic**: 
- `unmappedLabels = allRawLabels.filter(l => !aliasMap.has(l.label) && !uniqueSources.some(u => u.masterSource === l.label && u.rawLabels.length > 1))`
- Actually simpler: unmapped = labels where `aliasMap.get(label)` is undefined (the label has no explicit alias entry). The current list already shows all labels — we just split it into "mapped" and "unmapped" tabs/sections.

## 2. Category Override Enhancement (`SourceManager.tsx`)

Replace the cryptic toggle button with a clearer UI:
- Label: "Prikaži ovaj izvor unutar spomenika: [Kategorija]"
- Replace the A/B toggle with a more descriptive label showing what each mode means for that specific category
- Add subtitle explaining the current state: "Automatski: Mod B (1 izvor)" or "Ručno: Mod A"

## 3. Forum Cache Invalidation (`SourceManager.tsx`)

In `persistRegistry()`, call `invalidateSourceRegistryCache()` after `saveSourceRegistry()`. Currently `saveSourceRegistry` updates the cache to the new value, but if Forum reads via `loadSourceRegistry()` it gets the cached version correctly. However, to be safe and trigger React re-reads, we should also dispatch a storage event or use the existing `_notify` pattern.

**Actual fix**: The `saveSourceRegistry` already sets `_registryCache = registry`, so Forum will get fresh data on next `loadSourceRegistry()` call. The real issue is Forum doesn't re-render because it has no subscription. We add an event emitter pattern (like `onSourcesChanged`) to source-registry.ts:
- `onRegistryChanged(fn)` / `_notifyRegistry()`
- `saveSourceRegistry` calls `_notifyRegistry()`
- `RomanForumPage` subscribes via `useEffect`

## Files Changed

| File | Change |
|------|--------|
| `src/lib/source-registry.ts` | Add `onRegistryChanged` event emitter, call it from `saveSourceRegistry` |
| `src/components/SourceManager.tsx` | Add unmapped sources section, "assign to master" dialog, improved category override labels |

## Technical Details

### source-registry.ts additions (~15 lines)
- Add `_registryListeners` Set, `onRegistryChanged(fn)`, and `_notifyRegistry()` — same pattern as `sources-storage.ts`
- Call `_notifyRegistry()` at end of `saveSourceRegistry()`

### SourceManager.tsx changes (~80 lines net)
- New `unmappedLabels` memo: filters `allRawLabels` to those without an alias entry
- New `mappedLabels` memo: the rest
- Split the source list into two sections: "Neprepoznati izvori" (unmapped, with yellow accent) and "Prepoznati izvori" (mapped)
- Each unmapped item gets: "Kreiraj Master" button (creates alias rawLabel→rawLabel) and "Dodaj kao alias" button (opens merge dialog pre-filled)
- Category override section: replace toggle button text with "L1: Izvor → L2: Potkategorija" / "L1: Potkategorija → L2: Glava" descriptive labels

### RomanForumPage.tsx (~3 lines)
- Subscribe to `onRegistryChanged` in existing `useEffect` to trigger re-render when registry changes

