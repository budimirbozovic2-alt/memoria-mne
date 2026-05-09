## Cilj

Kozmetičko čišćenje `applyImportAtomically` (270 LOC) ekstraktovanjem 4 helpera iz `db.transaction` body-ja. Bez promjene logike, transakcionih granica, ili spoljnog API-ja.

## Nova struktura (isti fajl)

```text
src/lib/backup/import-transaction.ts
  // existing helpers
  isCategoryRecordArray, buildCategoryIdRemap, applyRemapToParsed, pruneOrphans
  // NEW extracted helpers (private, defined above applyImportAtomically)
  mergeCardsByStrategy(...)            // ── 1. Pre-merge cards
  writeCategoriesTx(...)               // ── 4a + 4b. Categories + legacy subs map
  writeCardsTx(...)                    // ── 4c. Cards bulkPut + overwrite prune
  writeSatelliteTablesTx(...)          // ── 4f + 4g. Sources/MindMaps/KB + log tables
  applyImportAtomically(ctx)           // slimmed orchestrator (~80 LOC)
```

## Detalji

**`mergeCardsByStrategy(importedCards, currentMap, strategy)`**
- Vraća `{ merged, nextMap }`.
- Sadrži postojeću `newer` / `overwrite` / default granu (linije 130-149).

**`writeCategoriesTx(parsed, strategy, freshCategories)`**
- Pokriva 4a + 4b (linije 186-253) — radi unutar postojeće `rw` transakcije, prima `parsed` i `freshCategories`, mutira `parsed` (već je tako).
- Vraća `void`.

**`writeCardsTx(merged, strategy)`**
- Pokriva 4c (linije 256-263). bulkPut + overwrite orphan prune + `yieldUI`.

**`writeSatelliteTablesTx(parsed, strategy, progress)`**
- Pokriva 4f + 4g (sources, mindMaps, KB, uuidTables, autoIncTables, linije 282-378).
- Prima `progress` callback za "Uvoz izvora i mapa…" / "Logovi (i/N)…".
- Sadrži `IdbBulkTable` tip i `uuidTables`/`autoIncTables` konstante (lokalno u fajlu, izvan funkcije).

**`applyImportAtomically` (slim)**
- Ostaje: pre-merge poziv, pre-tx remap, legacy taxonomy resolve, otvaranje `db.transaction`, redoslijed poziva helpera, post-tx `idbLoadCategories`.
- Review log (4d) i SR settings (4e) ostaju inline jer pišu u closure-vezane `srSettingsApplied`/`reviewLogApplied` varijable — extract bi zahtijevao return tuple, što povećava šum bez koristi.

## Garancije

- **Bez logičkih promjena**: helperi sadrže identičan kod, samo izdvojen.
- **Transakcione granice nepromijenjene**: svi helperi se zovu unutar postojećeg `db.transaction("rw", tables, …)`.
- **Bez API breaks**: `applyImportAtomically(ctx)` signature, return tip, i ponašanje su nepromijenjeni.
- **Ekstraktovani helperi su `function` deklaracije iznad `applyImportAtomically`** (file-private, ne export).

## Verifikacija

- `bunx vitest run src/test/backup-schema.test.ts`
- TypeScript build (auto)

## Procjena

B → A−. Glavna funkcija: 270 LOC → ~80 LOC. Svaki helper ima jasnu odgovornost i ime koje se mapira na originalne sekcije 4a-4g.
