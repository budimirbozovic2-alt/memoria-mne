# Wiki-Link Knowledge Web — Auto-Create + Visual Distinction

Make `[[Wiki Links]]` first-class: typing one creates a placeholder, populated vs empty articles are visually distinct everywhere, and clicking a draft link opens it straight in Edit Mode.

## 1. Define "empty" centrally

In `ZettelkastenView.tsx`, derive a memoized set alongside `existingTitleSet`:

```ts
const emptyArticleIds = useMemo(
  () => new Set(articles.filter(a => a.content.trim().length === 0).map(a => a.id)),
  [articles],
);
const emptyTitleSet = useMemo(
  () => new Set(articles.filter(a => a.content.trim().length === 0)
                        .map(a => a.title.trim().toLowerCase())),
  [articles],
);
```

Pass `emptyTitleSet` down to `ZettelPreview` (next to `existingTitles`).

## 2. Three-state wiki-link rendering (Read Mode)

Update `ZettelPreview.tsx > inline()` to branch on three cases:

| State | Detection | Style |
|---|---|---|
| Populated | exists && !empty | `text-primary underline decoration-solid` (clear blue link) |
| Empty/draft | exists && empty | `text-muted-foreground italic underline decoration-dashed decoration-muted-foreground/60` |
| Missing | !exists | `text-amber-600 dark:text-amber-400 underline decoration-dotted` (existing behavior) |

Add `emptyTitles: Set<string>` prop; keep click handler unchanged — `handleWikiLink` already routes correctly.

## 3. Auto-create placeholders while typing (Edit Mode)

In `ZettelkastenView.tsx`, add a debounced scanner that runs whenever `draft.content` changes in edit mode:

```ts
useEffect(() => {
  if (!isEditing || !draft || !categoryId) return;
  const id = setTimeout(async () => {
    const titles = Array.from(draft.content.matchAll(/\[\[([^\]]+)\]\]/g))
      .map(m => m[1].trim()).filter(Boolean);
    const unique = Array.from(new Set(titles.map(t => t.toLowerCase())))
      .filter(low => !existingTitleSet.has(low));
    if (unique.length === 0) return;
    const created: KnowledgeBaseArticle[] = [];
    for (const low of unique) {
      const original = titles.find(t => t.toLowerCase() === low)!;
      // double-check via storage to avoid race with another article in same subject
      const dup = await findArticleByTitle(categoryId, original);
      if (dup) continue;
      const a = newArticle(categoryId, original, activeArticle?.rootSubcategoryId);
      await saveArticle(a);
      created.push(a);
    }
    if (created.length > 0) {
      setArticles(prev => [...created, ...prev]);
      toast.success(`Kreirano ${created.length} novih placeholder članaka`);
    }
  }, 800);
  return () => clearTimeout(id);
}, [draft?.content, isEditing, categoryId, existingTitleSet, activeArticle]);
```

Notes:
- 800 ms debounce avoids spam mid-typing.
- Created articles immediately appear in `existingTitleSet` (re-render), so the next pass skips them.
- They have `content: ""`, so they show up as drafts in the new styling.

## 4. Open empty articles in Edit Mode

In `handleWikiLink` and `handleOpen`, when navigating to an article whose `content.trim() === ""`, automatically enter Edit Mode:

```ts
const handleOpenArticle = useCallback((art: KnowledgeBaseArticle) => {
  setActiveId(art.id);
  setReadingSourceId(null);
  if (art.content.trim().length === 0) {
    setDraft({ title: art.title, content: art.content,
               linkedSourceIds: art.linkedSourceIds ?? [] });
    setIsEditing(true);
  } else {
    setIsEditing(false);
    setDraft(null);
  }
}, []);
```

Update `handleWikiLink` to use it (after fetching/creating the article), and switch sidebar list `onClick={() => handleOpen(a.id)}` to `handleOpenArticle(a)`.

## 5. Sidebar list visual distinction

In the article list (lines ~474-497), add a draft indicator:

```tsx
const isDraft = a.content.trim().length === 0;
// title color
className={`font-semibold text-sm truncate ${
  isDraft ? "text-muted-foreground italic" : "text-foreground"
}`}
// add a small "Draft" pill next to the subcategory chip when isDraft
{isDraft && (
  <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400
                   border border-amber-500/40 px-1.5 py-0.5 rounded shrink-0">
    Draft
  </span>
)}
```

Preview text already hides when empty (`preview` is empty string), so no change needed there.

## 6. Memory update

Append to `mem://features/zettelkasten-notion-ux`: "Wiki-links auto-create placeholders on 800 ms debounce while editing. Three link states: populated (primary solid), draft (muted dashed), missing (amber dotted). Opening a draft article auto-enters Edit Mode."

## Files touched

- `src/views/ZettelkastenView.tsx` — derive empty sets, debounced auto-create effect, `handleOpenArticle`, sidebar styling.
- `src/components/zettelkasten/ZettelPreview.tsx` — new `emptyTitles` prop, three-state link styling.
- `mem://features/zettelkasten-notion-ux` — document the new behavior.

No changes to storage (`zettelkasten-storage.ts` already exposes `findArticleByTitle` + `newArticle`) or to the editor component.
