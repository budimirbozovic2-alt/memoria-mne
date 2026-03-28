

# Architectural & Relational Audit Report

## Entity-Relationship Map

```text
┌──────────────────────────────────────────────────────────────────┐
│                        CATEGORIES (string[])                     │
│  Storage: IDB categories table (id=name)                        │
│  No UUID — name IS the key                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────────┐          ┌─────────────┐                     │
│    │   SOURCES    │          │    CARDS     │                     │
│    │ id (UUID)    │◄─────────│ sourceId?    │  N:1 (optional)    │
│    │ category?    │          │ category     │  string match      │
│    │ label        │          │ subcategory  │                     │
│    └──────┬──────┘          │ chapter      │                     │
│           │                  └──────────────┘                     │
│           │                                                      │
│    ┌──────▼──────────────────────────┐                           │
│    │  SOURCE REGISTRY (localStorage) │                           │
│    │  aliases: rawLabel→masterSource │                           │
│    │  overrides: category→forcedMode │                           │
│    └──────┬──────────────────────────┘                           │
│           │                                                      │
│    ┌──────▼──────┐                                               │
│    │    FORUM     │  Derived at runtime from Cards + Registry    │
│    │  monuments[] │  One monument per category                   │
│    └─────────────┘                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Hierarchy & Relational Logic

### 1.1 Foreign Keys & Indexes

| Relationship | Key Field | Indexed? | Enforcement |
|---|---|---|---|
| Card → Source | `card.sourceId` | Yes (IDB index) | **None** — no FK constraint, orphan sourceId values silently tolerated |
| Card → Category | `card.category` (string) | Yes | **None** — category is a plain string, no referential check |
| Source → Category | `source.category` (string, optional) | Yes (v6 index) | **None** — same string-match, no constraint |
| Registry → Source | `alias.rawLabel` matches `source.label` | No index | **None** — pure string equality, no validation |
| Forum → Cards | Derived grouping by `card.category` | N/A | Runtime only |

**Finding F1**: There are zero enforced foreign keys anywhere. All relationships are string-based conventions. IndexedDB doesn't support FK constraints natively, but the application doesn't compensate with validation logic either.

### 1.2 Circular Dependencies

No circular dependencies exist. The hierarchy is strictly:
```
Category (string) ← Card.category / Source.category
Source (UUID) ← Card.sourceId
Registry (localStorage) ← Source.label
Forum (runtime) ← Cards + Registry
```
This is clean. No risk of circular references.

### 1.3 Category Identity Problem

**Finding F2 (HIGH)**: Categories use `name` as both display label and primary key (`id: name, name`). This means:
- `renameCategory("A", "B")` must atomically update: the categories table, all cards, all subcategories, **and all sources** with `category === oldName`.
- Currently, `renameCategory` in `useCategoryManagement.ts` updates cards and subcategories but **does NOT update `source.category`**. Sources with `category === oldName` become orphaned from the renamed category.

---

## 2. Synchronization & Cascading Operations

### 2.1 Category Delete → Cards (Handled) / Sources (NOT Handled)

`deleteCategory(name)` in `useCategoryManagement.ts:65-89`:
- Cards: reassigned to `"Opšte"` with `subcategory: ""` ✅
- Subcategories: deleted ✅
- **Sources with `source.category === name`: NOT updated** ❌

**Finding F3 (CRITICAL)**: Deleting a category leaves sources with a `category` value pointing to a non-existent category. These sources become invisible in any category-filtered view and produce wrong auto-link results.

### 2.2 Category Rename → Sources (NOT Handled)

**Finding F4 (CRITICAL)**: Same as F3 but for rename. `renameCategory` updates cards and subcategories but sources with `source.category === oldName` are not renamed. After rename, `source.category` no longer matches any category.

### 2.3 Source Delete → Cards (Handled)

`deleteSource` in `sources-storage.ts:48-62` runs inside a Dexie transaction:
- Finds all cards with `sourceId === id`
- Clears `sourceId`, `textAnchor`, `needsReview`
- Deletes source

This is correct, **but** it writes directly to IDB, bypassing the in-memory `cardMap` in `useCards`. The React state will be stale until next page reload.

**Finding F5 (HIGH)**: `deleteSource` cleans IDB cards but doesn't notify the in-memory card state. Users see stale `sourceId` links in the UI until they refresh.

### 2.4 Source Registry ↔ Source Delete

When a source is deleted, its `label` may still exist as a `rawLabel` in the Source Registry aliases. No cleanup occurs.

**Finding F6 (MEDIUM)**: Deleting a source doesn't remove its registry alias entry. The registry will reference a ghost label. This is cosmetic (the SourceManager shows count=0) but accumulates stale data over time.

### 2.5 Import (Overwrite) — Source Category Preservation

The import flow (`useCardImport.ts`) imports cards but sources are imported separately via `db.sources.bulkPut`. Since `source.category` is now a schema field, it survives import if the backup contains it. Old backups without the field will import sources with `category: undefined`.

**Finding F7 (LOW)**: Old backups produce sources without category. The v6 migration only runs on DB upgrade, not on import. A post-import migration step to re-infer categories from linked cards is missing.

---

## 3. State Management & Component Coupling

### 3.1 Dual Data Paths (IDB Direct vs. In-Memory)

| Operation | Path | In-memory sync? |
|---|---|---|
| Card CRUD | `useCardCRUD` → `cardMapRef` + `schedulePersist` | ✅ Yes |
| Source CRUD | `sources-storage.ts` → `db.sources.put()` directly | ❌ No — components re-fetch via `loadSources()` |
| Category CRUD | `useCategoryManagement` → `setCategoriesState` + `idbSaveCategories` | ✅ Yes |
| Source Registry | `source-registry.ts` → `localStorage` + IDB backup | ❌ Event-based (`onRegistryChanged`) |
| Forum | `forum-logic.ts` → Pure function, fingerprint cache | ✅ Derived |

**Finding F8 (HIGH)**: Sources and Cards use completely different state management patterns. Cards are in a centralized `cardMap` with ref-delta persistence. Sources are loaded ad-hoc via `loadSources()` with an in-memory cache that is invalidated on write. This means:
- `deleteSource` clears card links in IDB but the `cardMap` in memory still shows the old `sourceId`.
- `SourceReader` operates on its own fetched source, disconnected from the `SourceManager` cache.

### 3.2 SourceManager Tight Coupling

`SourceManager.tsx` directly calls `loadSources()`, `loadSourceRegistry()`, `buildAliasMap()`, and manually iterates `cards` to compute monument structures. It duplicates logic that `forum-logic.ts` also performs (grouping cards by category, resolving master sources). These two should share a computation layer.

**Finding F9 (MEDIUM)**: `SourceManager` and `ForumProvider` independently compute monument/source groupings from the same raw data, with slightly different logic paths. Risk of UI inconsistency between Forum view and Registry view.

---

## 4. Performance in Cross-Entity Queries

### 4.1 N+1 Query Patterns

| Component | Pattern | Efficiency |
|---|---|---|
| `SourceManager` monuments | Iterates all cards O(n), then for each monument law does `sources.find()` O(m) | O(n*m) — should use sourceMap |
| `forum-logic.ts` source breakdown | For each card in category, looks up `sourceMap.get()` | O(1) per card ✅ |
| `auto-link-suggestion.ts` | Iterates all cards × all sources | O(n*m) but filtered early |
| `LinkToExistingCardModal` | Filters cards in-memory from props | O(n) ✅ |

**Finding F10 (MEDIUM)**: In `SourceManager.tsx:119-134`, the `matchingCat` lookup does `sources.find(s => s.label === law.label)` inside a loop over all monument groups, each with multiple laws. This is O(groups × laws × sources). With many sources this becomes noticeable. Should use a `Map<label, Source>` for O(1) lookup.

### 4.2 Boot Load

All cards are loaded into memory at boot (`boot-load-all` pattern). This is intentional and appropriate for <10K cards. Sources are loaded lazily on first access. No N+1 IDB queries at boot.

---

## Summary of Findings

| ID | Severity | Issue |
|---|---|---|
| F3 | 🔴 CRITICAL | `deleteCategory` doesn't update `source.category` — orphaned sources |
| F4 | 🔴 CRITICAL | `renameCategory` doesn't update `source.category` — broken category link |
| F5 | 🟠 HIGH | `deleteSource` updates IDB cards but not in-memory `cardMap` — stale UI |
| F2 | 🟠 HIGH | Category uses name as PK — all rename/delete must cascade to sources |
| F8 | 🟠 HIGH | Dual data path (cards in-memory vs sources ad-hoc) causes sync gaps |
| F9 | 🟡 MEDIUM | SourceManager and Forum duplicate grouping logic, risk of divergence |
| F6 | 🟡 MEDIUM | Deleting source doesn't clean registry alias entries |
| F10 | 🟡 MEDIUM | `SourceManager` matchingCat uses O(n) find instead of Map lookup |
| F7 | 🟡 LOW | Old backup import produces sources without category, no post-import fix |
| F1 | ℹ️ INFO | No FK enforcement anywhere — all relationships are string conventions |

## Actionable Recommendations

### Priority 1: Fix Category Cascade to Sources (F3, F4)

In `useCategoryManagement.ts`:
- `renameCategory`: after updating cards, query `db.sources.where("category").equals(oldName)` and update to `newName`.
- `deleteCategory`: same — update source.category to `"Opšte"` or clear it.
- Invalidate sources cache after these mutations.

### Priority 2: Sync deleteSource with In-Memory Card State (F5)

After `deleteSource` cleans IDB, fire a notification that `useCards` listens to (similar to `onSourcesChanged`), triggering a `setCardMapState` update that clears `sourceId` on affected cards in memory.

### Priority 3: Unify Source/Card State Layer (F8)

Consider lifting sources into the same centralized provider pattern as cards, or at minimum, ensure all IDB-direct source mutations trigger in-memory card state updates.

### Priority 4: Deduplicate Monument Computation (F9)

Extract shared "group cards by category + resolve master sources" logic into a shared utility that both `SourceManager` and `forum-logic.ts` consume.

### Priority 5: Registry Cleanup on Source Delete (F6)

When deleting a source, check if its `label` appears in `registry.aliases` and remove entries where no other source shares that label.

