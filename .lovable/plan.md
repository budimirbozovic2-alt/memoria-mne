

# Analiza Electron builda — pronađeni problemi

## 1. `extraFiles` — `preload.cjs` destinacija je pogrešna (KRITIČAN)

**Fajl**: `package.json` L35-39

```json
"extraFiles": [
  { "from": "preload.cjs", "to": "preload.cjs" }
]
```

`extraFiles` sa `"to": "preload.cjs"` kopira fajl u **root direktorij aplikacije** (pored executable-a), ali `resolvePreloadPath` u `window.cjs` L12-13 traži `path.join(process.resourcesPath, 'preload.cjs')` kao prvi kandidat. `process.resourcesPath` pokazuje na `resources/` folder, ne na root. Dakle, prvi kandidat neće naći fajl — pada na drugi kandidat `path.join(baseDir, 'preload.cjs')`.

Problem: `baseDir` je `__dirname` iz `main.cjs`, koji je unutar `app.asar` (jer je `asar: true`). Znači i drugi kandidat pada jer `preload.cjs` nije u asar-u. Treći kandidat (`path.join(baseDir, '..', 'preload.cjs')`) bi trebao raditi jer izlazi iz asar-a u `resources/` — ali `extraFiles` ne kopira u `resources/`, nego u root aplikacije.

**Rezultat**: `preload.cjs` se **ne može naći** u pakovanom buildu → `contextBridge` se ne učitava → `window.electronAPI` je `undefined` → backup, window kontrole, i IPC ne rade.

**Fix**: Koristiti `extraResources` umjesto `extraFiles`, ili promijeniti `"to"` putanju:

```json
"extraResources": [
  { "from": "preload.cjs", "to": "preload.cjs" }
]
```

`extraResources` kopira u `resources/` folder, što je tačno `process.resourcesPath`.

---

## 2. `net` import nekorišten (MINOR)

**Fajl**: `main.cjs` L1

```js
const { app, session, ipcMain, protocol, net, dialog } = require('electron');
```

`net` se nigdje ne koristi. Nije greška, ali je nepotreban import.

---

## 3. `before-quit` handler — rekurzivni `app.quit()` (POTENCIJALAN)

**Fajl**: `main.cjs` L169-177

```js
app.on('before-quit', async (e) => {
  if (isQuitting) return;
  isQuitting = true;
  e.preventDefault();
  await backup.performBeforeQuitBackup();
  app.quit();  // ← ovo ponovo triggeruje 'before-quit'
});
```

Drugi poziv `app.quit()` ponovo emituje `before-quit`, ali `isQuitting` je `true` pa se preskače. Ovo radi korektno, ali zavisi od toga da `isQuitting` nije resetovan. Pošto je module-level varijabla bez reset logike, radi ispravno. **Nema buga**, ali je fragilan pattern.

---

## 4. `splash.html` — referenca na `logo-icon.png` relativna (MINOR)

**Fajl**: `public/splash.html` L86

```html
<img src="./logo-icon.png" ...>
```

Splash se učitava kroz `loadFile()`. U pakovanom buildu, `getPublicPath` vraća `path.join(baseDir, 'dist', 'splash.html')`, pa `./logo-icon.png` traži `dist/logo-icon.png`. Ako `logo-icon.png` nije u `dist/` nakon builda, slika neće biti vidljiva. Treba provjeriti da li je `logo-icon.png` u `public/` (Vite ga kopira u `dist/`) — ako jeste, onda je OK.

---

## 5. CSP blokira `blob:` URL-ove za audio (SREDNJI)

**Fajl**: `main.cjs` L148-149

```
connect-src 'self' app:;
```

Ambijentalni zvukovi koriste `AudioContext` sa `createBufferSource` (koji ne zahtijeva `connect-src`), ali ako bilo koji dio koda koristi `fetch()` za blob URL-ove ili external resurse, CSP će ih blokirati. Trenutno izgleda OK jer se zvuk generiše proceduralno, ali ako se doda streaming audio, trebaće `blob:` u `connect-src`.

Također, `media-src` nije definisan — ako se ikad doda `<audio>` ili `<video>` element, biće blokiran.

**Fix**: Dodati `blob:` u `connect-src` i `media-src 'self' blob: app:;` preventivno.

---

## 6. `window-is-maximized` — dvostruki `handle` crash pri recovery (ISPRAVLJENO)

U `window.cjs` L125, `ipcMain.handle('window-is-maximized', ...)` se poziva svaki put kad se kreira novi prozor (npr. crash recovery). Electron baca grešku ako se `handle` pozove dva puta za isti kanal. Ovo JE pokriveno `try { ipcMain.removeHandler(...) } catch (_) {}` na L192 i L241. **Nema buga** — već je fixano.

---

## 7. `reviewLog` nedostaje u backup output (POTENCIJALAN)

**Fajl**: `src/main.tsx` L139-147

Backup data uključuje `cards, categories, sources, mindMaps, diary, calibrationLog, latencyLog, slippageLog, activityLog, disciplineLog, pomodoroLog` — ali `reviewLog` se čita na L93 a **ne uključuje** u output objekat na L139-147.

```js
const data = {
  version: 5, type: "full",
  cards, categories: categories, subcategories,
  sources, mindMaps, diary, calibrationLog, latencyLog,
  slippageLog, activityLog, disciplineLog, pomodoroLog,
  localStorageData,
};
```

**`reviewLog` NEDOSTAJE!** Ovo znači da Electron auto-backup ne čuva istoriju ponavljanja — kritičan gubitak podataka.

---

## Sažetak

| # | Problem | Ozbiljnost | Fix |
|---|---------|------------|-----|
| 1 | `preload.cjs` putanja — `extraFiles` vs `extraResources` | KRITIČAN | `extraResources` u package.json |
| 7 | `reviewLog` nedostaje u Electron backup | KRITIČAN | Dodati u data objekat |
| 5 | CSP ne dozvoljava `blob:` i `media-src` | SREDNJI | Proširiti CSP string |
| 2 | Nekorišten `net` import | NIZAK | Ukloniti |
| 4 | `logo-icon.png` u splash | NIZAK | Provjeriti da je u public/ |

## Predloženi fix

### Fajl 1: `package.json`
- Zamijeniti `extraFiles` sa `extraResources` za `preload.cjs`

### Fajl 2: `src/main.tsx`
- Dodati `reviewLog` u backup data objekat (L139)

### Fajl 3: `main.cjs`
- Ukloniti `net` iz importa
- Dodati `blob:` u `connect-src` i `media-src 'self' blob: app:;` u CSP

### Scope
- 3 fajla, ~5 linija neto promjena
- Backward-compatible

