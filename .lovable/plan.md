

# Fix: Mentalne mape — veze, strelice, handle-ovi, opis čvorova

## Problemi

1. **Veze nevidljive nakon kreiranja** — `defaultEdgeOptions` nema `style` sa bojom stroka. Veza se kreira ali je vizuelno nevidljiva dok korisnik ne otvori Edge Settings i promijeni boju/stil.
2. **Strelica samo u jednom pravcu** — koristi se samo `markerEnd`. Korisnik očekuje strelice na oba kraja (ili bar opciju).
3. **Specijalni čvorovi (diamond, group) ne primaju veze** — svi handle-ovi su `type="source"`, nema `type="target"`. `ConnectionMode.Loose` dozvoljava source→source konekcije, ali ReactFlow ipak zahtijeva bar jedan target handle na čvoru da bi se mogao koristiti kao destinacija u standardnom toku.
4. **Unos teksta u opis ne radi** — ReactFlow presreće tastaturne događaje (Delete, Backspace, itd.) prije nego što stignu do `<input>` i `<textarea>` unutar čvorova. Nedostaje `stopPropagation` na svim input elementima.

---

## Promjene po fajlovima

### 1. `src/components/mindmap/MindMapNode.tsx`

**A) Handle-ovi: dodati target handle-ove**

Trenutno (L73-79): svi handle-ovi su `type="source"`. Dodati 4 dodatna `type="target"` handle-a na suprotnim pozicijama. Ili — jednostavnije — promijeniti 2 od 4 postojeća na `type="target"` (Top i Left = target, Bottom i Right = source). Ovo je intuitivnije: veze idu odozgo-nadolje ili lijevo-desno.

```
Top    → target
Right  → source
Bottom → source
Left   → target
```

Ovo omogućava prirodno spajanje: izvor (bottom/right) → destinacija (top/left) za sve oblike čvorova uključujući diamond i group.

**B) Keyboard events: stopPropagation na svim input/textarea elementima**

Dodati `onKeyDown={(e) => e.stopPropagation()}` na:
- Label input u standard node (L202-207)
- Description textarea (L219-226)
- Label input u diamond node (L149-155)
- Label input u group node (L104-109)
- Icon search input u SettingsPanel (L265-270)

Ovo sprječava ReactFlow da presretne Delete/Backspace/Space i druge tastere dok korisnik kuca.

### 2. `src/components/mindmap/MindMapCanvas.tsx`

**A) `defaultEdgeOptions` — dodati `style` sa vidljivom bojom**

Trenutno (L699-703):
```ts
defaultEdgeOptions={{
  type: "smoothstep",
  animated: isProcedure,
  markerEnd: { ... },
}}
```

Dodati `style: edgeStyle` u `defaultEdgeOptions` tako da nove veze budu odmah vidljive.

**B) `onConnect` — dodati `markerStart` za bidirekcione strelice**

Trenutno (L424-438): samo `markerEnd`. Dodati `markerStart` sa istim stilom, tako da veza ima strelice na oba kraja.

**C) Edge color presets — dodati `markerStart` uz `markerEnd`**

U `EdgeSettingsPanel` (L244-247): kad korisnik bira boju, ažurirati i `markerStart` pored `markerEnd`.

### 3. `src/components/category/MindMapViewer.tsx`

**Handle update**: Viewer koristi iste čvorove — handle promjene u MindMapNode.tsx automatski se primjenjuju.

---

## Scope
- 2 fajla: `MindMapNode.tsx` (~15 linija), `MindMapCanvas.tsx` (~10 linija)
- Nema novih zavisnosti
- FSRS: netaknut

