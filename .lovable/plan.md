## Cilj

Garantovati da nakon `insertBlock` caret završi tačno na **prvoj praznoj kucljivoj liniji ispod bloka** (gdje korisnik može odmah početi kucati novi paragraf), bez obzira:
- gdje je kursor bio prije ubacivanja,
- da li je postojala selekcija (bilo non-empty range).

## Trenutno stanje i bug-ovi

`src/components/zettelkasten/ZettelEditor.tsx:70-108` — `insertBlock`:

```ts
const caret = start + prefix.length + text.length + Math.min(1, suffix.length);
ta.setSelectionRange(caret, caret);
```

Pozvano u `requestAnimationFrame` poslije `onChange(next)`.

### Bug-ovi

1. **Race sa React commit-om**: jedan `requestAnimationFrame` ne garantuje da je `ta.value` već ažuriran (parent koristi sync `setDraft`, ali React batch-uje state update unutar event handlera; novi value stigne tek kad React reflushuje DOM). Ako je `caret > ta.value.length` u trenutku poziva, browser ga cleampuje na end → caret skoči na kraj fajla u nekim slučajevima (npr. kraj dokumenta sa selekcijom).

2. **Caret pri selekciji**: računanje `start = ta.selectionStart` je tačno (start selekcije), ali ako je selekcija reverse (`anchor > focus`), neki browseri vraćaju isto što treba; ipak, `Math.min(start, end)` je sigurnije za jasnoću.

3. **`Math.min(1, suffix.length)` je suviše konzervativno**: kada smo u sredini dokumenta, `suffix === "\n\n"`, želimo caret tačno između dva trailing newline-a (= prazna linija = `BLOCK\n|\nafter`). To je tačno `+1` što već radi, ALI ako bismo htjeli kursor "korak ispod" (na liniji `after`-a), trebalo bi `+suffix.length`. Per zahtjev korisnika ("prvu praznu liniju") — `+1` je ispravno za sredinu.

   Edge: kraj dokumenta sa `suffix = "\n"` → `+1` stavlja caret iza newline-a, na praznoj posljednjoj liniji. ✓

## Rješenje

### 1. Dvostruki `requestAnimationFrame` + provjera dužine

Zamijeniti jedan `rAF` sa pristupom koji čeka da se prop `value` sinhronizuje:

```ts
// After onChange, schedule caret restoration using a useEffect that watches `value`.
// Store the pending caret target in a ref; effect applies it once value matches expected.
const pendingCaretRef = useRef<{ pos: number; expectedValue: string } | null>(null);

useLayoutEffect(() => {
  const pending = pendingCaretRef.current;
  if (!pending) return;
  if (value !== pending.expectedValue) return; // wait for next render
  const ta = taRef.current;
  if (!ta) return;
  ta.focus();
  // Clamp defensively in case external changes truncated the value.
  const pos = Math.min(pending.pos, ta.value.length);
  ta.setSelectionRange(pos, pos);
  pendingCaretRef.current = null;
}, [value]);
```

`insertBlock` (i `insertText`, `wrap`, `insertAtLineStart` za konzistentnost) postavljaju `pendingCaretRef.current = { pos, expectedValue: next }` umjesto `requestAnimationFrame`.

### 2. Robustno rukovanje selekcijom u `insertBlock`

```ts
const rawStart = ta?.selectionStart ?? value.length;
const rawEnd = ta?.selectionEnd ?? value.length;
const start = Math.min(rawStart, rawEnd);
const end = Math.max(rawStart, rawEnd);
```

Tako reverse selekcija (anchor > focus, koja se javlja kad korisnik selektira unazad) tretira se isto kao forward.

### 3. Caret target — eksplicitno "prva prazna linija ispod bloka"

```ts
// `start` here = normalized selection start (after Math.min above).
// After insertion, document around caret region looks like:
//   before + prefix + BLOCK + suffix + after
// "First blank writable line below block" = position right AFTER the first `\n` of suffix.
// (visually: the cursor sits on a blank line between BLOCK and `after`).
// If suffix is empty (we landed on a paragraph break already), caret goes right after BLOCK.
const caretOffsetInSuffix = suffix.length === 0 ? 0 : 1;
const pos = start + prefix.length + text.length + caretOffsetInSuffix;
```

Ovo je matematički isto kao trenutni `Math.min(1, suffix.length)`, samo eksplicitnije i dokumentovano.

### 4. Test scenariji (manualni acceptance kroz session replay)

| # | Scenarij | Očekivano |
|---|---|---|
| 1 | Prazan dokument, klik insert | Blok ubačen, caret na novoj liniji ispod bloka (kraj fajla) |
| 2 | Kursor na sredini paragrafa `lorem\|ipsum` | `lorem\n\nBLOCK\n` + caret + `\nipsum`; caret na praznoj liniji između BLOCK i `ipsum` |
| 3 | Selekcija sredinom paragrafa `lo[rem ip]sum` | Selektovani dio zamijenjen okruženjem bloka; caret na praznoj liniji ispod bloka, prije `sum` |
| 4 | Reverse selekcija (od desno ka lijevo) | Isto kao forward selekcija |
| 5 | Kursor na kraju dokumenta | `…tekst\n\nBLOCK\n` + caret na zadnjoj praznoj liniji |
| 6 | Kursor odmah poslije `\n\n` (prazan red iznad) | Bez duplog padding-a; caret na praznoj liniji ispod bloka |
| 7 | Dvije uzastopne `insertBlock` (rapid click) | Drugi blok sa pravilnim spacing-om, caret ispod drugog bloka |

Scenario 7 (rapid clicks) je razlog zašto pendingCaretRef + useLayoutEffect: ako bi `requestAnimationFrame` runao prije nego React commit-uje prvi `next`, drugi click bi koristio stari `value` iz closure-a → corrupt state. Sa pendingRef pristupom svaki klik ažurira ref na osnovu **tada važećeg** `value` snapshot-a u callbacku.

## Izmjene

**`src/components/zettelkasten/ZettelEditor.tsx`**

1. Dodaj `useRef` za `pendingCaretRef` i `useLayoutEffect` koji čita ga.
2. Refaktoriši `wrap`, `insertAtLineStart`, `insertText`, `insertBlock` da postavljaju `pendingCaretRef` umjesto `requestAnimationFrame` + direktnog `setSelectionRange`.
3. `insertBlock`: normalizuj `start/end` preko `Math.min`/`Math.max`, koristi eksplicitni `caretOffsetInSuffix`.
4. Dodaj kratke JSDoc komentare uz `insertBlock` koji opisuju gdje završi caret.

## Što ostaje van skopa

- `wrap` semantika (selektuje placeholder ako nije bilo selekcije) ostaje — samo se mehanizam za caret restore mijenja.
- Bez izmjena u `ZettelkastenView`-u (poziv `insertBlock(\`::mindmap[${id}]\`)` ostaje isti).
- Bez novih testova (manual QA kroz preview).
