

# Critical Bug Fixes — Round 1

## Fix 1: TTS Race Condition (`SpeedReader.tsx:305`)
**Problem**: Cleanup function is `return () => {}` — a no-op. Rapid play/pause leaves parallel speech chains.
**Fix**: Replace with proper cleanup that calls `window.speechSynthesis.cancel()`, sets `ttsPlayingRef.current = false`, and clears `ttsTimeoutRef.current`.

## Fix 2: Stale Retention Cache (`useCardAnnotations.ts:19`)
**Problem**: `cachedRetentionRef` captures `targetRetention` once on mount, never updates.
**Fix**: Remove the `useRef`. Inside `reviewSection`, call `loadAppSettings().targetRetention` directly each time. This is a synchronous localStorage read — negligible cost per review.

## Fix 3: Unsafe `any` in Saved Session (`ReviewSession.tsx:18`)
**Problem**: `savedSession` is `useState<any>(null)` — no validation on parsed JSON.
**Fix**:
- Define `interface SavedSessionState { mode: ReviewMode; randomIndex: number; timestamp: number }`
- Type state as `SavedSessionState | null`
- Add guard: validate `parsed.timestamp` is a finite number before accepting

## Fix 4: Residual `as any` in db.ts (lines 352, 366)
**Problem**: `(err as any)?.inner?.name` bypasses type safety.
**Fix**: Replace with a helper check:
```ts
function hasInnerQuotaError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "inner" in err &&
    typeof (err as Record<string, unknown>).inner === "object" &&
    ((err as Record<string, Record<string, unknown>>).inner)?.name === "QuotaExceededError";
}
```
Use this in both `idbPutCard` and `idbBulkPutCards`.

## Files changed
| File | Change |
|------|--------|
| `src/components/SpeedReader.tsx` | Replace no-op cleanup in TTS natural mode effect |
| `src/hooks/useCardAnnotations.ts` | Remove `cachedRetentionRef`, read settings live in `reviewSection` |
| `src/components/ReviewSession.tsx` | Add `SavedSessionState` interface, type state, add timestamp guard |
| `src/lib/db.ts` | Add `hasInnerQuotaError` helper, remove `as any` from both catch blocks |

