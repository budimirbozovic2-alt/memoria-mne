

## Plan: Dijagnostika i popravka Electron boot problema

### Nalaz
Boot tracing potvrdjuje da **web preview radi savrseno** (4.2s boot). Problem je iskljucivo u **Electron desktop buildu**. Splash-phase label vec radi i prikazuje fazu — kad se izgradi Electron verzija, vidjecemo tacno gdje staje.

### Najvjerovatniji uzroci u Electron buildu

1. **Vite build asset paths** — iako je `base: './'` postavljen, mozda neki asset (font, ikona) ili chunk nije pronadjen pod `file://` protokolom
2. **JS chunk loading failure** — `import("./App")` u production buildu postaje `import("./assets/App-HASH.js")` i ako path resolution ne radi pod `file://`, zastaje bez greske
3. **IndexedDB ogranicenja** — neki Electron konfiguracije blokiraju IndexedDB

### Koraci

1. **Dodati inline boot tracing u `index.html`** — cisto JavaScript logovanje PRIJE ucitavanja ijednog modula, direktno u HTML-u, da vidimo da li se `<script type="module">` uopste izvrsava u Electronu

2. **Izgraditi novu Electron verziju** sa boot tracingom i testirati

3. **Na osnovu rezultata** — ciljana popravka (asset paths, chunk loading, db fallback)

### Tehnicko objasnjenje

Problem: u production Electron buildu, Vite generise chunk fajlove sa hash imenima. `import("./App")` se transpajluje u nesto poput:
```
import("./assets/App-abc123.js")
```
Pod `file://` protokolom, dinamicki importi ponekad ne rade ako `<base>` tag ili document URL nije pravilno postavljen. Rjesenje je dodati `<script>` tag u `index.html` koji loguje PRIJE modula, i provjeriti da li se modul uopste ucitava.

### Konkretne izmjene

**index.html** — dodati inline `<script>` (ne module!) prije module scripta:
```html
<script>
  window.__htmlBoot = Date.now();
  console.log("[html-boot] inline script executed");
</script>
```

**main.cjs (Electron main process)** — dodati DevTools otvaranje u development modu da vidimo console greske iz renderera

**Rebuild** — `vite build` + `@electron/packager` sa novim kodom

