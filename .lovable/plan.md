

# Revizija Ready Guard zaštite — Nalaz

## Status po fajlu

| Fajl | `ready` guard | `bumpMapVersion()` | Session start guard | Verdict |
|------|--------------|-------------------|-------------------|---------|
| `useCardBootstrap.ts` | ✅ `setReady(true)` u `finally` (L215) | ✅ `bumpMapVersion()` (L200) | N/A | **OK** |
| `LearnPage.tsx` | ✅ `if (!ready)` loader (L45-52) | N/A | ✅ `if (ready)` u useEffect (L14), dep `[ready]` | **OK** |
| `ReviewPage.tsx` | ✅ `if (!ready)` loader (L71-78) | N/A | ✅ `if (ready)` u useEffect (L18), dep `[ready]` | **OK** |
| `DashboardPage.tsx` | ❌ **NEDOSTAJE** | N/A | N/A | **TREBA FIX** |
| `StatsPage.tsx` | ❌ **NEDOSTAJE** | N/A | N/A | **TREBA FIX** |

## Problem

`DashboardPage.tsx` i `StatsPage.tsx` ne čekaju `ready` — odmah renderuju `cards.length === 0` check, što prikazuje "EmptyState" na pola sekunde dok se IDB učitava.

## Plan

### 1. `src/views/DashboardPage.tsx`
- Dodati `ready` iz `useCardContext()`
- Dodati early return loader prije glavnog renderovanja:
```tsx
if (!ready) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Učitavanje kontrolne table...</p>
    </div>
  );
}
```

### 2. `src/views/StatsPage.tsx`
- Dodati `ready` iz `useCardContext()`
- Dodati isti loader pattern

### Šta se NE mijenja
- `useCardBootstrap.ts` — sve zaštite prisutne (`bumpMapVersion`, panic timer, `setReady` u finally)
- `LearnPage.tsx` — guard i session start zaštita prisutni
- `ReviewPage.tsx` — guard i session start zaštita prisutni
- UI dizajn postojećih loadera — netaknut

## Scope
- 2 fajla, ~10 linija dodano

