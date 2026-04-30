## Goal

Replace the fixed 800ms debounce for wiki-link auto-creation in `ZettelkastenView` with an **adaptive debounce (300–1000ms)** that adjusts based on:
1. **Typing velocity** — fast typing waits longer, idle/slow typing fires sooner.
2. **Unresolved link count** — more new `[[links]]` queued = wait longer to batch them into one transaction.

This keeps the IDB write rate low during bursts while still feeling responsive when the user pauses or only adds one link.

---

## Files Touched

- **edited** `src/views/ZettelkastenView.tsx` — replace the fixed-delay `setTimeout` block (lines 161–187) with an adaptive scheduler.

No new files. No API changes to `zettelkasten-storage.ts`.

---

## Design

### Inputs to the adaptive delay

Tracked via refs (no re-renders):

- `lastKeystrokeAtRef: number` — timestamp of the most recent `draft.content` change.
- `lastIntervalRef: number` — ms between the two most recent content changes (typing cadence proxy).

Derived per scheduling pass:

- `velocityFactor` — short interval (<120ms between keystrokes) → fast typing → bias toward upper bound. Long interval (>400ms) → idle → bias toward lower bound.
- `pendingCount` — number of `[[wiki]]` candidates not yet in `existingTitleSet`. Larger batches → longer delay (let them accumulate for a single transaction).

### Formula

```text
BASE_MIN = 300
BASE_MAX = 1000

velocityWeight = clamp((lastInterval ms in [120..400]) inverted to [0..1])
   // <=120ms => 1.0 (fast),  >=400ms => 0.0 (idle)

batchWeight = clamp(pendingCount / 8, 0, 1)
   // 0 candidates => 0, 8+ => 1

weight = max(velocityWeight, batchWeight)   // either signal can extend the wait
delay  = BASE_MIN + (BASE_MAX - BASE_MIN) * weight
```

Rationale:
- Single keystroke after a pause with one new link → ~300ms (snappy).
- Continuous typing → ~900–1000ms (avoid mid-burst transactions).
- Pasting a chunk with many new links → upper bound regardless of cadence.

### Scheduler shape

The current `useEffect` runs on every `draft.content` change. We keep that but:

1. Update `lastIntervalRef` and `lastKeystrokeAtRef` synchronously at the top.
2. Compute `pendingCount` cheaply by regex-matching content and filtering against `existingTitleSet` (already memoized).
3. If `pendingCount === 0`, **skip scheduling entirely** (no timer churn).
4. Otherwise compute `delay` via the formula and `setTimeout(..., delay)`.
5. Cleanup clears the timer as today.

The async body inside the timeout is unchanged — still calls `bulkCreateArticlesIfMissing` inside the existing single Dexie `rw` transaction, still updates `articles` state and toasts on creation.

### Safety / correctness

- Refs reset when `activeId` changes (piggyback on existing flush effect at line 150) so switching articles starts a fresh cadence measurement.
- Bounds are hard-clamped (`Math.min/Math.max`) so the delay can never escape `[300, 1000]`.
- When `isEditing` flips off, the cleanup clears any pending timer — no orphan transactions.
- Re-uses existing `existingTitleSet` memo, so no extra per-keystroke allocations beyond the regex (already done today).

---

## Out of Scope

- No change to `bulkCreateArticlesIfMissing` (already optimal: single tx + bulkPut).
- No change to `BacklinksPanel` (already gated by `isEditing` + `useDeferredValue`).
- No new user-facing setting; the heuristic is internal. Can be promoted to a setting later if needed.

---

## Verification

- Type a paragraph fast with no new `[[links]]` → no timers scheduled, zero IDB writes.
- Type one new `[[Foo]]` then pause → placeholder appears ~300–400ms after the pause.
- Paste a block with 5+ new `[[links]]` → single transaction fires near the 1000ms ceiling, one toast.
- Switch articles mid-typing → no orphan placeholders created against the previous article (timer cleared on effect cleanup).
