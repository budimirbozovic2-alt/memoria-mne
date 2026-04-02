

# Proširenje režima uređivanja izvora — puni rich text editor

## Rezime

Trenutno "Uredi" režim u Source Reader-u omogućava samo strukturno formatiranje (H1/H2/H3/P/liste) kroz kontekstni meni i tooltip selekcije. Nedostaje inline formatiranje (bold, italic, underline), toolbar sa dugmadima, keyboard prečice (Ctrl+B/I/U), i automatsko čuvanje promjena. `SourceEditToolbar` komponenta je već kreirana ali nije integrisana.

## Promjene

### 1. `src/components/source-reader/SourceContent.tsx` — contentEditable + toolbar integracija

- Dodati `editMode` prop
- Kad je `editMode=true`: postaviti `contentEditable`, prikazati `SourceEditToolbar` iznad sadržaja
- Dodati `onInput` handler koji emituje promjene
- Dodati `onKeyDown` za Ctrl+B/I/U prečice i sprječavanje ReactFlow-sličnih presretanja
- Dodati `onPaste` za smart paste (plain text + image paste kao u RichTextEditor)
- Ukloniti `dangerouslySetInnerHTML` kad je editMode aktivan (koristiti ref-based innerHTML sync)

### 2. `src/hooks/useSourceReaderActions.ts` — handleInlineFormat + debounced save

- Dodati `handleInlineFormat(command, value?)` akciju koja poziva `document.execCommand` na contentRef
- Dodati debounced save: nakon svake promjene sadržaja, sačekati 1s pa persistovati u IDB (`saveSource`)
- Dodati `handleEditInput` callback koji se poziva iz SourceContent `onInput`
- Exportovati nove akcije kroz `actions` objekat

### 3. `src/components/SourceReader.tsx` — proslijediti editMode i nove akcije

- Proslijediti `editMode` prop u `SourceContent`
- Proslijediti `onFormat` i `onInput` handlere

### 4. `src/components/source-reader/SourceEditToolbar.tsx` — bez promjena

Već kreiran sa svim potrebnim dugmadima (Bold, Italic, Underline, Strikethrough, Red, H1-H3, P, Lists, Undo/Redo).

## Arhitektura toka podataka

```text
SourceEditToolbar → onFormat(cmd) → handleInlineFormat → document.execCommand
                                                        ↓
SourceContent (contentEditable) → onInput → handleEditInput → debounce 1s → saveSource(IDB)
                                                        ↓
Ctrl+B/I/U (onKeyDown) ────────────────────→ document.execCommand
```

## Scope
- 3 fajla: `SourceContent.tsx` (~30 linija), `useSourceReaderActions.ts` (~40 linija), `SourceReader.tsx` (~5 linija)
- `SourceEditToolbar.tsx`: 0 promjena (već gotov)
- Nema novih zavisnosti
- FSRS: netaknut

