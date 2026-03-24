

## Dijagnoza: Bijeli ekran u preview-u

### Uzrok pronađen

Problem je u `src/main.tsx`, linije 34-43. Globalni error handleri `window.onerror` i `window.onunhandledrejection` pozivaju `showFatalBootError()` koja radi **`root.innerHTML = ...`** — ovo potpuno briše React stablo iz DOM-a.

Ovi handleri su registrovani pri startu i **nikad se ne uklanjaju**. To znači da bilo koja neuhvaćena greška ili odbijeni Promise tokom normalnog rada aplikacije (ne samo pri bootu) — npr. mrežni timeout, IndexedDB kvota, neuspjeli lazy import — triggeruje `showFatalBootError`, koji zamijeni cijeli `#root` sadržaj sa statičnim HTML-om greške. Ako je poruka greške kratka ili prazna, rezultat može izgledati kao bijeli ekran.

**Zašto se ovo ranije nije dešavalo**: ovi handleri su dodani nedavno kao dio boot dijagnostike. Prije toga, neuhvaćene greške nisu uništavale React stablo.

### Plan popravke

**Jedna izmjena u `src/main.tsx`**: Nakon uspješnog React renderovanja, ukloniti destruktivne globalne handlere ili ih zamijeniti benignim verzijama.

```typescript
// Nakon linije 67 (markBootStep("main:react-render-done"))
// Ukloniti destruktivne boot handlere — React ErrorBoundary preuzima odgovornost
window.onerror = null;
window.onunhandledrejection = null;
```

Alternativno (bolje), zamijeniti ih sa handlerima koji samo loguju ali ne diraju DOM:

```typescript
window.onerror = (_msg, _src, _ln, _col, err) => {
  console.error("[runtime] uncaught error", err || _msg);
};
window.onunhandledrejection = (event) => {
  console.error("[runtime] unhandled rejection", event.reason);
};
```

### Tehnički detalji

- `showFatalBootError` na liniji 13 radi `root.innerHTML = ...` što uništava React Virtual DOM stablo
- ErrorBoundary komponenta već postoji i hvata runtime greške unutar React stabla
- Jedini scenario kad `showFatalBootError` treba biti aktivan je **prije** `createRoot().render()` poziva
- Nakon renderovanja, React ErrorBoundary preuzima kontrolu nad greškama

### Obim izmjene

Samo `src/main.tsx` — dodati 4-5 linija nakon uspješnog renderovanja.

