## Cilj

Garantovati da se `::mindmap[id]` direktiva **uvijek** ubacuje na početku nove linije (i završava praznom linijom), bez obzira gdje se nalazi kursor — radi pouzdanog rendera u `ZettelPreview`-u (markdown direktiva mora biti samostalan blok).

## Trenutno ponašanje

`src/views/ZettelkastenView.tsx:279`:
```ts
editorRef.current?.insertText(`\n\n::mindmap[${mmId}]\n\n`);
```

`insertText` (u `ZettelEditor.tsx:54`) ubacuje doslovno na poziciji kursora. Problemi:
- Kursor na početku praznog dokumenta → vodeće `\n\n` stvara dvije prazne linije iznad.
- Kursor već na početku linije (poslije `\n`) → ponovo višak praznih redova.
- Kursor odmah poslije već postojeće `\n\n` → trostruka praznina.
- Trailing `\n\n` na kraju dokumenta ostavlja prazne linije.

## Rješenje

Dodati novu metodu `insertBlock(text: string)` u `ZettelEditor` koja **normalizuje okruženje**:

1. Ako tekst prije kursora ne završava sa `\n\n` (i nije početak dokumenta) → prepend `\n` ili `\n\n` koliko nedostaje da se garantuje prazna linija iznad.
2. Ako je kursor na početku dokumenta → ne dodaje vodeće newline-e.
3. Umetne sam blok (npr. `::mindmap[id]`).
4. Ako tekst poslije kursora ne počinje sa `\n\n` (i nije kraj dokumenta) → append `\n` ili `\n\n` koliko fali.
5. Ako je kraj dokumenta → samo jedan trailing `\n`.
6. Postavi kursor odmah poslije ubačenog bloka (na kraj prvog newline-a iza, da korisnik može odmah kucati na novom redu).

### Izmjene

**1. `src/components/zettelkasten/ZettelEditor.tsx`**
- Dodati `insertBlock(text: string)` u `ZettelEditorHandle` interface.
- Implementirati helper koji računa potreban prefix/suffix newline padding na osnovu `value.slice(0, start)` i `value.slice(end)`.
- Izložiti kroz `useImperativeHandle`.

**2. `src/views/ZettelkastenView.tsx`**
- Linija 279: zamijeniti `insertText(\`\\n\\n::mindmap[${mmId}]\\n\\n\`)` sa `insertBlock(\`::mindmap[${mmId}]\`)`.

## Edge cases pokrivene

| Pozicija kursora | Prefix | Suffix |
|---|---|---|
| Početak praznog dokumenta | (nema) | `\n` |
| Početak dokumenta sa sadržajem | (nema) | `\n\n` |
| Sredina paragrafa (`abc\|def`) | `\n\n` | `\n\n` |
| Odmah iza `\n` (početak linije) | `\n` | `\n\n` |
| Odmah iza `\n\n` | (nema) | `\n\n` |
| Kraj dokumenta | `\n\n` | `\n` |
| Kraj dokumenta poslije već `\n\n` | (nema) | `\n` |

## Što ostaje van skopa

- `insertText` ostaje kao niskonivovska metoda (koristi je možda i drugi kod u budućnosti za inline ubacivanje).
- Drugi block-level umetci (heading, list) već koriste `insertAtLineStart` koji garantuje line-start za njih.
- Bez izmjene render pipeline-a ili markdown parsera.
