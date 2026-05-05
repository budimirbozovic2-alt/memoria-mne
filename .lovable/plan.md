## Audit Backup/Restore — 5 vektora rizika

Skenirao: `useCardExport.ts`, `useCardImport.ts`, `ExportImportDialog.tsx`, `zip-service.ts`, `zip-worker.ts`, `migrations/backup-schema.ts`, `db-schema.ts`.

---

### Vektor 1 — OOM / RAM curenja (KRITIČNO)

**1.1 `useCardExport.ts:148-165` — paralelni `Promise.all` od 16 `toArray()`**
Cijela baza (sources sa `htmlContent`, mindMaps, sve logove, sve cards) se istovremeno učita u JS heap. Pri 100 MB raw IDB → ~300 MB JS objekata u jednom trenu (pre nego što se serijalizuju). Na Electron rendereru sa default 4 GB limit ovo padne već na srednje velikim bazama.
**Rizik**: JS heap exhaustion prije nego serijalizator i krene.
**Fix**: Sekvencijalni stream — load → serialize → discard po tabeli. Prepiši `exportData` da `Blob`-uje tabelu po tabelu i odmah pusti referencu (vidi 1.3).

**1.2 `useCardImport.ts:70-76` — `await file.text()` + `JSON.parse(jsonText)` (linija 79)**
Cijeli backup (potencijalno 200 MB+) drži se istovremeno kao **string** (UTF-16 → 2× veličina) **plus** kao parsovani objekat. Na 100 MB JSON-u: ~200 MB string + ~250 MB objekat = ~450 MB peak prije bilo kakve obrade.
**Fix**: Streaming parser ili (pragmatičnije) hard cap + Worker offload — pomeri parsing u worker, transferuj samo final structured payload kroz `postMessage` (clone cost ostaje, ali peak je u worker heap-u, ne u UI).

**1.3 `useCardExport.ts:65` — `chunk.map(JSON.stringify).join(",")`**
`buildJsonChunked` chunkuje samo `cards` niz; `sources/mindMaps/knowledgeBaseArticles` (najteži payload, sa HTML-om) idu kroz **jedan** `JSON.stringify(rest)` u liniji 59. Ako `htmlContent` zbirno bude 80 MB, single-shot stringify alocira 160 MB v8 buffer i blokira main thread sekundama.
**Fix**: Proširiti chunked emitter na sve `array`-bearing tabele; dodati per-table chunking (`__streamFields = ["cards","sources","mindMaps","knowledgeBaseArticles","reviewLog","pomodoroLog",...]`).

**1.4 `useCardExport.ts:24-32` — `String.fromCharCode(...bytes.subarray)` + `btoa`**
Konvertuje cijeli Blob u base64 string da bi ga prebacio kroz Electron IPC. `btoa(binary)` na 50 MB = ~67 MB string + base64 alokacija. `IPC_SIZE_LIMIT_MB = 50` ublažava ali ne riješava — limit je arbitran i izvodi `throw` umjesto stream-a.
**Fix**: Koristiti `electronAPI.saveFileStream(path)` sa chunked write (preload mora exposovati `fs.createWriteStream` wrapper); ili minimum: `arrayBuffer → Uint8Array` direktan transfer kao Buffer (Electron IPC podržava `Buffer` payloads bez base64).

---

### Vektor 2 — Sigurnost transakcije (VISOK)

**2.1 `useCardImport.ts:111-303` — NEMA jedinstvene transakcije**
Import izvršava ~12 odvojenih awaita: `db.cards bulkPut`, `db.categories bulkPut`, `db.reviewLog clear+bulkAdd`, `db.sources bulkPut`, `db.mindMaps bulkPut`, `db.knowledgeBaseArticles bulkPut`, pa zatim petlja po `idbTables` od 11 dodatnih tabela (323-358). Svaki je **zaseban Dexie autocommit**.
**Scenario padanja**: Strategy `overwrite`, fajl validan u Zod-u ali sadrži malformirani `mindMaps[42]` (npr. cyclic structureClone fail). Zakliješte se na `db.mindMaps.bulkPut` (linija 283) — u tom trenutku su `cards`, `categories`, `reviewLog` (ravno obrisan i ponovo upisan) već trajno commit-ovani. **Baza je pola-zamijenjena, korisnik je izgubio originalne kategorije/kartice, a novi backup nije završen.** Catch u liniji 402 prikaže toast i posao stoji.
**Fix**: Obavijesti svu fazu writes u jedan `db.transaction("rw", [db.cards, db.categories, db.reviewLog, db.sources, db.mindMaps, db.knowledgeBaseArticles, db.diary, db.calibrationLog, db.latencyLog, db.slippageLog, db.activityLog, db.disciplineLog, db.pomodoroLog, db.mnemonics, db.majorSystem, db.mnemonicTestLog, db.settings], async () => { ... })`. Sve `bulkPut/bulkDelete/clear` ide unutra, `setCategoryRecords / schedulePersist` van transakcije nakon rezolucije. UI side-effekti u `setTimeout(()=>{...}, 0)` post-commit.

**2.2 `useCardImport.ts:114-124` (overwrite cards block)** je u transakciji **ali samo nad `[db.cards, db.categories]`** — odmah nakon nje (130-213) opet diraju `db.categories.bulkPut` van te transakcije. Nije atomično ni sa cards ni sa kasnijim sources.

**2.3 `useCardImport.ts:226` — `schedulePersist` izvršava async pisanje u IDB** *paralelno* sa `db.sources.bulkPut` (272), `db.mindMaps.bulkPut` (283), itd. Nemamo garanciju redoslijeda; ako persist queue padne, kartice nisu spremljene a ostalo jeste. Treba flush **prije** zatvaranja transakcije.

**2.4 `useCardExport.ts:148-165` — read-side bez `db.transaction("r", ...)`**
Ako tokom export-a (4–8 s na velikoj bazi) korisnik klikne edit kartice, `cards.toArray()` može vratiti pola starog pola novog. Backup tada nije konzistentan snapshot.
**Fix**: `await db.transaction("r", db.tables, async () => { ... allParallel ... })`. Read-tx ne blokira UI, samo MVCC-locks snapshot.

---

### Vektor 3 — Referencijalni integritet / ID kolizije (VISOK)

**3.1 `useCardImport.ts:142-174` — name-based remap je destruktivan**
`existingByName.get(cr.name.toLowerCase())` mapira **importovani UUID → existing UUID** kad imena seko padaju. Edge case: korisnik je **preimenovao** kategoriju lokalno ("Krivično pravo" → "Krivika"), backup ima staro ime sa drugim UUID-om → kartice se silently dodjeljuju **drugoj** kategoriji koja slučajno ima isto staro ime (ako postoji), ili još gore: postaju siročići jer remap se ne primjeni i njihov `categoryId` ne postoji.
Validation u `ExportImportDialog:184-200` provjerava FK protiv unije (file ∪ db) ali **ne** provjerava nakon remap-a. Sources/mnemonics/KB-articles imaju isti remap (162-173), ali ostali entiteti sa `categoryId` (mindMaps `categoryId`, planner config, diary entries) — **nemaju**.
**Fix**:
- Eksplicitan ID-based dedup primary; name-based samo kao opt-in user choice (`strategy === "merge-by-name"`).
- Cjelovit FK pass: nakon remapa, scan `mindMaps.categoryId`, `mnemonics.subcategoryId`, `cards.subcategoryId/chapterId` protiv konačnog category UUID skupa; sve sa orphaned referencom → drop ili reassign na "Nepoznato".

**3.2 `useCardImport.ts:283-289` — `parsed.mindMaps` `bulkPut` bez subjectId remap nakon name-dedup** (treba dodati `m.categoryId` u idRemap loop).

**3.3 `useCardImport.ts:104-110` — `"newer"` strategy poredi po `lastReviewed` ali ne radi remap kategorija prije merge.** Karta sa istim ID-em ali stalim `categoryId` koji više ne postoji se prepisuje, postaje siroče.

**3.4 `useCardExport.ts:185-195` — export ne uključuje `mindMaps.categoryId` integrity**: ako je mindMap kreiran u predmetu koji je obrisan ali mindMap zaboravljen, on će biti exportovan a uvoznik ga uvodi sa nepostojećim `categoryId`.

---

### Vektor 4 — Schema versioning (SREDNJI)

**4.1 Marker postoji** — `useCardExport.ts:186` upisuje `version: 7`. **Ali nigdje** u `useCardImport.ts` ni u `BackupSchema` se taj broj **ne čita za grananje migracija**. Linija 349: `version: z.unknown().optional()` — passthrough bez upotrebe.
**Posljedica**: Backup v3 (pre-UUID, name-based taxonomy) prolazi kroz isti put kao v7. Legacy resolver (`resolveLegacyTaxonomyNames`, 219) je heuristički, nije migration-table. Buduće schema promjene (v8+) neće moći bezbjedno učitati v7 jer nema `migrate(version, payload) → payload` tabele.
**Fix**:
```ts
const BACKUP_SCHEMA_VERSION = 7;
const migrations: Record<number, (b: ParsedBackup) => ParsedBackup> = {
  3: (b) => ({ ...b /* legacy name-string→UUID handled separately */ }),
  6: (b) => ({ ...b, settings: b.settings ?? [] }),
};
function migrate(parsed: ParsedBackup): ParsedBackup {
  let v = Number(parsed.version) || 1;
  while (v < BACKUP_SCHEMA_VERSION) {
    const fn = migrations[v];
    if (fn) parsed = fn(parsed);
    v++;
  }
  return parsed;
}
```
Pozvati prije transakcije. Reject backup-a sa `version > BACKUP_SCHEMA_VERSION` ("noviji backup nego app").

**4.2** `version` nije provjeravan u `ExportImportDialog` validaciji (104) — korisnik ne dobije warning kad uvozi `v3` u `v7` app.

---

### Vektor 5 — Event loop starvation (SREDNJI)

**5.1 `useCardImport.ts:115-358` — nijedan `await new Promise(r => setTimeout(r, 0))` između bulkPut faza**
12+ uzastopnih `bulkPut`-ova bez yield-a. Dexie bulkPut je async, ali sa 50k zapisa V8 može držati main thread 200-400 ms u jednom putku. Progress bar u `ExportImportDialog.tsx:265-272` koristi **fake `setInterval(+5)`** koji ne odražava stvarni napredak — UI laže. Stvarni progress callback ne postoji.
**Fix**:
- Yield helper: `const yieldUI = () => new Promise(r => (typeof scheduler !== 'undefined' && (scheduler as any).yield ? (scheduler as any).yield() : setTimeout(r, 0)));` poziv između tabela.
- Real progress: `importData(file, strategy, onProgress)` signature; emit `(pct, label)` poslije svake tabele. ExportImportDialog ukloni fake `tick`.

**5.2 `useCardImport.ts:79` — `JSON.parse` na 100 MB blokira ~3-5 s.** Glavni thread mrtav, ZIP worker idle.
**Fix**: Premjestiti parse u worker. `zip-worker.ts` je već infra; dodaj action `"parseJson"` koji vraća strukturirani objekat (clone cost ~150ms vs 5s blokade).

**5.3 `useCardImport.ts:154-173` — 4 `for` petlje preko `merged`/`nextMap`/`sources`/`mnemonics`/`articles` za remap.**
Sve sinhrono. Na 50k kartica + 5k sources, spojeno O(N×M) zbog `idRemap.get` nije problem (Map O(1)), ali **iteracije su sinhrone**.
**Fix**: Yield svake 5000 iteracija.

**5.4 `useCardExport.ts:65` — `chunk.map(JSON.stringify).join(",")` po chunk-u od 500 kartica.**
Yield-uje (linija 68) svakih 500 — OK. Ali ostale tabele (vidi 1.3) nemaju chunking.

---

## Konkretni produkciono-spremni fix-evi (faza implementacije)

### A) `src/lib/backup/import-transaction.ts` (NOVI)
Jedinstvena atomična transakcija sa real progress + yield:
```ts
export async function applyImportAtomically(
  parsed: ParsedBackup,
  strategy: ImportStrategy,
  onProgress: (pct: number, label: string) => void,
): Promise<ImportReport> {
  const TABLES = [db.cards, db.categories, db.reviewLog, db.sources, db.mindMaps,
                  db.knowledgeBaseArticles, db.diary, db.calibrationLog,
                  db.latencyLog, db.slippageLog, db.activityLog,
                  db.disciplineLog, db.pomodoroLog, db.mnemonics,
                  db.majorSystem, db.mnemonicTestLog, db.settings];
  const report: ImportReport = { /* ... */ };
  await db.transaction("rw", TABLES, async () => {
    await applyCardsAndCategories(parsed, strategy, report);
    await yieldUI();
    await applySources(parsed, strategy);  // sve unutar iste tx
    await yieldUI();
    // ... sve faze
  });
  return report; // commit garantovan
}
```
Yield UNUTAR Dexie transakcije je sigurno (Dexie tx hold-uje samo IDB lock, ne JS thread).

### B) `src/lib/backup/migrate.ts` (NOVI)
Versioning ladder kao gore (4.1).

### C) `src/lib/backup/export-stream.ts` (NOVI)
Sekvencijalni emitter:
```ts
export async function streamFullBackup(onProgress): Promise<Blob> {
  const parts: BlobPart[] = [];
  parts.push(`{"version":${SCHEMA_VERSION},"type":"full"`);
  await emitTable(parts, "cards", db.cards, onProgress, 0, 30);
  await emitTable(parts, "sources", db.sources, onProgress, 30, 50);
  await emitTable(parts, "mindMaps", db.mindMaps, onProgress, 50, 60);
  // ... itd.
  parts.push("}");
  return new Blob(parts, { type: "application/json" });
}
async function emitTable(parts, key, table, onProgress, p0, p1) {
  parts.push(`,"${key}":[`);
  let i = 0;
  const total = await table.count();
  await table.each(async (row) => {           // streaming cursor — NEMA toArray
    parts.push((i++ ? "," : "") + JSON.stringify(row));
    if (i % 500 === 0) {
      onProgress(p0 + ((i/total)*(p1-p0)), `${key} ${i}/${total}`);
      await yieldUI();
    }
  });
  parts.push("]");
}
```

### D) `src/workers/zip-worker.ts` — proširiti sa `"parseJson"` action
Skida parsing sa main threada (vektor 5.2).

### E) `useCardImport.ts` — refactor
Zamijeni cijeli body sa `applyImportAtomically(migrated, strategy, onProgress)`. Eliminira ~250 LOC neatomičnog koda.

### F) `useCardExport.ts:24-32` — eliminisati base64 IPC
Dodaj `electronAPI.saveFileBytes(path, Uint8Array)`; preload uvija u `fs.writeFileSync(path, Buffer.from(arr))`. Briše 50MB hard-cap.

### G) `ExportImportDialog.tsx:265-272` — ukloniti fake progress tick
Proslijediti realni `onProgress` u `onImport(file, strategy, onProgress)`.

---

## Memory update
`mem://features/backup-restore-hardening` — atomična `db.transaction` preko svih tabela; schema-versioned migration ladder; streaming export bez globalnog `toArray()`; JSON parse u worker-u; real-progress + `scheduler.yield()` između faza.
