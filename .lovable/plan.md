## Audit Status — What's Already Done

Inspecting the current code shows three of the four requested fixes are **already in place** from prior turns:

| # | Fix | Status | Location |
|---|---|---|---|
| 1 | `findArticleByTitle` uses `[subjectId+title]` compound index, falls back to `.where().filter().first()` | ✅ Already done | `src/lib/zettelkasten-storage.ts` lines 17–39 |
| 2 | Wiki-link batch via `db.transaction("rw", ...)` + `bulkPut`, single dedup pass | ✅ Already done | `src/lib/zettelkasten-storage.ts` lines 57–96 (`bulkCreateArticlesIfMissing`) |
| 3a | Gate `existingTitleSet` / `emptyTitleSet` behind `!isEditing` | ⚠️ Not yet — implement now |
| 3b | `BacklinksPanel` deferred/frozen during edit | ✅ Already done | `BacklinksPanel.tsx` — uses `useDeferredValue` + `cacheRef` freeze when `isEditing` |

So the **only remaining work is item 3a**.

## Subtlety With Item 3a

The wiki-link auto-create effect (`ZettelkastenView.tsx` lines ~177–255) currently reads `existingTitleSet` to decide which `[[link]]` candidates need to be created. That effect runs **only while editing** — exactly the case where the request asks the memo to be empty. A naive gate would break the effect (every wiki-link would look "missing" and a placeholder would be re-created on every keystroke).

Note: the audit's framing ("rebuild on every keystroke") is technically inaccurate against today's code — `articles` state identity does NOT change on keystrokes (only on save / auto-create / delete), so the `useMemo`s already do not rebuild during typing. The gate still has a real benefit: it skips the work entirely on the *first* render after entering edit mode and on every `articles` mutation that happens during edit (e.g. after a placeholder batch lands).

## Plan for Item 3a

File: **`src/views/ZettelkastenView.tsx`**

1. Gate both memos behind `isEditing`:
   ```tsx
   const existingTitleSet = useMemo(
     () => isEditing
       ? new Set<string>()
       : new Set(articles.map(a => a.title.trim().toLowerCase())),
     [articles, isEditing],
   );
   const emptyTitleSet = useMemo(
     () => isEditing
       ? new Set<string>()
       : new Set(
           articles
             .filter(a => a.content.trim().length === 0)
             .map(a => a.title.trim().toLowerCase()),
         ),
     [articles, isEditing],
   );
   ```
   Both sets feed only `<ZettelPreview ... />`, which is unmounted during edit (the editor is shown instead), so an empty set is harmless.

2. Add a ref-based always-current lookup for the wiki-link effect so it doesn't depend on the now-gated memo:
   ```tsx
   const existingTitlesLowerRef = useRef<Set<string>>(new Set());
   useEffect(() => {
     existingTitlesLowerRef.current = new Set(
       articles.map(a => a.title.trim().toLowerCase()),
     );
   }, [articles]);
   ```

3. Update the wiki-link effect:
   - Replace `existingTitleSet.has(...)` with `existingTitlesLowerRef.current.has(...)`.
   - Remove `existingTitleSet` from its dependency array; add nothing (refs are stable).
   - Keep all other behavior (adaptive debounce, 50-cap with deduped warn toast, transaction batching) untouched.

4. No other call sites change (ripgrep confirmed both sets are consumed only by `<ZettelPreview>` props on lines 458–459 and the wiki-link effect).

## Verification

- Editor mount/unmount: switching to edit mode produces empty sets without recomputing the full set; switching back rebuilds them once.
- Wiki-link auto-create still suppresses duplicates correctly during edit (uses ref).
- Existing test `src/test/zettelkasten-bulk-create.test.ts` continues to pass (no production logic for batch creation changed).
