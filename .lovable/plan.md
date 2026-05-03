## Cilj

Dodati parser za masovni uvoz jednostranih blic kartica koji koristi `P:` / `O:` prefikse, sa potpunim multi-line podrškom za odgovore, i integrisati ga u postojeći `BulkImportDialog` (target koji `MassFlashImportTrigger` već adresira).

## Fajlovi

1. **NOVO** `src/lib/flashcard-parser.ts` — čista utility funkcija `parseFlashcards`, bez React zavisnosti, lako testabilna i kasnije iskoristiva u Wizardu.
2. **NOVO** `src/lib/__tests__/flashcard-parser.test.ts` — Vitest testovi za sve ključne slučajeve (case-insensitivity, multi-line, prazni blokovi, missing P/O).
3. **EDIT** `src/components/category/BulkImportDialog.tsx` — dodaje treći "P:/O:" format kao **primarni** put (auto-detect), zadržava postojeća dva (`;` i prazan-red) radi backward kompatibilnosti. Auto-detekcija: ako tekst sadrži marker `^\s*[Pp]\s*:` i `^\s*[Oo]\s*:` u multilineu → koristi `parseFlashcards`. Inače fallback na trenutnu heuristiku.

## Parser — `src/lib/flashcard-parser.ts`

```ts
/**
 * Mass-import parser for single-sided flashcards using P:/O: prefixes.
 *   P: Pitanje (Question)
 *   O: Odgovor (Answer)
 *
 * Rules:
 *   1. Prefixes are stripped from the output (case-insensitive).
 *   2. Answer bodies span multiple lines until the next P: marker or EOF.
 *   3. question/answer are .trim()-ed.
 *   4. Blocks missing either side are silently skipped.
 */
export interface ParsedFlashcard {
  question: string;
  answer: string;
}

const MARKER_RE = /^[ \t]*([PpOo])[ \t]*:[ \t]*(.*)$/;

export function parseFlashcards(input: string): ParsedFlashcard[] {
  if (!input || typeof input !== "string") return [];

  const lines = input.split(/\r?\n/);
  const out: ParsedFlashcard[] = [];

  let curQ: string[] | null = null;
  let curA: string[] | null = null;
  let mode: "q" | "a" | null = null;

  const flush = () => {
    if (curQ && curA) {
      const q = curQ.join("\n").trim();
      const a = curA.join("\n").trim();
      if (q && a) out.push({ question: q, answer: a });
    }
    curQ = null; curA = null; mode = null;
  };

  for (const rawLine of lines) {
    const m = MARKER_RE.exec(rawLine);
    if (m) {
      const kind = m[1].toLowerCase() as "p" | "o";
      const rest = m[2];
      if (kind === "p") {
        flush();                  // close previous pair (if any)
        curQ = [rest];
        mode = "q";
      } else {
        if (curQ === null) continue;   // stray O: without preceding P:
        curA = [rest];
        mode = "a";
      }
      continue;
    }
    // Continuation line → append verbatim to active buffer (preserves
    // internal blank lines inside multi-paragraph answers).
    if (mode === "a" && curA) curA.push(rawLine);
    else if (mode === "q" && curQ) curQ.push(rawLine);
  }
  flush();
  return out;
}
```

### Edge cases pokriveni testovima

- `P: ...\nO: ...` jedan par → 1 rezultat, bez prefixa
- `p:` / `o:` lowercase → radi
- `O:` višeparagrafni odgovor sa praznim redovima i `\n` unutar → očuvano
- `P:` bez pratećeg `O:` → ignorisano
- Tekst prije prvog `P:` → ignorisan
- Stray `O:` bez prethodnog `P:` → ignorisan
- Whitespace oko prefiksa (` P: `, `P :`) → tolerisano

## Stand-alone komponenta (po specifikaciji)

Dodatno, kao referentna mini-komponenta koju možemo lako prebaciti u budući Wizard:

```tsx
// src/components/category/FlashcardImportPanel.tsx
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseFlashcards, type ParsedFlashcard } from "@/lib/flashcard-parser";

interface Props {
  onImport: (cards: ParsedFlashcard[]) => void;
}

export default function FlashcardImportPanel({ onImport }: Props) {
  const [raw, setRaw] = useState("");

  const handleImport = () => {
    const parsed = parseFlashcards(raw);
    if (parsed.length === 0) return;
    onImport(parsed);
    setRaw("");
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={12}
        placeholder={"P: Šta je ugovor?\nO: Saglasnost volja dviju strana...\n\nP: Šta je hipoteka?\nO: Založno pravo na nekretnini."}
        className="font-mono text-xs"
      />
      <Button onClick={handleImport} disabled={!raw.trim()} className="w-full gap-2">
        <Upload className="h-4 w-4" /> Uvezi
      </Button>
    </div>
  );
}
```

## Integracija u `BulkImportDialog`

Unutar `analyze()` callback-a, dodati prvo granu:

```ts
// 0) P:/O: prefiksni format — najprecizniji, primarni put
if (/^[ \t]*[Pp][ \t]*:/m.test(trimmed) && /^[ \t]*[Oo][ \t]*:/m.test(trimmed)) {
  setParsed(parseFlashcards(trimmed));
  return;
}
// 1) ... postojeći semicolon path
// 2) ... postojeći blank-line path
```

Placeholder textarea ažurirati da promovira novi format kao preporučeni:

```tsx
placeholder={"P: Šta je ugovor?\nO: Saglasnost volja dviju strana o nastanku, izmjeni ili prestanku obligacionog odnosa.\n\nP: Šta je hipoteka?\nO: Založno pravo na nekretnini."}
```

I dodati red u "format" hint:

```tsx
Format (preporučeno): redovi koji počinju sa <code>P:</code> (pitanje) i <code>O:</code> (odgovor); odgovor može imati više pasusa.
```

## Verifikacija

- `npm run test -- flashcard-parser` zelen
- Ručno: nalijepiti uzorak sa 3 P:/O: para gdje 2. odgovor ima prazan red i grafički zalomljen tekst → prikazano 3 kartice, prefiksi nigdje ne ostaju
- `rg "P:|O:" ` u rezultatima `parsed` → 0 hitova (grep test)
- Backward compat: `;`-format i blank-line format i dalje rade neizmijenjeno
