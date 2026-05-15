## Cilj

Završiti P0 #2 (lint cap + `as unknown as` čišćenje) i P0 #3 (`<SafeHtml>` wrapper) — eliminisati implicitne tehničke dugove i ojačati render-time XSS odbranu.

---

## P0 #3 — `<SafeHtml>` wrapper (defense-in-depth)

### Trenutno stanje (audit 14 `dangerouslySetInnerHTML` lokacija)

Sve **upstream-sanitizovane** (sanitize se desi prije render-a), ali render-time wrapper-a NEMA. Ako upstream regresira (refaktor, nova lokacija), XSS je otvoren bez warning-a.

Posebno označene 4 lokacije iz P0 audita:
- `ZettelPreview.tsx:195` — `html` već prošao `sanitizeHtml(renderMarkdown(...))`
- `SourceSidePanel.tsx:62` — `html` iz `useMemo(() => sanitizeHtml(...))`
- `LinkToExistingCardModal.tsx:89` — `previewHtml` iz `useMemo`
- `SourceContent.tsx:117` — `safeHtml` iz `useMemo(() => sanitizeHtml(html))`

### Implementacija

**1. Novi util `src/components/ui/safe-html.tsx`:**

```tsx
import { forwardRef, type HTMLAttributes } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "children"> {
  html: string;
  /** Element tag (default 'div'). */
  as?: "div" | "span" | "section" | "article" | "p";
  /** Skip sanitization — ONLY for content already sanitized in same tick (e.g. <mark> highlights). */
  trusted?: boolean;
}

export const SafeHtml = forwardRef<HTMLElement, Props>(
  ({ html, as: Tag = "div", trusted = false, ...rest }, ref) => {
    const safe = trusted ? html : sanitizeHtml(html);
    return <Tag ref={ref as never} {...rest} dangerouslySetInnerHTML={{ __html: safe }} />;
  },
);
SafeHtml.displayName = "SafeHtml";
```

Ključno: dvostruka sanitizacija je **jeftina** (DOMPurify je ~ms na tipičnoj veličini) i idempotentna. `trusted` flag ostaje za hot-path slučajeve gdje highlight tagove (`<mark>`) već čistimo (npr. `highlightKeyParts` koji vraća već sanitiranu izlaz + `<mark>`).

**2. Migracija (4 P0 lokacije + 4 dodatne za uniformnost):**

| File | Promjena |
|---|---|
| `ZettelPreview.tsx:195` | `<SafeHtml html={html} />` (ukloni eslint-disable) |
| `SourceSidePanel.tsx:60-63` | `<SafeHtml as="div" className="..." html={html \|\| FALLBACK} />` |
| `LinkToExistingCardModal.tsx:87-90` | `<SafeHtml className="..." html={previewHtml} />` |
| `SourceContent.tsx:117` | Ostaje `dangerouslySetInnerHTML` jer dijeli `<div>` sa `contentEditable` mode-om — neće biti zamijenjen `<SafeHtml>` (potreban je dual-mode div). Umjesto toga: dodati `// eslint-disable-next-line react/no-danger` ako fali, i osigurati `safeHtml` ostaje rezultat `sanitizeHtml`. |

Dodatna migracija (low-risk, uniformnost):
- `EditorSection.tsx:43`, `WorkshopCardItem.tsx:192`, `PassiveReader.tsx:331`, `CardViewTable.tsx:189`, `SmartSplitSummaryDialog.tsx:95` — sve već pozivaju `sanitizeHtml` inline → zamijeniti sa `<SafeHtml html={...} />`.

**Ne dirati** (highlight-aware):
- `card-list/CardRow.tsx`, `SourceSnippetDialog.tsx`, `GlobalSearch.tsx`, `highlight-key-parts.ts` — koriste highlight wrappers (`highlightKeyParts`, `highlightMatch`) koji već vraćaju sanitiziran HTML sa `<mark>` tagovima. Zamjena bi pokrenula re-sanitizaciju koja **može pojesti** `<mark>` ako `bg-primary/30` klasa nije u DOMPurify allow-list-i. Validacija: pustiti kako jest, sa komentarom u kodu.

---

## P0 #2 — Lint cap + `as unknown as` čišćenje

### Trenutno stanje

```
package.json: "lint": "eslint . --max-warnings=123"
Realno:        80 warnings + 41 errors
```

41 errors su realan tehnički dug (nije u predmetu cap-a, ali biće vidljivi u CI). Top warning rules:
- `react-refresh/only-export-components` — 54
- `react-hooks/exhaustive-deps` — 21

### Implementacija (postupna, bez "big-bang" re-formata)

**Korak A — Spustiti cap na realnu cifru:**

```diff
- "lint": "eslint . --max-warnings=123",
+ "lint": "eslint . --max-warnings=80",
```

Sprečava regression (svaki novi warning fail-uje CI). 41 error mora se rješavati zasebno (ne ulazi u cap).

**Korak B — `as unknown as` cleanup, prioritetski hotspots:**

| File | Cast count | Pristup |
|---|---|---|
| `src/hooks/useCardExport.ts` | **19** | Najveća koncentracija. Ekstraktovati shared `RecordOf<T> = Record<string, unknown>` tip + `assertShape<T>(v): T` runtime guard za bulk JSON serijalizaciju. |
| `src/components/SRSettingsPanel.tsx` | 6 | Cast-ovi su oko `Record<keyof Settings, unknown>` patterna. Definisati `SettingsPatch = Partial<Settings>` i `applyPatch(s, p)` helper. |
| `src/lib/migrations/backup-schema.ts` | 4 | Cast-ovi pri migracijskim shape transformacijama — uvesti diskriminisane unione (`v3 \| v4 \| v5`) sa explicit narrowing umjesto cast-a. |
| `src/lib/backup/import-transaction.ts` | 3 | Slično, koristi `BackupBundle` discriminated union. |

Test fajlovi (`auto-split-import-planner.test.ts`, `card-ordering.test.ts`, itd.) ostavljamo — cast u testovima je prihvatljiv shortcut.

### Verifikacija

1. `bunx eslint . --max-warnings=80` mora proći (0 nad cap-om).
2. `rg -c "as unknown as" src --glob '*.ts' --glob '*.tsx'` — broj kastova u 4 hotspot fajla treba pasti na 0 (ili dokumentovan razlog).
3. Postojeći testovi i dalje 394/398 (4 pre-postojeća Zettelkasten fail-a).
4. Type-check mora ostati zelen.

---

## Out of scope

- 41 ESLint **error**-a (`no-require-imports` itd.) — odvojen task; nisu vezani za `as unknown as` ili XSS.
- Uklanjanje `body-pointer-events-guard.ts` — ostaje kao "belt-and-suspenders" do verifikacije u Electron production buildu.
- `react-refresh/only-export-components` (54 warning-a) — strukturni; zaseban refaktor da se utility export-i izoluju.

---

## Pitanje izvršenja

Plan ima dvije nezavisne grupe izmjena. Nakon odobrenja, implementiram redom:
1. **Prvo** P0 #3 (SafeHtml + migracija 4 P0 lokacije + 5 dodatnih) — manji rizik, brža verifikacija.
2. **Zatim** P0 #2 (cap-down + `useCardExport` + `SRSettingsPanel` + 2 backup fajla).

Mogu napraviti i **PR po koraku** ako želite manju veličinu izmjene odjednom.
