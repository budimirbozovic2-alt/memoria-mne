# Persist PassiveReader filters per subject

Save the user's last selected **Potkategorija** and **Glava** filters in `PassiveReader.tsx` so returning to the page restores them automatically. Scope storage per `categoryId` so each subject keeps its own state.

## Storage strategy

Use `localStorage` under the key `passive-reader-filters:<categoryId>` holding `{ subFilter, chapterFilter }`. Per-category scoping prevents one subject's stale subcategory ID from polluting another.

## Implementation in `src/components/subject-cards/PassiveReader.tsx`

1. **Helper at module scope** — `loadPersistedFilters(categoryId)` that safely reads + JSON-parses, returning `{ subFilter: "all", chapterFilter: "all" }` on any failure (missing key, parse error, SSR).

2. **Lazy state init** — replace:
   ```ts
   const [subFilter, setSubFilter] = useState<string>("all");
   const [chapterFilter, setChapterFilter] = useState<string>("all");
   ```
   with `useState(() => loadPersistedFilters(categoryId).subFilter)` etc., so the very first render already shows the restored selection (no flash of "Sve potkategorije").

3. **Validation effect** — after `subcategoryNodes` is available, drop any persisted ID that no longer exists in the current taxonomy (the user may have deleted or renamed a subcategory/chapter since the last visit). Falls back to `"all"`.

4. **Persist effect** — `useEffect` writes the current `{ subFilter, chapterFilter }` to localStorage whenever either value or `categoryId` changes. Wrapped in try/catch to tolerate quota / privacy mode.

5. **No change to existing behavior**:
   - Filter-change → index reset (existing effect) still runs.
   - Switching subcategory still clears the chapter filter (existing `onValueChange`).
   - Side-panel state, FSRS chips, navigation — untouched.

## Edge cases handled

- **Stale IDs**: validation effect coerces invalid persisted IDs to `"all"`.
- **Missing `categoryId`**: persist effect early-returns; loader returns defaults.
- **Storage unavailable** (Electron renderer with disabled storage, quota exceeded): try/catch silences errors; defaults are used.
- **Cross-subject leakage**: keys namespaced by `categoryId`.

## Files touched

- `src/components/subject-cards/PassiveReader.tsx` — add helper, lazy init, validation effect, persistence effect.

No new dependencies, no migration, no schema changes. Memory entry doesn't need updating (this is a small UX polish within an existing documented feature).
