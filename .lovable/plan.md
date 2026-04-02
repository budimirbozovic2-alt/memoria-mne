

# Sljedeće stavke iz deep audita

## 1. Uklanjanje duplog ready timera (K2)

**Problem**: Dva nezavisna timera forsiraju "ready" stanje:
- `useCardBootstrap.ts` L46: **8s panic timer** — setuje `ready=true` i uklanja splash
- `useCards.ts` L54-64: **5s forceReady timer** — setuje zasebni `forceReady` state

5s timer okida prvi, ali bootstrap već ima robusniji 8s timer sa splash cleanup-om. `forceReady` u useCards je suvišan — dodaje kompleksnost bez koristi.

**Rješenje**: Obrisati `forceReady` state i useEffect iz `useCards.ts` (L53-64). Koristiti samo `bootstrapReady` direktno:
```ts
const ready = bootstrapReady;
```

| Fajl | Promjena |
|------|----------|
| `src/hooks/useCards.ts` L53-64 | Obrisati forceReady state, useEffect i || operator |

---

## 2. Migracija LearnProgress iz localStorage u IDB (K3)

**Problem**: `loadLearnProgress()` i `saveLearnProgress()` u `storage.ts` još koriste `localStorage`, dok je sve ostalo migrirano na IndexedDB. Ovo je nekonzistentno i podložno gubitku podataka (localStorage se čisti nezavisno od IDB).

**Rješenje**: Dodati `learnProgress` tabelu u IDB i ažurirati funkcije.

| Fajl | Promjena |
|------|----------|
| `src/lib/db.ts` | Dodati `learnProgress` store u Dexie šemu (key: `cardId`) |
| `src/lib/storage.ts` | Promijeniti `loadLearnProgress` i `saveLearnProgress` da koriste IDB sa localStorage fallback-om za migraciju |
| `src/components/LearnSession.tsx` | Ažurirati na async load (useEffect + useState) |

---

## 3. Migracija LastBackupTime iz localStorage u IDB (K3b)

**Problem**: `getLastBackupTime()` i `setLastBackupTime()` takođe koriste localStorage.

**Rješenje**: Koristiti postojeći `idbSaveSettings`/`idbLoadSettings` mehanizam u db.ts — isti pristup kao za `srSettings`.

| Fajl | Promjena |
|------|----------|
| `src/lib/storage.ts` | Promijeniti `getLastBackupTime` → async, čita iz IDB settings sa localStorage fallback |
| `src/lib/storage.ts` | Promijeniti `setLastBackupTime` → async, piše u IDB |
| `src/hooks/useDashboardData.ts` | Ažurirati pozive na async verziju |
| `src/hooks/useCardExport.ts` | Ažurirati poziv na async verziju |

---

## Scope
- 5 fajlova, ~40 linija promjena
- Nema novih vanjskih zavisnosti
- FSRS: netaknut
- Potpuno backward-kompatibilno (localStorage se čita kao fallback tokom migracije)

