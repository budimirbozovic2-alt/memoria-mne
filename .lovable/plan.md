

## Plan: Popravka listener cleanup-a u preload.cjs

### Problem
`preload.cjs` koristi `removeAllListeners()` na linijama 16 i 21 za `backup-requested` i `quit-backup-requested` evente. Ovo briše SVE pretplate na te evente, ne samo onu koju je komponenta registrovala.

### Izmjena
Jedan fajl: `preload.cjs`

Zamijeniti `removeAllListeners` pattern sa specifičnim `removeListener` koji čuva referencu na wrapper funkciju:

```javascript
onBackupRequested: (callback) => {
  const handler = () => callback();
  ipcRenderer.on('backup-requested', handler);
  return () => ipcRenderer.removeListener('backup-requested', handler);
},
onQuitBackupRequested: (callback) => {
  const handler = () => callback();
  ipcRenderer.on('quit-backup-requested', handler);
  return () => ipcRenderer.removeListener('quit-backup-requested', handler);
},
```

### Ostali predlozi iz dokumenta — zašto ih ne implementirati

| Predlog | Status | Razlog |
|---------|--------|--------|
| Async `writeBackup` | Nepotrebno | Main process nema UI, sync write ne blokira ništa vidljivo |
| `require` na vrhu fajla | Već urađeno | `window.cjs` ima require na vrhu |
| Retry limit za load | Već postoji | `did-fail-load` handler + crash recovery sa 3/60s limitom |
| Named listener cleanup | Već postoji | `showWindow` je imenovana funkcija u `window.cjs` |
| 5 backupa umjesto 3 | Opciono | Stvar preference, ne utiče na stabilnost |

### Obim
- 1 fajl, ~6 linija izmjena
- Nulti rizik regresije

