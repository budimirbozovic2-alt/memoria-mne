# Hirurški refaktor — Cilj: kraj domino efekta

Cilj nije "preseliti fajlove", nego **uvesti barijere** koje sprečavaju da se modul X slučajno spregne sa internom strukturom modula Y. Bez barijere, refaktor je samo kozmetika — domino se vraća za par mjeseci.

## Princip

Svaki feature folder dobija jedan ulaz: `index.ts` (barrel). Sve van foldera smije da importuje **samo** iz tog barrel-a. Sve unutar foldera je interno. To se programatski osigurava ESLint pravilom — nije stvar discipline.

```text
src/features/<domain>/
  index.ts          ← jedini javni API (eksplicitne re-export linije)
  components/       ← interno
  hooks/            ← interno
  lib/              ← interno
  __tests__/        ← interno
```

Cross-cutting fajlovi (`db-schema.ts`, `category-deletion-service.ts`, `cardRepository`, `cardCommandBus`, `sanitize`, `logger`) ostaju u `src/lib/` i `src/lib/repositories/`. Oni su *infrastruktura*, ne domen.

## Stvarni hot-spotovi spregnutosti (verifikovano u kodu)

| Domen | Fajlova rasuto | Pravi cross-cutting? |
|---|---|---|
| Mnemonic | 14 (components/mnemonic, components/workshop, hooks/mnemonic, lib/mnemonic-*) | Skoro nimalo — idealan prvi kandidat |
| Mind-maps | 12 (components/mindmap, hooks/mindmap, hooks/useMindMap*, lib/mindmap-storage) | Da: `EmbeddedMindMap` u Zettelu, `MindMapSidePanel` u SubjectCards |
| Docx-importer | 4 (DocxImporter.tsx, docx-parser.ts, docx-worker.ts) | Ne — čist domen |
| Zettelkasten | 11 (lib/zettelkasten-*, hooks/zettelkasten/, components/zettelkasten/, views/) | Da: `backlink-index` referencira karte, wiki-link autocreate poziva cardRepository |
| `src/components/` root | 46 orphan komponenti | Većina pripada postojećim podfolderima |

## Migracija po milestone-u (svaki je samostalan PR, app ostaje radna)

### M0 — Postavi barijere (pola dana, nula rizika)

1. Kreiraj `src/features/` folder.
2. Dodaj `eslint-plugin-boundaries` ili `no-restricted-imports` pravilo:
   - Importi u `src/features/X/**` smiju da gađaju `src/features/Y/**` **samo** preko `src/features/Y` (barrel), nikad direktno `src/features/Y/lib/...`.
   - Komponente van features/ koje importuju feature smiju samo `import { X } from "@/features/x"`.
3. Test: `bun run lint` mora proći na trenutnoj kodbazi (još nema features foldera — pravilo je no-op).

### M1 — Docx-importer (najlakši, 1-2h)

- Premjesti: `DocxImporter.tsx`, `lib/docx-parser.ts`, `workers/docx-worker.ts`, `lib/services/autoSplitImportService.ts` (ako se koristi samo tu).
- Cilj: `src/features/docx-importer/index.ts` exportuje samo `DocxImporter` komponentu i `parseDocx` funkciju.
- Verifikacija: `bunx vitest run`, otvori app, povuci jedan .docx u importer.

### M2 — Mnemonic (čist domen, ~3h)

- Premjesti: `components/MnemonicModule.tsx`, `MnemonicTest.tsx`, `MnemonicWorkshop.tsx`, `MajorSystemSettings.tsx`, `components/mnemonic/*`, `components/workshop/*`, `hooks/mnemonic/*`, `hooks/workshop/*`, `lib/mnemonic-storage.ts`, `lib/mnemonic/*`.
- `views/SubjectMnemonicPage.tsx` ostaje u `views/` ali importuje samo iz `@/features/mnemonic`.
- Barrel exportuje: page entrypoint komponente + `mnemonicStorage` API koji koristi `runMigrations`/`category-deletion-service`.
- Verifikacija: testovi `mnemonic-*.test.ts`, otvori Mnemonic stranicu, dodaj test peg.

### M3 — Mind-maps (sa pažnjom na embeds, ~4h)

- Premjesti: `components/mindmap/*`, `hooks/mindmap/*`, `hooks/useMindMaps.ts`, `hooks/useMindMapCanvas.ts`, `lib/mindmap-storage.ts`, `components/category/MindMapViewer.tsx`.
- Cross-cutting tačke ostaju kao **eksplicitan public API**:
  - `EmbeddedMindMap` (koristi ga Zettel) → exportovati iz barrel-a.
  - `MindMapSidePanel` (koristi ga SubjectCards) → exportovati iz barrel-a.
  - `useMindMaps` hook → exportovati.
- Zabrana: nikakav direktan import `@/features/mind-maps/lib/...` iz Zettela.
- Verifikacija: otvori mind-map, otvori Zettel članak koji embed-uje mind-map (`::mindmap[id]`).

### M4 — Zettelkasten (najsloženiji zbog backlink/wiki-link, ~5h)

- Premjesti: `components/zettelkasten/*`, `hooks/zettelkasten/*`, `hooks/useWikiLinkAutoCreate.ts`, `lib/zettelkasten-*.ts`, `lib/backlink-index.ts`, `views/ZettelkastenView.tsx` (page wrapper ostaje u views/).
- Cross-cutting kritične tačke:
  - `backlink-index` čita karte → koristi javni `cardRepository.snapshot()` (već postoji), ne reach-into-internals.
  - `useWikiLinkAutoCreate` poziva `cardRepository.put` → OK, repository je infrastruktura.
- Barrel exportuje: `ZettelkastenView` (ili njegove building blocks), `backlinkIndex` (za GlobalSearch), `zettelkastenStorage` (za backup layer).
- Verifikacija: kreiranje članka, wiki-link auto-create, backlink count, alias rezolucija.

### M5 — Čišćenje `src/components/` root (~2h, kozmetika ali smanjuje šum)

Premjesti u postojeće podfoldere ili u relevantne features:
- `Dashboard.tsx`, `DashboardChart.tsx`, `ActivityHeatmap.tsx`, `ForgettingCurve.tsx`, `RetentionChart.tsx`, `ProgressRing.tsx`, `MyStats.tsx`, `CognitiveAnalytics.tsx` → `src/components/dashboard/` ili `features/analytics/`.
- `ReviewSession.tsx`, `LearnSession.tsx`, `SessionFilters.tsx`, `ZenMode.tsx` → `src/components/review/` (već postoji).
- `SourceReader.tsx`, `SourceSnippetDialog.tsx` → `src/components/source-reader/` (već postoji).
- `StrategicPlanner.tsx` → `src/components/planner/` (već postoji).
- `CardForm.tsx`, `RichTextEditor.tsx` → `src/components/card-form/` (već postoji).
- `DocxImporter.tsx` → već premješten u M1.
- `MnemonicModule.tsx` itd. → već premješten u M2.

Cilj: `src/components/` root drži samo true app-shell komponente (`MainLayout`, `AppSidebar`, `TitleBar`, `Breadcrumbs`, `ErrorBoundary`, `MainNav`, `ProcessingOverlay`, ~10 fajlova umjesto 46).

## Što se NE radi (eksplicitno)

- **Ne** dira se `cardCommandBus`, `cardRepository`, `Ref-Delta pattern`, `cardMapStore`. Te odluke su tačne za skalu i memorijski upisane.
- **Ne** uvodi se `useLiveQuery` u primary views. Krši Core memoriju.
- **Ne** mijenja se `CardStateProvider` u ovoj rundi (odvojen PR, treba pažljiv selector audit sa `useShallow`).
- **Ne** mijenja se vizuelni dizajn ni UX flow.

## Sigurnosna mreža

- Svaki milestone je samostalan PR sa svojim testovima.
- Nakon svakog milestone-a: `bunx vitest run` mora biti 100% zelen prije nego što se krene na sljedeći.
- Backup baze podataka (Export full backup) prije M2 i M4 (oni dotiču domene sa korisničkim podacima preko `category-deletion-service` re-importa).
- Ako bilo koji milestone otkrije skrivenu spregu koja ne može da se izolira preko barrel API-ja, dokumentujemo je i ide u zaseban "cross-cutting infrastructure" PR.

## Procjena

- Ukupno: **~15-20 sati efektivnog rada**, raspoređeno u 5 milestone-a.
- Rizik na podatke: nula (samo file moves + import path updates).
- Rizik na regresije: nizak po milestone-u, hvataju ga postojeći testovi (446+ testova) + smoke check otvaranja relevantne stranice.
- Trajni dobitak: ESLint blokira buduće domino spregove na CI-ju, ne na code-review-u.

## Otvorena pitanja prije starta

1. Da li želiš `eslint-plugin-boundaries` (deklarativan, opisuje arhitekturu) ili jednostavniji `no-restricted-imports` (manje pravila, manji overhead)?
2. Smije li M5 (čišćenje `components/` root) ići paralelno sa M1-M4, ili tek na kraju da ne komplikuje review?
