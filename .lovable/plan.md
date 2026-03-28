

# CODEX v2.0 — Phase 1: Database Schema & Registry Destruction

## Understanding

The current architecture has Categories as flat string arrays, Sources with an optional `category` field, and a separate localStorage-based Source Registry that maps raw labels to "Master Source" names with monument-type overrides. This creates fragile string-key relationships, duplicated grouping logic, and no true aggregate root.

Phase 1 delivers a clean-slate Dexie v7 schema where Category is the root entity (UUID-based), Cards and Sources carry a strict `categoryId` FK, and the Source entity absorbs all registry metadata. The Source Registry module and its localStorage keys are deleted entirely.

## New Domain Model

```text
┌─────────────────────────────────────────────────┐
│  CATEGORIES (UUID PK, ~9-10 fixed)              │
│  id, name, sortOrder, subcategories[], color    │
├─────────────────────────────────────────────────┤
│         │                        │              │
│  ┌──────▼──────┐          ┌──────▼──────┐       │
│  │   SOURCES    │          │    CARDS     │      │
│  │ categoryId   │          │ categoryId   │      │
│  │ (absorbs     │◄─────────│ sourceId?    │      │
│  │  registry)   │          │              │      │
│  └─────────────┘          └──────────────┘       │
│                                                  │
│  FORUM = pure read-only derived view from above  │
└──────────────────────────────────────────────────┘
```

## Changes

### 1. `src/lib/db.ts` — New v7 Schema (Clean Slate)

**New Category table** with UUID PK:
```ts
interface CategoryRecord {
  id: string;           // UUID
  name: string;         // display name
  sortOrder: number;
  subcategories: string[];  // absorbs subcategories table
  color?: string;
}
```

**Updated Source interface** — absorbs registry metadata, drops `label` rename to `title`:
```ts
interface Source {
  id: string;
  categoryId: string;       // FK → categories.id (REQUIRED)
  title: string;             // was "label"
  date: string;
  htmlContent: string;
  outline: { id: string; text: string; level: number }[];
  articles: SourceArticle[];
  version: number;
  createdAt: number;
  updatedAt: number;
  // Registry-absorbed fields:
  officialGazetteInfo?: string;
  slMarkings?: string;        // SL oznake
  isExclusive?: boolean;      // sole source for category (was Mode B)
  // Dropped: previousVersionId, previousHtmlContent (diff feature preserved via version field)
}
```

**Updated Card interface** — `category` string → `categoryId` UUID FK:
```ts
// In spaced-repetition.ts Card:
categoryId: string;      // FK → categories.id (replaces `category: string`)
subcategory?: string;     // kept as string within category
chapter?: string;
// sourceId?: string;     // unchanged
```

**Dexie v7 stores** — complete reset, no upgrade function:
```ts
this.version(7).stores({
  categories: "id, name, sortOrder",
  cards: "id, categoryId, subcategory, type, createdAt, sourceId, [categoryId+subcategory]",
  sources: "id, categoryId, title, version, createdAt",
  reviewLog: "++id, cardId, sectionId, timestamp",
  pomodoroLog: "++id, timestamp, type",
  settings: "key",
  diary: "id, date",
  calibrationLog: "++id, timestamp, cardId",
  latencyLog: "++id, timestamp, cardId",
  slippageLog: "++id, date",
  activityLog: "++id, timestamp, type",
  disciplineLog: "++id, date",
  mindMaps: "id, title, updatedAt",
  // subcategories table: DROPPED (absorbed into categories)
});
```

The `ensureDbOpen` catch block will detect `VersionError` from v6→v7 mismatch. We add a one-time reset: if v7 upgrade fails, `deleteDatabase()` + reopen, seeding the 9 default categories.

**Default categories seed** (run after clean DB open):
```ts
const DEFAULT_CATEGORIES = [
  "Krivično materijalno pravo",
  "Krivično procesno pravo",
  "Građansko pravo",
  "Obligaciono pravo",
  "Stvarno pravo",
  "Radno pravo",
  "Upravno pravo",
  "Ustavno pravo",
  "Međunarodno pravo",
  "Opšte",
];
```

### 2. Delete Source Registry — Files & References

**Delete files:**
- `src/lib/source-registry.ts` — entire file
- `src/views/SourceRegistryPage.tsx` — entire file

**Clean references in 10 files:**
- `src/App.tsx` — remove `/source-registry` route
- `src/components/TopNav.tsx` — remove "Registar izvora" nav item
- `src/components/Breadcrumbs.tsx` — remove `/source-registry` entry
- `src/components/MainLayout.tsx` — remove from `SOURCE_ROUTES`
- `src/components/SourceManager.tsx` — remove all registry imports/logic, rewrite to use `source.isExclusive` directly
- `src/lib/sources-storage.ts` — remove registry import and cleanup logic
- `src/lib/forum-logic.ts` — remove registry imports, use `source.title` directly instead of alias resolution
- `src/hooks/useSourceHierarchy.ts` — remove registry imports
- `src/hooks/useCardImport.ts` — remove registry cache invalidation
- `src/hooks/useCardExport.ts` — remove `codex-source-registry` from localStorage backup keys
- `src/views/RomanForumPage.tsx` — remove `onRegistryChanged` listener
- `src/lib/db.ts` — remove `idbLoadSourceRegistry`/`idbSaveSourceRegistry` helpers

**Clean localStorage keys:**
- Remove `codex-source-registry` usage
- Remove `codex-monument-types` usage (monument types move to `settings` table or are derived)

### 3. Update `spaced-repetition.ts` — Card Interface

- Rename `category: string` → `categoryId: string` in `Card` interface
- Keep `subcategory` and `chapter` as plain strings (they're scoped within the category)

### 4. Update `useCategoryManagement.ts`

- Rewrite to work with UUID-based `CategoryRecord` instead of string arrays
- `renameCategory` updates `categories.name`, then cascades to `cards.categoryId` (no change needed since FK is UUID)
- `deleteCategory` reassigns cards/sources to "Opšte" category UUID
- Subcategory operations now modify `categories.subcategories[]` array directly

### 5. Boot Sequence (`useCardBootstrap.ts`)

- Load categories as `CategoryRecord[]` instead of `string[]`
- Build a `categoryMap: Map<id, CategoryRecord>` for O(1) lookups
- Remove `idbLoadSubcategories()` call (absorbed into categories)
- Seed default categories if table is empty

## Technical Detail — DB Reset Strategy

```ts
// In ensureDbOpen, after VersionError catch:
if (e.name === "VersionError" || e.name === "UpgradeError") {
  await Dexie.delete("MemoriaDB");
  // Re-instantiate and open fresh
  // Seed default categories
}
```

This is explicitly authorized by the "Clean Slate" protocol. All existing data is dropped.

## Files Modified (Phase 1 only)

| File | Action |
|---|---|
| `src/lib/db.ts` | Major rewrite — v7 schema, new interfaces, seed logic, drop subcategories table |
| `src/lib/spaced-repetition.ts` | `Card.category` → `Card.categoryId` |
| `src/lib/source-registry.ts` | **DELETE** |
| `src/views/SourceRegistryPage.tsx` | **DELETE** |
| `src/lib/sources-storage.ts` | Remove registry imports |
| `src/lib/forum-logic.ts` | Remove registry imports, use source.title |
| `src/hooks/useCategoryManagement.ts` | Rewrite for UUID categories |
| `src/hooks/useCardBootstrap.ts` | Load CategoryRecord[], seed defaults |
| `src/App.tsx` | Remove registry route |
| `src/components/TopNav.tsx` | Remove registry nav |
| `src/components/Breadcrumbs.tsx` | Remove registry breadcrumb |
| `src/components/MainLayout.tsx` | Remove from SOURCE_ROUTES |
| `src/hooks/useCardImport.ts` | Remove registry references |
| `src/hooks/useCardExport.ts` | Remove registry localStorage keys |
| `src/hooks/useSourceHierarchy.ts` | Remove registry imports |
| `src/views/RomanForumPage.tsx` | Remove registry listener |
| `src/components/SourceManager.tsx` | Remove registry logic |
| `src/contexts/AppContext.tsx` | Update category types |

## What Phase 1 Does NOT Touch

- No UI layout changes (Phase 2)
- No Mode A/B card view toggle (Phase 3)
- No Forum DnD stripping (Phase 3)
- No new Source editor (Phase 3)

Existing UI will have TypeScript errors after Phase 1 due to `category` → `categoryId` rename. These are intentional — Phase 2 will fix all consumers as it builds the new routing shell.

