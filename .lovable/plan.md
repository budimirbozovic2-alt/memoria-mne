

# Fix: Diamond handle-ovi i unos teksta u opis čvora

## Problemi

1. **Diamond čvor — veze se ne mogu povući**: Div sa `z-10` (L143) pokriva cijelu površinu čvora uključujući handle-ove. Handle-ovi su ispod ovog sloja i klik/drag na njih ne prolazi.

2. **Opis čvora — tekst se ne može unijeti**: Textarea ima `onKeyDown stopPropagation`, ali ReactFlow presreće mousedown na čvoru i pokreće drag umjesto fokusiranja textarea. Potrebno je dodati `noDragClassName` ili `nodrag` CSS klasu na interaktivne elemente.

## Rješenje

### `src/components/mindmap/MindMapNode.tsx`

**A) Diamond handle z-index fix (L143)**

Sadržaj overlay div: promijeniti `z-10` u `z-10 pointer-events-none`, a unutar njega dodati `pointer-events-auto` na interaktivne elemente (tekst, input, dugmad). Ovo omogućava da handle-ovi ispod prime klik/drag.

```
L143: "absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-10"
→     "absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-10 pointer-events-none"
```

Na span/input/button unutar diamond-a dodati `pointer-events-auto`.

**B) Textarea drag prevention (L218-226)**

Dodati `nodrag` klasu na textarea i input elemente u editing režimu. ReactFlow prepoznaje klasu `nodrag` i neće pokrenuti drag za te elemente:

- L219 textarea: dodati `nodrag` u className
- L202 label input (standard): dodati `nodrag` u className  
- L104/150 label input (group/diamond): dodati `nodrag` u className
- Također dodati `nowheel nopan` da spriječi scroll/pan presretanje

**C) Handle-ovi na diamond — z-index (L134)**

Handle-ovi se renderuju unutar `{handles}` na L134, ali rotirana pozadina i sadržaj ih prekrivaju. Dodati `z-20` na svaki Handle u `handles` bloku, ili premjestiti handles renderovanje nakon sadržaja u diamond sekciji.

| Lokacija | Promjena |
|----------|----------|
| L143 | Dodati `pointer-events-none` na content overlay |
| L144-159 | Dodati `pointer-events-auto` na ikonu, span, input, dugmad |
| L73-79 | Dodati `z-20` na Handle komponente |
| L219, L202, L104, L150 | Dodati `nodrag nowheel nopan` klasu na input/textarea |

## Scope
- 1 fajl: `MindMapNode.tsx`, ~10 linija promjena
- Nema novih zavisnosti

