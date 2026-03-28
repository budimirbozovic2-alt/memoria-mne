

# Task 5: Mind Map Export Pipeline & Category Gallery

## Current State

- `MindMapDoc` exists in `db.ts` with fields: `id, title, mode, nodes, edges, createdAt, updatedAt`
- **No `categoryId` field** — maps are global-only
- `mindMaps` table index: `"id, title, updatedAt"` — no `categoryId` index
- Schema is at **v7** — adding `categoryId` index requires bumping to **v8**
- `CategoryView.tsx` has 2 tabs: Kartice, Izvori

## Plan

### 1. Schema: Add `categoryId` to `MindMapDoc` (v8 migration)

**`src/lib/db.ts`**:
- Add optional `categoryId?: string` to `MindMapDoc` interface
- Bump schema to v8: keep v7 as-is, add `this.version(8).stores({ mindMaps: "id, categoryId, title, updatedAt" })` — only the mindMaps index changes, all other tables stay the same (Dexie carries forward unchanged stores)

### 2. Export Dialog in MindMapCanvas

**New: `src/components/mindmap/ExportToCategory.tsx`**:
- Small dialog component with:
  - Text input for map title (pre-filled with current doc title)
  - Category dropdown (from `useCardData().categoryRecords`)
  - Save button
- On save: creates a **new** `MindMapDoc` record with `categoryId` set, copies current nodes/edges as snapshot data, saves via `saveMindMap()`

**`src/components/mindmap/MindMapCanvas.tsx`**:
- Add "Eksportuj u Predmet" button in the toolbar (next to Save)
- State: `exportOpen: boolean`
- Render `<ExportToCategory>` dialog, passing current doc's title/nodes/edges

### 3. Category Gallery — 3rd Tab

**New: `src/components/category/CategoryMindMaps.tsx`**:
- Query: `useLiveQuery(() => db.mindMaps.where("categoryId").equals(categoryId).toArray())`
- Display as a grid of cards showing map title, date, node count
- Click opens a **read-only** full-screen ReactFlow viewer (reuse `MindMapCanvas` with a `readOnly` prop, or render ReactFlow directly with `nodesDraggable={false}, nodesConnectable={false}, elementsSelectable={false}`)
- Empty state with map icon

**`src/views/CategoryView.tsx`**:
- Add 3rd tab: "Mentalne mape" with `GitBranch` icon and count badge
- Query category mind maps via `useLiveQuery`
- Render `<CategoryMindMaps>`

### 4. Read-Only Viewer

**New: `src/components/category/MindMapViewer.tsx`**:
- Lightweight ReactFlow wrapper: takes nodes/edges, renders with `nodesDraggable={false}`, `nodesConnectable={false}`, presentation mode, `fitView`
- Back button to return to gallery
- Reuses `MindMapNodeComponent` for consistent node rendering

## File Changes

| File | Change |
|---|---|
| `src/lib/db.ts` | Add `categoryId?` to `MindMapDoc`, bump to v8 with categoryId index |
| `src/components/mindmap/ExportToCategory.tsx` | **NEW** — export dialog |
| `src/components/mindmap/MindMapCanvas.tsx` | Add export button + dialog state |
| `src/components/category/CategoryMindMaps.tsx` | **NEW** — gallery grid |
| `src/components/category/MindMapViewer.tsx` | **NEW** — read-only viewer |
| `src/views/CategoryView.tsx` | Add 3rd tab with mind map query |

