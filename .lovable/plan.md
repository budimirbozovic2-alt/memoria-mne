

# Dekompozicija MindMapCanvas (407 → ~150 + ~270 linija)

## Pristup
Izdvojiti svu logiku (state, callbacks, efekti) u `useMindMapCanvas` hook. `MindMapCanvasInner` postaje čist orchestrator koji samo renderuje.

## Novi fajl: `src/hooks/useMindMapCanvas.ts` (~270 linija)

Sadrži sve iz linija 34-287 trenutne komponente:
- State deklaracije (title, dirty, deletedStack, presentationMode, selectedEdgeId, exportOpen, snapLines)
- Stable callback refs (onUpdateRef, onDuplicateRef, stableOnUpdate, stableOnDuplicate)
- initialNodes memo, useNodesState, useEdgesState
- handleNodesChange (delete with undo), handleEdgesChange
- Snap guide logika (onNodeDrag, onNodeDragStop)
- Edge logika (onConnect, updateEdge, deleteEdge, onEdgeClick)
- Node helpers (addNodeFromTemplate, addBlankNode, handleAutoLayout)
- handleSave + auto-save effect + Ctrl+S effect
- Izvedene vrijednosti (mode, isProcedure, templates, edgeStroke, edgeStyle, selectedEdge)

**Return type**: Objekat sa svim potrebnim vrijednostima i callback-ovima za renderovanje.

## Izmjena: `src/components/mindmap/MindMapCanvas.tsx` (~150 linija)

- Import `useMindMapCanvas` iz novog hook-a
- `MindMapCanvasInner` poziva hook, destrukturira rezultat, i renderuje JSX (linije 289-397)
- Wrapper `MindMapCanvas` ostaje nepromijenjen (ReactFlowProvider)

## Scope
- 1 novi fajl (`useMindMapCanvas.ts`)
- 1 izmjena (`MindMapCanvas.tsx` — zamjena logike sa hook pozivom)
- Bez funkcionalnih promjena

