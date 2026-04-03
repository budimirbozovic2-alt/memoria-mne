
# Fix: desktop window kontrole + stabilan unos opisa u svim čvorovima

## Šta sam utvrdio
- Diamond handle fix je već prisutan u `MindMapNode.tsx`, tako da je preostali problem sa unosom opisa odvojen od toga.
- Najvjerovatniji uzrok nefunkcionalnih Minimize/Maximize/Close dugmadi u desktop buildu je preload putanja: `BrowserWindow` trenutno koristi `path.join(baseDir, "preload.cjs")`, dok `package.json` pakuje `preload.cjs` kroz `extraFiles`, tj. van `app.asar`. To može dovesti do toga da `window.electronAPI` bude `undefined` baš u desktop paketu, pa TitleBar dugmad postanu tihi no-op.
- Problem sa unosom opisa zaista nije samo diamond-specifičan: trenutni `relatedTarget` + `onBlur` pristup je krhak u ReactFlow/Electron okruženju i zatvara edit mod čim fokus ode sa label inputa, čak i kad korisnik klikne u textarea unutar istog čvora.

## Plan implementacije
1. `electron/window.cjs`
   - Uvesti `resolvePreloadPath()` helper.
   - U dev modu koristiti lokalni `preload.cjs`.
   - U packaged desktop buildu prvo tražiti `process.resourcesPath/preload.cjs`, pa tek onda fallback putanje.
   - Ako preload nije nađen, zapisati jasan log radi lakšeg debug-a.

2. `src/components/TitleBar.tsx`
   - Zadržati postojeći izgled.
   - Dodati eksplicitni `WebkitAppRegion: "no-drag"` i na same button elemente, ne samo na wrapper.
   - Uvesti `canControlWindow` guard da komponenta jasno radi samo kad je Electron API stvarno dostupan, umjesto tihog no-op ponašanja.

3. `src/components/mindmap/MindMapNode.tsx`
   - Zamijeniti blur-driven edit logiku node-level edit sesijom.
   - Prebaciti label i description na lokalni draft state (`value`, ne `defaultValue`).
   - Edit mod zatvarati tek na klik/fokus van čvora ili eksplicitnu potvrdu, ne na svaki blur pojedinačnog polja.
   - Dodati `onPointerDown`/`onMouseDown` + `stopPropagation` na input/textarea kako ReactFlow ne bi presretao interakciju.
   - Primijeniti isti model na rectangle, rounded i diamond čvorove; group branch dobija `ref={nodeRef}` radi konzistentnog focus/outside-click ponašanja.

## Tehnički detalji
- Ovo rješava desktop problem na pravom mjestu: vraća `window.electronAPI` u packaged Electron okruženju, pa prorade i ostale native funkcije vezane za preload.
- Za unos teksta, fokus više neće zavisiti od `relatedTarget`, koji se u Electron/ReactFlow kombinaciji pokazao nepouzdanim.
- Commit izmjena će biti stabilniji jer će se `label` i `description` snimati iz jedne edit sesije umjesto kroz međusobno konfliktne `onBlur` evente.

## QA
- U Electron desktop aplikaciji provjeriti: minimize, maximize/restore i close.
- Usput otvoriti jedan native file dialog da potvrdimo da je preload zaista učitan.
- U mapi uma testirati rectangle, rounded i diamond:
  - dupli klik
  - klik u opis
  - normalan unos teksta
  - prebacivanje fokusa između naslova i opisa
  - klik van čvora i provjera da je sadržaj sačuvan

## Scope
- 3 fajla:
  - `electron/window.cjs`
  - `src/components/TitleBar.tsx`
  - `src/components/mindmap/MindMapNode.tsx`
- Nema promjene šire arhitekture, samo ciljane ispravke za 2 potvrđena problema.
