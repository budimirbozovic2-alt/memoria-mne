## Goal

Refactor `ZettelkastenView` from a permanent split-screen editor/preview into a Notion/Obsidian-style single-pane reader with an explicit edit toggle. Persist on exit (not on every keystroke). Add an optional side-panel for reading a linked Source while writing, and let articles embed mind-map references that render inline in read mode.

---

### 1. Read/Edit toggle (`isEditing`)

New local state in `ZettelkastenView` for the active article view:

- `const [isEditing, setIsEditing] = useState(false);`
- `const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);`

Behavior:

- **Read mode (default)**: show only `<ZettelPreview>` of the persisted `activeArticle.content`. Top-right action: "✏️ Uredi".
- **Edit mode**: show only `<ZettelEditor>` bound to `draft`. Top-right action becomes "✓ Sačuvaj i zatvori". Title becomes an editable `<Input>` only in edit mode (read mode shows it as a static H1).
- Entering edit mode primes `draft` from the active article. Toggling back commits `draft` (see #2).

`<BacklinksPanel>` remains visible in both modes (small footer/sidebar). `<LinkedSourcesPicker>` is only rendered in edit mode; in read mode the linked sources are shown as read-only chips at the top.

### 2. Save-on-exit persistence

Replace the current keystroke-debounced `handleUpdate` flow:

- `<ZettelEditor>` already keeps internal `local` state. Remove its 400 ms upward debounce and instead expose an imperative-style flush via the existing `onChange` prop, but only call it on save. Concretely: change the editor so its `useEffect` for debounced `onChange(local)` is gone — parent reads value via the `onChange` callback fired from the editor's internal "blur" / save trigger. To keep the change minimal, parent will store the editor draft in `draft.content` via `onChange={(c) => setDraft(d => ({ ...d!, content: c }))}` but the editor will fire `onChange` only on `onBlur` of the textarea AND when explicitly told (we'll lift draft state into the parent and pass `value` + onChange that just updates parent draft synchronously — no DB write).
- `commitDraft()` (called when user clicks "Sačuvaj i zatvori", or on `useEffect` cleanup when the active article changes / view unmounts) does a single `saveArticle({...activeArticle, ...draft, updatedAt: Date.now()})` and updates the `articles` state.
- Linked-source edits and mind-map embeds are also written through `draft` and committed at the same time.

A `useEffect` cleanup on the editor branch flushes a pending `draft` if the user navigates away without explicitly saving (e.g., clicks "Nazad na listu", switches articles, or unmounts).

We will keep `handleCreate` writing immediately (so a new article exists in IDB) but it will open straight into edit mode with an empty draft.

### 3. Parallel Source-reading side panel (both modes)

New state: `const [readingSourceId, setReadingSourceId] = useState<string | null>(null);`

- Toolbar button "📖 Otvori izvor" with a dropdown of `activeArticle.linkedSourceIds` (resolved against `sources`). Selecting an entry sets `readingSourceId`. A close ✕ unsets it. Available in BOTH read and edit modes.
- When `readingSourceId` is set, the article view becomes a 2-column grid: left = current mode (Preview or Editor), right = a new lightweight `<SourceSidePanel>` component.
- `SourceSidePanel` is intentionally minimal: header with source title + close button + "Open full reader" link (`/category/${categoryId}` with `sessionStorage["sr-open-source-id"]` already used elsewhere), then a scrollable div that renders `sanitizeHtml(source.htmlContent)` inside a `prose` wrapper. No editing, no outline navigation — just a focused reading column. New file `src/components/zettelkasten/SourceSidePanel.tsx`.
- If `linkedSourceIds` is empty, the toolbar button is disabled with a tooltip telling the user to link a source first (in edit mode).

### 4. Mind-map embedding

Articles can embed a mind map by inserting a fenced reference into the markdown:

```text
::mindmap[<mindMapId>]
```

(One per line, easy to parse, doesn't conflict with markdown.)

**Edit mode**:
- Toolbar gets a new button "🗺️ Umetni mapu". Clicking it opens a small picker dialog listing all `MindMapDoc` records with `categoryId === categoryId` (loaded once via `loadMindMaps()` filtered client-side). Selecting one inserts `\n\n::mindmap[<id>]\n\n` at the cursor.
- Implementation: extend `ZettelEditor`'s toolbar with an optional `onInsertMindMap?: () => void` prop, fired from the parent which owns the dialog. Parent passes a callback that opens the dialog and, on selection, calls the editor's existing insertion path (we'll expose a small `insertText(text: string)` imperative handle via `forwardRef` + `useImperativeHandle`).

**Read mode**:
- Extend `ZettelPreview`'s `renderMarkdown` to detect lines matching `^::mindmap\[([a-z0-9-]+)\]\s*$` and emit a placeholder `<div data-mindmap="<id>"></div>`.
- After `dangerouslySetInnerHTML`, a `useEffect` walks placeholders and either:
  - If the `MindMapDoc` is loaded and resolves: render a small embedded card showing the title + a button "Otvori mapu" linking to `/subject/${categoryId}/mind-map?map=${id}` (or the existing route — confirm by reading routing later in implementation), AND optionally a thumbnail using the existing `<MindMapViewer>` inside a fixed-height (e.g. 320 px) bordered box.
  - If unresolved: show a muted "Mapa nije pronađena" chip.
- To avoid bundling React Flow into Zettelkasten on every load, lazy-load `MindMapViewer` via `React.lazy`.
- New helper component `src/components/zettelkasten/EmbeddedMindMap.tsx` that takes `mindMapId` and `categoryId`, loads the doc with `getMindMap(id)`, and renders the card + lazy viewer.
- Preview parser approach: simplest is to split the rendered HTML by the placeholder and interleave React nodes. To keep `ZettelPreview` cohesive, change it from a single `dangerouslySetInnerHTML` div into a function that returns `ReactNode[]` by splitting input markdown into segments at `::mindmap[...]` lines, rendering text segments via the existing markdown-to-HTML pipeline, and rendering `<EmbeddedMindMap>` between them.

### 5. Files & changes

| File | Change |
|---|---|
| `src/views/ZettelkastenView.tsx` | Major rewrite of the active-article branch: `isEditing`, `draft`, `readingSourceId`, side-panel grid, save-on-exit, mind-map insert dialog wiring. List view unchanged. |
| `src/components/zettelkasten/ZettelEditor.tsx` | Remove debounced `onChange` effect; `onChange` fires synchronously on user input into parent draft. Add `forwardRef` + `useImperativeHandle({ insertText })`. Add optional `onInsertMindMap?: () => void` toolbar button. |
| `src/components/zettelkasten/ZettelPreview.tsx` | Switch from single `dangerouslySetInnerHTML` to segment-based render that interleaves markdown HTML chunks with `<EmbeddedMindMap>` for `::mindmap[id]` lines. Keep wiki-link delegated click handling per chunk. |
| `src/components/zettelkasten/SourceSidePanel.tsx` (new) | Header + scrollable sanitized HTML render of `Source.htmlContent`. |
| `src/components/zettelkasten/EmbeddedMindMap.tsx` (new) | Loads `MindMapDoc` via `getMindMap`, shows title + open-link, lazy-renders `<MindMapViewer>` in a bounded box. |
| `src/components/zettelkasten/MindMapPickerDialog.tsx` (new) | Small `<Dialog>` listing the subject's mind maps. Filters `loadMindMaps()` by `categoryId`. |

### 6. Behavior summary

```text
[List view] ──pick article──▶ [Read mode]
                                  │  Uredi
                                  ▼
                              [Edit mode] ── Sačuvaj ──▶ [Read mode] (one IDB write)
                                  │
                                  └── unmount / switch / Nazad ──▶ flushDraft() (one IDB write)

Both modes:
  ┌──────────────────────┐ ┌──────────────────────┐
  │  Preview / Editor    │ │  SourceSidePanel     │  ← when readingSourceId is set
  └──────────────────────┘ └──────────────────────┘
```

### 7. Out of scope / explicitly unchanged

- `BacklinksPanel`, `LinkedSourcesPicker`, `zettelkasten-storage.ts`, and the Dexie schema stay as-is.
- The Guided Discovery list view (no active article) is untouched.
- No new routes; mind-map "Open" links use the existing route.
- No autosave timer; only explicit save and unmount-flush.
