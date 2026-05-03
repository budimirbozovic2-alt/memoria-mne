# SSOT AUDIT REPORT — Memoria Codex

Scope: `src/contexts/**`, `src/hooks/**`, `src/store/**`, `src/views/**`, `src/components/**`, `src/lib/**`. Read-only architectural audit, no code changes performed.

Legend: 🔴 Critical · 🟡 Warning · 🔵 Refactor

---

## 🔴 CRITICAL — Direct SSOT Violations

### C1. `Sources` cached in 4 independent places, no event-bus invalidation contract
**Files:**
- `src/lib/sources-storage.ts:23,55-71` — module-level `_cache: Source[] | null` + `_listeners` set, only invalidated when callers manually call `invalidateSourcesCache()`.
- `src/views/CategoryView.tsx:31,32-41` — local `useState<Source[]>` re-fetched per-category via `loadSourcesByCategory`.
- `src/views/SubjectCardsView.tsx:119,127-132` — independent local `useState<Source[]>`, **does NOT subscribe to `onSourcesChanged`** (CategoryView does, this view does not). After a source rename/delete from another route, this list stays stale.
- `src/components/GlobalSearch.tsx:15-18,72,84-101` — third copy: module-level `cachedSources` + 60s TTL + a CARDS_UPDATED-driven invalidator that **does not fire for source-only changes** (saveSource emits `_notify`, not the eventBus).

**Why it violates SSOT:** Three orthogonal cache layers (module cache in storage, module cache in GlobalSearch, per-view useState) with three different invalidation triggers. A `saveSource()` in `SourcesTab` clears `sources-storage._cache` and notifies `onSourcesChanged` listeners, but nothing flips `GlobalSearch.cachedSources`. `SubjectCardsView` won't refresh until remount.

### C2. `MindMaps` loaded from IDB in 7 components without any cache or shared store
**Files:** `src/views/SubjectMindMapPage.tsx:21`, `src/components/zettelkasten/MindMapPickerDialog.tsx:30`, `src/components/zettelkasten/EmbeddedMindMap.tsx:20`, `src/components/category/SourcesTab.tsx:36,46`, `src/components/mindmap/MindMapList.tsx:25`, `src/components/subject-cards/MindMapSidePanel.tsx:29`, `src/components/GlobalSearch.tsx:8,73,95`.

**Why it violates SSOT:** No central provider/store — each consumer reads `db.mindmaps` and stores its own copy in `useState`. There is no `onMindMapsChanged` listener (the pattern that exists for sources). After save/delete in `MindMapList`, every other open consumer is stale until manually remounted. Every embed (`EmbeddedMindMap`) re-fetches per-id with no de-dup.

### C3. `editingCard` SSOT split between `UIProvider` and `useEditReturn` snapshot path
**Files:** `src/contexts/ui/UIProvider.tsx:45,61` (`editingCard: Card | null` in context), `src/views/EditPage.tsx:11`, `src/views/SubjectCardsView.tsx:88,146-149` (`editingCardRef.current = card; setEditingCard(card)`), `src/views/LearnPage.tsx:76,86-91`.

**Why it violates SSOT:** Each orchestrator keeps a local `useRef<Card>` in parallel with `setEditingCard(...)` because `useEditReturn.buildExtras` runs lazily and needs the most recent value. The card identity is now stored in: (a) `UIContext.editingCard`, (b) per-view `editingCardRef`, (c) sessionStorage payload via `useEditReturn`, (d) URL via `EditPage`. If a card mutates (rename, source change) while the user is on `/edit`, the context still references the *old* `Card` object — `EditPage` will not see the freshest version because it consumes `editingCard` directly instead of looking it up by id in the live `cardMap`.

### C4. `cardMapRef` decoupled from `cardMap` state — defensive resync admits the contract is unsafe
**File:** `src/contexts/cards/CardStateProvider.tsx:141-155`.

**Why it violates SSOT:** The ref is the SSoT for in-place CRUD writes (Ref-Delta) while `cardMap` state is the SSoT for rendering. The provider explicitly relies on every mutator (CRUD hooks, `onCardLinksCleared`, `CARDS_UPDATED` listener, bootstrap, import) to synchronously update both. Any forgotten path leaks silently — the DEV-only size-mismatch warning (lines 144-153) is a tacit acknowledgement that this invariant is not enforceable. With `setCardMapState` also driven by an async event-bus listener on lines 232-269, the two stores can briefly disagree on identity (`prev[id]` may be a stale reference compared to `cardMapRef.current[id]`).

---

## 🟡 WARNING — Parallel Systems / Architectural Complexity

### W1. `LearnSession` keeps two parallel frequency filters (`filterExamFrequent` + `frequencyFilter`)
**File:** `src/components/LearnSession.tsx:18,20,71,74,88,110,114`.

`filterExamFrequent: boolean` is a strict subset of `frequencyFilter === "često"`. Both are persisted in the snapshot (`learn/types.ts:60` + `:59`), forwarded to `SessionFilters.tsx:34,121`, and applied **sequentially** in `sortedCards`. State can be `{filterExamFrequent: true, frequencyFilter: "rijetko"}` → empty list, no UI guard. Identified for refactor in the prior loop but still in code.

### W2. `LearnSession.currentIndex` mirrored in React state AND `sessionStorage`
**File:** `src/components/LearnSession.tsx:23-27,102,125,167`.

`sessionStorage["sr-learn-current-index"]` is written every navigation but `restoreSnapshot.currentIndex` (from `useEditReturn`) is the formal restore path. Two truth sources for the same cursor — they can disagree if the user opens two routes or if `useEditReturn` returns a different index than sessionStorage.

### W3. `ExamQuestions` lives in Zustand store but is **never persisted**
**Files:** `src/store/useSourceReaderStore.ts:69,127,187-193`, `src/hooks/useSourceReaderActions.ts:208,212`.

`examQuestions` is treated like first-class data (CRUD UI in `ExamSidebar`), but reset on every `useSourceReaderStore` reset (`reset()` line 194 and `initSplitWizard`). No DB table, no persistence. Either it should be ephemeral UI-state (then prune the action surface) or a real entity (then move to a Dexie table behind a storage helper).

### W4. `SourceEditor` derives `dirty` via `useEffect` chain instead of comparing on render
**File:** `src/components/category/SourceEditor.tsx:42,61-65`.

`dirty` is a computed boolean of "any field ≠ source.X" but stored in `useState` and synced via `useEffect`. This is the canonical "syncing state via useEffect" anti-pattern — `dirty` should be a derived expression. Bonus bug: once `setDirty(true)` fires it never goes back to `false` if the user reverts edits.

### W5. `CategoryView` and `SubjectCardsView` both fetch sources for the same `categoryId` independently
**Files:** `src/views/CategoryView.tsx:31-41`, `src/views/SubjectCardsView.tsx:119,127-132`.

Two routes, two `useState<Source[]>`, two `loadSourcesByCategory` calls, divergent invalidation (CategoryView subscribes to `onSourcesChanged`, SubjectCardsView does not). Should be a single `useCategorySources(categoryId)` hook backed by the storage cache + listener.

### W6. `GlobalSearch` invalidation listens for `CARDS_UPDATED` to clear `cachedSources`/`cachedMindMaps`
**File:** `src/components/GlobalSearch.tsx:75-81`.

Wrong event domain. `saveSource` / `deleteSource` / `saveMindMap` do not emit `CARDS_UPDATED`; they fire their own listener sets (`onSourcesChanged` only). The cache here only gets cleared when *cards* change. Stale source/mindmap results until 60s TTL.

### W7. `URL searchParams` and `useState(initial = searchParams.get(...))` snapshot pattern
**Files:** `src/components/SRSettingsPanel.tsx:31-34`, `src/views/LearnPage.tsx:32-46`.

`initialTab` is computed from `searchParams` once and stored in `useMemo`, but the active tab inside the Settings tabs component is then driven by its own `useState`. After mount, `?tab=workflow` navigation will not switch the panel — URL and local state diverge.

---

## 🔵 REFACTOR — Anti-Patterns

### R1. `setCardMapState` re-clones map on event-bus surgical merge
**File:** `src/contexts/cards/CardStateProvider.tsx:248-253`.

`setCardMapState((prev) => { const next = { ...prev }; ... })` is invoked from inside an async event-bus callback that also mutates `cardMapRef.current` first. This is two writes to the same store from two paths and risks staleness if multiple `CARDS_UPDATED` events arrive between renders.

### R2. `cardCountByCategory` and `categoryStats` re-derived per `categories` change
**File:** `src/contexts/cards/CardStateProvider.tsx:386-406`.

These memos depend on `categories` (the array reference), but `categories` is itself a derived `useMemo` (`CategoryStateProvider:65`) — its reference changes whenever `categoryRecords` changes (renames, reorderings) even though the *id list* may be identical. Recommend memoizing `categories` by content (e.g. join hash) or moving aggregation off `categories` entirely.

### R3. Dialog open-state reset via `useEffect`
**Files:**
- `src/components/learn/MatrixFilterDialog.tsx:43-45` — reset filters on `open=true`.
- `src/components/category/CardViewDialogs.tsx:29-31` — reset `addMode` on `open`.
- `src/components/ExaminerProfileDialog.tsx:29-32` — reseed local state from `initialProfile` on `open`.
- `src/components/source-reader/SmartSplitSummaryDialog.tsx:207` — reset `cuttingIndex` on total change.

Pattern: derived/initial state syncing via effect. Idiomatic React replacement: `key={open ? 'a' : 'b'}` to remount dialog body, or move state into the open-trigger callback.

### R4. `DocxImporter` — `useState(categories[0] ?? "")`
**File:** `src/components/DocxImporter.tsx:47`.

Stale closure on initial render. If `categories` arrives async after first paint, the select stays empty. Use derived value with controlled fallback during render.

### R5. `MnemonicTest` resets timer state via effect cascade
**File:** `src/components/MnemonicTest.tsx:82-91`.

Multiple `setX` calls inside `useEffect` triggered by `timerActive` flag. Reads as a state machine; should be a `useReducer` or a single derived "timer phase" state.

### R6. `recordsRef.current = categoryRecords` written outside an effect
**File:** `src/contexts/cards/CategoryStateProvider.tsx:61-62`.

Direct assignment during render is allowed for refs but bypasses the explicit Ref-Delta contract used elsewhere. Marginal correctness risk under concurrent rendering — recommend `useEffect(() => { recordsRef.current = categoryRecords; }, [categoryRecords])` or document the deliberate exception in the file header.

---

## Summary table

| ID | Severity | Domain | Headline |
|----|----------|--------|----------|
| C1 | 🔴 | Persistence | 3 independent `Source[]` caches with divergent invalidation |
| C2 | 🔴 | Persistence | `MindMaps` loaded ad-hoc in 7 components, no central store |
| C3 | 🔴 | UI State | `editingCard` exists in context + ref + sessionStorage + URL |
| C4 | 🔴 | Card State | `cardMapRef` ↔ `cardMap` invariant enforced only by convention |
| W1 | 🟡 | Filters | `filterExamFrequent` parallel to `frequencyFilter` triple |
| W2 | 🟡 | Navigation | Learn `currentIndex` in state + sessionStorage |
| W3 | 🟡 | Domain Model | `examQuestions` first-class in store, never persisted |
| W4 | 🟡 | Local State | `dirty` flag synced via useEffect (one-way, never resets) |
| W5 | 🟡 | Persistence | CategoryView vs SubjectCardsView duplicate source fetching |
| W6 | 🟡 | Events | GlobalSearch invalidates on wrong event type |
| W7 | 🟡 | Routing | URL params snapshotted into local state, drift on navigation |
| R1-R6 | 🔵 | Various | Effect-driven derivations, init-from-props, refs-in-render |

---

## Recommended remediation order (when build mode resumes)

1. **C1 + C2 + W5 + W6** — introduce `SourcesProvider` and `MindMapsProvider` (mirroring `CardProvider`'s decomposition), expose `useSources(categoryId)` / `useMindMaps(categoryId)` hooks, route all writes through the provider, emit a single `RESOURCE_CHANGED` event-bus signal. Removes 4 caches and ~7 ad-hoc `useEffect+useState` pairs.
2. **C3** — change `EditPage` and `useEditReturn` to store *only* `cardId: string`, lookup the live `Card` from `cardMap` on render. Remove `editingCard: Card` from `UIContext`.
3. **C4** — collapse Ref-Delta by replacing `cardMapRef` with a Zustand store (already approved as Step A1 in earlier plan); ref and state become the same atom.
4. **W1 + W2** — finish the triple-frequency migration in Learn flow per the prior approved-then-postponed plan.
5. **W3** — decide ExamQuestions fate (Dexie table or pure session).
6. **R1–R6** — mechanical cleanups during the above touch-ups.

This report is read-only output. No files were modified.
