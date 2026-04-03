

# Fix: Window kontrole, Diamond handle-ovi, i unos opisa u čvorovima

## Analiza 3 problema

### 1. Dugmad Minimize/Maximize/Close — NE BUG, očekivano ponašanje

Ova dugmad koriste `window.electronAPI` koje postoji **samo u Electron desktop aplikaciji**. U web preview-u (`lovable.app`), `electronAPI` je `undefined` i dugmad su namjerno no-op. Ovo je dokumentovano i po dizajnu — funkcionišu samo kad se aplikacija pokrene kao Electron desktop app.

**Akcija**: Nema promjene koda. Ovo je ograničenje web okruženja.

---

### 2. Diamond čvorovi — handle-ovi blokirani rotiranim pozadinskim divom

**Problem**: Rotirani pozadinski div (L135-142) nema `pointer-events-none`, pa presreće klikove na handle-ove koji su ispod njega. Handle-ovi na Top i Left su djelimično ili potpuno blokirani.

**Fix**: Dodati `pointer-events-none` na rotirani pozadinski div.

| Fajl | Promjena |
|------|----------|
| `MindMapNode.tsx` L135-142 | Dodati `pointer-events-none` klasu na rotirani div |

---

### 3. Opis čvora se zatvara kad se klikne — `editing` state race condition

**Problem**: Kad se double-click aktivira `editing=true`:
1. Label `<input autoFocus>` dobije fokus
2. Description `<textarea>` se prikaže ispod
3. Korisnik klikne textarea → label input gubi fokus → `onBlur` poziva `setEditing(false)` → textarea nestaje

**Fix**: Razdvojiti na dva stanja: `editingLabel` i `editingDesc`. Label onBlur ne zatvara description, i obrnuto. Alternativno (jednostavnije): koristiti `setTimeout` + `relatedTarget` check u onBlur da ne zatvori editing ako fokus ostaje unutar čvora.

Najčistiji pristup: umjesto jednog `editing` boolean-a, koristiti ref na wrapper div i provjeriti da li `relatedTarget` ostaje unutar njega:

```ts
const nodeRef = useRef<HTMLDivElement>(null);

// U onBlur label inputa:
onBlur={(e) => {
  // Ako fokus ostaje unutar čvora, ne zatvori editing
  if (nodeRef.current?.contains(e.relatedTarget as Node)) {
    updateField("label", e.target.value);
    return;
  }
  updateField("label", e.target.value);
  setEditing(false);
}}
```

Isti pattern za textarea onBlur — ne zatvori editing ako fokus ide na label input.

Dodatno: dodati description textarea i za **diamond** čvorove (trenutno nemaju).

| Fajl | Promjena |
|------|----------|
| `MindMapNode.tsx` L55-248 | Dodati `nodeRef`, ažurirati onBlur logiku za label i textarea, dodati description za diamond |

---

## Scope
- 1 fajl: `MindMapNode.tsx`
- ~20 linija promjena
- Fiksira 2 od 3 prijavljena problema (treći je po dizajnu)

