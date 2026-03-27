

# Critical Foundation Fix: Audit v3 Phase 1

## Task 1: Fix C1 — `getStorageUsage()` (storage.ts)

**Problem**: Reads stale localStorage keys that are now empty post-migration. Reports ~0% usage.

**Fix**: Make `getStorageUsage()` async. Use `navigator.storage.estimate()` (returns `{usage, quota}`) which covers IndexedDB. Fall back to a rough Dexie table count if `estimate()` is unavailable.

**Callers to update**:
- `src/hooks/useDashboardData.ts:125` — `useDeferredCompute` callback becomes async (it already supports promises)
- `src/components/HealthMonitor.tsx:65` — wrap in `.then()` or make the refresh callback async

**Changes**:
```ts
// storage.ts
export async function getStorageUsage(): Promise<{usedBytes: number; maxBytes: number; percent: number}> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const max = est.quota ?? 500 * 1024 * 1024;
    return { usedBytes: used, maxBytes: max, percent: Math.round((used / max) * 100) };
  }
  // Fallback: count IDB records as rough estimate
  return { usedBytes: 0, maxBytes: 0, percent: 0 };
}
```

---

## Task 2: Fix C2 — Import overwrite for `++id` tables (useCardImport.ts)

**Problem**: Lines 159-163 — for `++id` tables (reviewLog, pomodoroLog, calibrationLog, etc.), imported records have `id` fields from the source DB. On `bulkPut`, Dexie assigns NEW auto-increment IDs. The cleanup then compares imported `r.id` values against new keys — they never match, so ALL existing records get deleted.

**Fix**: For "overwrite" strategy on `++id` tables, use `table.clear()` before `bulkPut` instead of the ID-comparison cleanup. This is semantically correct: "overwrite" means "replace all data with imported data."

Separate `idbTables` into two lists:
- UUID-keyed tables (`diary`) — keep current ID-comparison logic
- Auto-increment tables (all others) — use `clear()` + `bulkAdd` for overwrite

---

## Task 3: Fix C3 — Pomodoro to IDB (storage.ts + callers)

**Problem**: `addPomodoroEntry()` writes to localStorage, but backup reads from `db.pomodoroLog` (IDB). Data never syncs.

**Fix**:
- **storage.ts**: Rewrite `addPomodoroEntry()` to write to `db.pomodoroLog` instead of localStorage. Make it async.
- **storage.ts**: Rewrite `getPomodoroStats()` to read from `db.pomodoroLog`. Make it async.
- **ZenMode.tsx**: Update calls to await `addPomodoroEntry()` and `getPomodoroStats()`.
- **AppContext.tsx**: Update call to await `addPomodoroEntry()`.

```ts
// storage.ts
export async function addPomodoroEntry(entry: PomodoroLogEntry): Promise<void> {
  const { db } = await import("@/lib/db");
  await db.pomodoroLog.add(entry);
}

export async function getPomodoroStats(): Promise<{...}> {
  const { db } = await import("@/lib/db");
  const log = await db.pomodoroLog.toArray();
  // ... same math, same return shape
}
```

---

## Task 4: Fix C4 — TTS listener leak (SpeedReader.tsx)

**Problem**: Line 142 — `window.speechSynthesis.onvoiceschanged = load` overwrites any existing handler and can be clobbered by other instances.

**Fix**: Replace with `addEventListener`/`removeEventListener`:
```ts
useEffect(() => {
  if (!("speechSynthesis" in window)) return;
  const load = () => { const v = window.speechSynthesis.getVoices(); if (v.length) setVoices(v); };
  load();
  window.speechSynthesis.addEventListener("voiceschanged", load);
  return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); };
}, []);
```

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/storage.ts` | Make `getStorageUsage` async (use `navigator.storage.estimate`); rewrite `addPomodoroEntry` + `getPomodoroStats` to use IDB |
| `src/hooks/useDashboardData.ts` | Update `getStorageUsage()` call to handle async |
| `src/components/HealthMonitor.tsx` | Update `getStorageUsage()` call to handle async |
| `src/hooks/useCardImport.ts` | Fix `++id` overwrite: use `clear()` + `bulkAdd` for auto-increment tables |
| `src/components/SpeedReader.tsx` | Replace `onvoiceschanged =` with `addEventListener` |
| `src/components/ZenMode.tsx` | Await async `addPomodoroEntry` / `getPomodoroStats` |
| `src/contexts/AppContext.tsx` | Await async `addPomodoroEntry` |

## Guardrails
- No UI changes
- No FSRS math changes
- No DnD-kit changes

