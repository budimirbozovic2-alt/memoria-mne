## Problem

`src/main.tsx` quit-backup handler trenutno radi:
1. `buildBackupData()` čita IDB direktno (`db.cards.toArray()`, itd.)
2. Šalje JSON u `requestBackup`
3. `notifyQuitBackupDone()`

**Bug:** Persist queue (`src/lib/persist-queue.ts`) bafera akcije kroz 16ms `setTimeout` prije pisanja u IDB. Ako korisnik zatvori aplikaciju u tom prozoru, akcije ostaju u memoriji — `buildBackupData()` ih ne vidi i backup je nepotpun.

`useCards` već flush-uje queue za **svoj** `onQuitBackupRequested` listener (`persistQueue.cleanup()` u `src/hooks/useCards.ts`), ali oba listenera se izvršavaju paralelno — handler u `main.tsx` može pročitati IDB **prije** nego `useCards` završi cleanup.

## Fix

U `src/main.tsx` (linije 157–171) pozvati `await persistQueue.flush()` **prije** `buildBackupData()`, sve unutar iste 5s race granice, a `notifyQuitBackupDone()` ostaje u `finally` (bezuslovno otpušta lock i kad istekne timeout).

```ts
const cleanupQuit = api.onQuitBackupRequested?.(async () => {
  try {
    const { persistQueue } = await import("@/lib/persist-queue");
    await Promise.race([
      (async () => {
        await persistQueue.flush();        // ← novo: drain queue
        const json = await buildBackupData();
        await window.electronAPI!.requestBackup(json);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("quit-backup-timeout")), 5000)
      ),
    ]);
  } catch (err) {
    console.error("[quit-backup] failed, releasing lock:", err);
  } finally {
    api.notifyQuitBackupDone?.();
  }
});
```

### Šta se mijenja
- Lazy `import("@/lib/persist-queue")` (konzistentno sa `SessionContext.tsx:107`).
- `buildBackupData()` se izvršava tek nakon `flush()`.
- 5s timeout sada pokriva i flush i build i write — ako je sve troje preko granice, lock se i dalje otpušta u `finally`.

## Tehnički detalji

- `persistQueue.flush()` je već javan API (`src/lib/persist-queue.ts:101`). Bezbjedno se može zvati paralelno sa `useCards` cleanup-om — interni `flush` ne drži lock, samo isprazni `pending` array; drugi paralelni poziv jednostavno vidi prazan red.
- **Zašto `flush` a ne `cleanup`:** `cleanup` dodatno postavlja `sessionStorage["codex-flush-pending"]` flag namijenjen interrupted-flush detekciji pri sljedećem boot-u — to nam ovdje ne treba (uspješan quit-backup ne signalizuje crash).
- **Bez race-a sa `useCards`:** oba handlera mogu drain-ovati queue; drugi vidi prazno i prođe momentalno.

## Out of scope

- Ne mijenja se `electron/backup.cjs` (main proces) — IPC kontrakt ostaje isti.
- Ne mijenja se `useCards` listener — i dalje radi `persistQueue.cleanup()` kao safety net.
- Ne mijenja se 5s timeout vrijednost.
