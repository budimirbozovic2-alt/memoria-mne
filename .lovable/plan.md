

# Import/Export Data Symmetry Audit — Report

## 1. Payload Symmetry

### Exported entities (v4 full backup):
| Entity | Export source | Imported? | Overwrite cleanup? |
|--------|-------------|-----------|-------------------|
| `cards` | React state (in-memory) | ✅ | 🔴 **NO** |
| `categories` | React state | ✅ (merge) | ❌ No (always merges) |
| `subcategories` | React state | ✅ (merge) | ❌ No (always merges) |
| `reviewLog` | IDB `idbLoadReviewLog()` | ✅ (overwrite only) | ⚠️ Partial — `setReviewLog` replaces in-memory state but does NOT clear the IDB `reviewLog` table |
| `srSettings` | React state | ✅ (overwrite only) | ✅ Full replace |
| `sources` | IDB `db.sources` | ✅ | ✅ bulkPut + delete orphans |
| `mindMaps` | IDB `db.mindMaps` | ✅ | ✅ bulkPut + delete orphans |
| `diary` | IDB `db.diary` | ✅ | ✅ bulkPut + delete orphans (UUID table) |
| `calibrationLog` | IDB | ✅ | ✅ clear + bulkAdd (auto-inc) |
| `latencyLog` | IDB | ✅ | ✅ clear + bulkAdd |
| `slippageLog` | IDB | ✅ | ✅ clear + bulkAdd |
| `activityLog` | IDB | ✅ | ✅ clear + bulkAdd |
| `disciplineLog` | IDB | ✅ | ✅ clear + bulkAdd |
| `pomodoroLog` | IDB | ✅ | ✅ clear + bulkAdd |
| `localStorageData` | 6 LS keys + 3 IDB settings | ✅ | ✅ Writes keys back |

**All exported entities are imported.** Nothing is silently dropped.

---

## 2. LocalStorage Sync

### Exported keys:
`sr-app-settings`, `sr-mnemonic-workshop`, `sr-mnemonic-associations`, `sr-major-system-map`, `sr-learn-progress`, `sr-last-backup` + IDB settings keys mapped as `sr-planner-config`, `sr-daily-mapped-count`, `sr-daily-mapped-date`.

### Import restore:
All keys from `localStorageData` are written back via `localStorage.setItem`. Cache invalidation calls (`invalidateSourceRegistryCache`, `invalidateMonumentTypesCache`) are in place (C1 fix).

### ⚠️ Gap: `codex-source-registry` and `codex-monument-types`
These two localStorage keys are **NOT included** in the export's `lsKeys` array. They are not packed into `localStorageData` during export, so they are **never restored** on import. They self-heal on next use (rebuilt from card data), but after an overwrite import on a fresh browser, the Forum and Source Registry will show empty/default state until the caches are rebuilt by user activity.

**Severity: LOW** — data is reconstructable, not primary storage.

---

## 3. "Overwrite" Mode Integrity

### 🔴 HIGH RISK: Cards are NOT cleaned on overwrite

In overwrite mode (lines 88-89), the import does:
```
importedCards.forEach((ic) => { nextMap[ic.id] = ic; merged.push(ic); });
```
This **spreads the current map** (`{ ...currentMap }`) and then overwrites matching IDs. Cards that exist in the app but are **not** in the backup file **remain in the map**. There is no deletion step for cards.

Unlike sources/mindMaps/diary (which all have a post-bulkPut orphan-deletion step), cards have **zero orphan cleanup**. A "Full Restore → Overwrite" import will leave ghost cards from the previous session.

### 🟠 HIGH RISK: Categories/subcategories always merge, never replace

Even in overwrite mode, categories use `[...new Set([...prev, ...imported])]` (line 99). If the backup has categories [A, B] but the app has [A, B, C, D], the result is [A, B, C, D] — the extra categories survive. Same for subcategories. This breaks the expectation of a "full restore."

### 🟠 MEDIUM RISK: reviewLog IDB table not cleared

`setReviewLog` replaces the in-memory React state, but the IDB `reviewLog` table (where `idbLoadReviewLog` reads from) is never cleared or overwritten. On next app restart, the old IDB review log will reload. The imported review log only lives in memory for the current session.

### ✅ SAFE: Sources, mindMaps, diary, all log tables
These all properly use bulkPut + orphan deletion (or clear + bulkAdd for auto-increment tables).

---

## Summary of Risks

| Risk | Severity | Entity | Problem |
|------|----------|--------|---------|
| Orphaned cards after overwrite | 🔴 HIGH | `cards` | No deletion of cards not in backup |
| Categories never replaced | 🟠 HIGH | `categories`, `subcategories` | Always merges, even on "overwrite" |
| ReviewLog IDB not cleared | 🟠 MEDIUM | `reviewLog` | In-memory replace only, IDB persists old data |
| Missing LS keys in export | ⚠️ LOW | `codex-source-registry`, `codex-monument-types` | Not exported, but self-healing |

