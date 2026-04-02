

# Fix: db.ts reload race condition (K4)

## Problem

Dva nezavisna mehanizma mogu triggerovati `window.location.reload()` istovremeno:

1. **`setInterval` (L201-211)** — svake 2s provjerava `dbErrorState?.type === "timeout"` i ako je samo 1 tab, poziva `reload()` nakon 1s delay-a
2. **`setTimeout` 30s (L258-263)** — jednokratni timer koji također poziva `reload()` ako je `dbErrorState` još timeout

Nijedan ne čisti drugi, pa oba mogu aktivirati reload. Interval se nikad ne čisti — radi zauvijek čak i kad nema greške.

## Rješenje

**A) Interval dobija ID i čisti se čim obavi posao ili kad greške nema:**
- Sačuvati `setInterval` povratnu vrijednost u varijablu
- Unutar intervala: nakon što emituje `DB_UNBLOCKED` i pozove reload, odmah `clearInterval`
- Dodati guard: ako `dbErrorState` je `null`, skip (ne radi ništa)

**B) 30s timeout dobija guard flag:**
- Dodati modul-level `let reloadScheduled = false`
- Oba mjesta (interval L208 i timeout L261) provjeravaju `if (reloadScheduled) return` prije reload-a
- Prvo koje prođe setuje `reloadScheduled = true`

### Promjene u `src/lib/db.ts`

```ts
// L200: Dodati guard varijablu
let reloadScheduled = false;
let unblockIntervalId: ReturnType<typeof setInterval> | null = null;

// L201-211: Interval sa cleanup-om
unblockIntervalId = setInterval(() => {
  if (!dbErrorState) return; // nema greške, skip
  if (dbErrorState.type === "timeout" && eventBus.getTabCount() <= 1) {
    console.log("[MemoriaDB] Only one tab remains, clearing blocked state...");
    dbErrorState = null;
    eventBus.emit(EVENT_TYPES.DB_UNBLOCKED);
    if (!reloadScheduled) {
      reloadScheduled = true;
      setTimeout(() => window.location.reload(), 1000);
    }
    clearInterval(unblockIntervalId!);
    unblockIntervalId = null;
  }
}, 2000);

// L258-263: 30s timeout sa istim guardom
setTimeout(() => {
  if (dbErrorState?.type === "timeout" && !reloadScheduled) {
    reloadScheduled = true;
    console.log("[MemoriaDB] Blocked timeout (30s), reloading...");
    window.location.reload();
  }
}, 30000);
```

## Scope
- 1 fajl: `src/lib/db.ts`, ~15 linija
- Nema novih zavisnosti
- Nema promjene ponašanja u normalnom toku — samo eliminacija duplog reload-a

