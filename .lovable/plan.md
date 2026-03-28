

# Deep Static System Audit — Report v3

---

## 🔴 CRITICAL (App crashes, infinite loops, data loss)

### C1: `renameCategory` — `duplicateDetected` flag is unreliable across batched state updates
**File:** `src/hooks/useCategoryManagement.ts` — Lines 23-56

The `setCategories` functional updater sets `duplicateDetected = true` inside the updater, then line 34 checks it synchronously. In React 18 **concurrent mode** or when called from an async context (e.g., `startTransition`), the updater may be deferred, making `duplicateDetected` still `false` when the guard check runs. The `setCardMapState` and `setSubcategories` calls then proceed with the rename even though the category name was a duplicate, **orphaning** all cards and subcategories under a non-existent category name.

**Trigger:** Rename a category to an existing name in any async/transition context.

### C2: `bulkFlagNeedsReview` / `reorderCards` / `bulkUpdateChapter` — Ref mutation after `setCardMapState` reads stale `updated` array
**File:** `src/hooks/useCardAnnotations.ts` — Lines 144-200

These functions populate the `updated`/`changed` array **inside** the `setCardMapState` updater, then use it **outside** at lines 159, 178, 197 to sync `cardMapRef`. In React 18 batching, the updater runs synchronously within the same event loop tick, so this works **today**. However, if React ever defers the updater (concurrent features), `updated` would be empty when the ref sync runs, causing **silent data loss** — the ref and IDB never get the updates.

### C3: `ipcMain.removeAllListeners('renderer-ready')` on crash recovery removes ALL listeners
**File:** `electron/window.cjs` — Line 166

When a renderer crash triggers recovery, `ipcMain.removeAllListeners('renderer-ready')` removes listeners from ALL sources, not just the current window's. If any other module or future code registers a `renderer-ready` listener, it gets silently removed. Additionally, `ipcMain.on('window-minimize/maximize/close')` handlers (lines 95-103) are **never cleaned up** on crash recovery — they accumulate with each `createWindow` call, causing duplicate handler execution.

### C4: `app://` protocol handler doesn't set MIME types
**File:** `main.cjs` — Lines 71-79

The `protocol.handle('app', ...)` delegates to `net.fetch('file://' + filePath)`. If Chromium doesn't correctly infer MIME types for `file://` URLs served through `net.fetch`, CSS and JS files may be served with wrong `Content-Type`, causing the app to fail silently. Specifically, `.js` modules need `application/javascript` or the browser rejects them with "MIME type mismatch" errors. This is the most likely remaining cause of loading failures under the `app://` protocol.

---

## 🟠 HIGH RISK (UI bugs, logical offsets, missing fallbacks)

### H1: Source Registry stored in localStorage — NOT migrated to IDB on boot
**File:** `src/lib/source-registry.ts` — Lines 40-55

`loadSourceRegistry()` reads from `localStorage` only. While `syncSourceRegistryToIDB` writes a backup copy to IDB on save, the **primary read path** always uses localStorage. Under `app://` protocol this should work (stable origin), but if localStorage is ever cleared independently of IDB, the registry is lost while cards/sources persist, causing complete Forum breakdown. The export/import system backs up the localStorage key, but there's no boot-time check that loads from IDB if localStorage is empty.

### H2: `calculateForumState` fingerprint doesn't include monument types changes
**File:** `src/lib/forum-logic.ts` — Lines 186-199

The fingerprint includes `registryVersion` but NOT monument type changes (line 225: `loadMonumentTypes()` is called but its state isn't in the fingerprint). If a user changes a monument's building type without any card changes, the cached `_cachedForumState` returns stale data showing the old building type.

### H3: `exportData` captures stale `cards` from closure, not live IDB state
**File:** `src/hooks/useCardExport.ts` — Lines 89-157

The `exportData` callback captures `cards` from the `useCardExport` hook's props. If a user makes edits and immediately exports before the React re-render cycle completes, the exported cards may be missing the latest mutations. Meanwhile, `reviewLog` is loaded fresh from IDB (line 106), creating an **asymmetry** — cards are stale but logs are fresh.

### H4: Electron IPC `window-minimize/maximize/close` handlers use `ipcMain.on` (not scoped to window)
**File:** `electron/window.cjs` — Lines 95-103

These IPC handlers are registered globally on `ipcMain` without any window-scoping. If `createWindow` is called multiple times (crash recovery, line 169), duplicate handlers accumulate. Each `window-minimize` message triggers N handlers, potentially operating on destroyed windows (the guard `!win.isDestroyed()` prevents crashes but the handlers still run).

### H5: `deleteCard` IDB delete is fire-and-forget
**File:** `src/hooks/useCardCRUD.ts` — Line 152

`idbDeleteCard(id).catch(e => console.error(...))` — If IDB delete fails (e.g., quota issue, transaction abort), the card is removed from React state but persists in IDB. On next app restart, the "deleted" card reappears. Same issue for `splitCard` at line 173.

---

## 🟡 BOTTLENECKS (Performance drops, unnecessary re-renders)

### B1: `useDashboardData` hook likely recomputes on every `cards` array reference change
**File:** `src/hooks/useDashboardData.ts` (not read, inferred from usage)

`Dashboard` receives `cards: SRCard[]` as props (line 27). Since `cards` is derived from `mapToArray(cardMap)` which creates a new array reference on every `cardMap` change, `useDashboardData` and all its downstream memos recompute on every single card mutation — even mutations to unrelated cards.

### B2: Pomodoro timer causes 1Hz re-renders propagating through context
**File:** `src/contexts/AppContext.tsx` — Lines 187-214

`setSeconds` triggers every second, creating a new `PomodoroState` object. The `useMemo` at line 228 depends on `seconds`, so `PomodoroContextValue` changes every second. Any component using `usePomodoroContext()` re-renders at 1Hz. Since PomodoroProvider is a sibling of UIProvider (not nested), this is **isolated** — only Pomodoro consumers re-render, not all UI consumers. Impact: minor but real for TopNav.

### B3: `ForumProvider` wraps the entire app tree but most routes don't use it
**File:** `src/App.tsx` — Line 52

`ForumProvider` wraps all routes including Create, Edit, Cards, Settings, etc. It's lightweight (just a boolean + callback context) but adds an unnecessary provider layer for the majority of routes.

### B4: Triple iteration in `calculateForumState` — cards iterated 3 times
**File:** `src/lib/forum-logic.ts` — Lines 217-278

Cards are iterated once to group by category (line 218), once inside `buildMonument` per category (line 114-134), and once more for overall mastery (lines 273-278). The overall mastery loop could be merged into the per-category loop, eliminating one full pass over all cards.

---

## Summary

| Severity | Count | Key Risk |
|----------|-------|----------|
| 🔴 CRITICAL | 4 | Category rename race, ref sync race, IPC listener leak, MIME type on app:// |
| 🟠 HIGH | 5 | Registry localStorage-only read, stale Forum cache, export asymmetry, IPC handler accumulation, fire-and-forget delete |
| 🟡 BOTTLENECK | 4 | Dashboard recompute, Pomodoro 1Hz renders, unnecessary ForumProvider scope, triple card iteration |

