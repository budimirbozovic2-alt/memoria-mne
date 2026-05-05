## Faza 1 — Sprečavanje oštećenja podataka

Dva nezavisna problema:

### A1+F1 · CategoryDeletion ostavlja siročiće

`useCategoryManagement.deleteCategory` trenutno briše/repariranje samo `cards` + `sources`. Ostaje siročad u:

| Store / cache | Ključ | Trenutno stanje |
|---|---|---|
| `knowledgeBaseArticles` | `subjectId` | nije dirano |
| `mindMaps` | `categoryId` | nije dirano |
| `mnemonics` | `categoryId` | nije dirano |
| `settings: subject_settings:<id>` | key prefix | nije dirano |
| `plannerConfig.subjectOrder/hardSubjects/phases.categories` | embedded | dangling refs |
| `examiner-profile-cache` (in-mem Map) | `categoryId` | dangling entry |
| `backlink-index` (per-subject) | `subjectId` | dangling subject scope |

Pored toga, postojeći cascade `db.sources.where("categoryId").modify(...)` se izvršava IZVAN bilo kakve transakcije sa drugim brisanjima → mid-flight failure ostavlja djelimično očišćeno stanje.

### F2 · planner-storage konkurentnost

`savePlanner`, `saveDisciplineLog`, `incrementDailyMapped`, `autoRedistributeIfNeeded`, `recordDayDiscipline` rade fire-and-forget `db.settings.put(...).catch(...)` bez serijalizacije. Pri brzim uzastopnim pozivima (Smart-Split worker batchuje `incrementDailyMapped` 3-4× u istom tick-u; `recordDayDiscipline` može da se preklopi sa `saveDisciplineLog`) IndexedDB transakcije se preklapaju → newer-wins na disku može da bude OBRNUTO od newer-wins u memoriji. Cache se odmah ažurira sinhrono, ali IDB stanje može da završi sa starijim payload-om (Lost Update).

---

## Promjene

### 1. Novi fajl: `src/lib/category-deletion-service.ts`

`async function cascadeDeleteCategoryDomains(categoryId): Promise<CascadeResult>`:
- Jedna `db.transaction("rw", [knowledgeBaseArticles, mindMaps, mnemonics, settings], ...)` koja u atomic boundary-ju:
  - briše `knowledgeBaseArticles where subjectId = id`
  - briše `mindMaps where categoryId = id`
  - briše `mnemonics where categoryId = id`
  - briše `settings:subject_settings:<id>`
  - čita `plannerConfig`, skida `id` iz `subjectOrder`/`hardSubjects`/legacy `phases[].categories` i `put`-uje nazad
- POSLIJE commit-a: `invalidateMindMapsCache()`, `clearSubjectSettings(id)`, `invalidateExaminerProfile(id)`, `backlinkIndex.clearSubject(id)`, `invalidateSourcesCache()`.
- Vraća `CascadeResult` (count po domenu) za telemetriju i toast.

Sources + cards i dalje obrađuje orchestrator (jer dijele `cardMapRef` mutaciju i fallback re-parent semantiku).

### 2. Patch `src/lib/backlink-index.ts`

Dodati public `clearSubject(subjectId: string): void` metoda — wipe svih per-subject mapa za taj id. (Trenutno postoji `removeArticle` po-jedan; treba bulk wipe.)

### 3. Patch `src/hooks/useCategoryManagement.ts` · `deleteCategory`

- `await cascadeDeleteCategoryDomains(categoryId)` se poziva PRIJE postojeće sources cascade IIFE (ili merge-ovano u nju).
- Toast greška ostaje na error path.
- Cards/sources path ostaje nepromijenjen — to je već pokriveno postojećim refactor-om.

### 4. Patch `src/lib/planner-storage.ts` · F2 mutex

- Dodati modul-level `let _pendingWrite: Promise<void> = Promise.resolve();`
- Helper `enqueue(op: () => Promise<void>): void` koji chain-uje sve `db.settings.put` / `db.disciplineLog` operacije. In-memory cache mutacija ostaje SINHRONA prije `enqueue` (ref-delta pattern, isto kao `service-layer-pattern`).
- Refaktor: `savePlanner`, `saveDisciplineLog`, `incrementDailyMapped`, `autoRedistributeIfNeeded`-ova dva `db.settings.put`-a — svi prolaze kroz `enqueue`.
- `loadPlanner`, `getDailyMappedCount`, `loadDisciplineLog` čitaju iz cache-a — nepromijenjeni.
- HMR cleanup nije potreban (modul-level Promise se garbage-collect-uje).

### 5. Memory update

Nova memorija `mem://features/data-integrity-v4` (zamjenjuje v3 ref na deletion temu): "Category deletion uses single-transaction cascadeDeleteCategoryDomains across knowledgeBaseArticles/mindMaps/mnemonics/settings + scrubs plannerConfig refs + invalidates examiner-profile/backlink-index/mindmaps/sources caches. Planner-storage IDB writes serialized via promise mutex."

## Bez izmjena

- Nema schema migracija (sve postojeće stores).
- Nema UI promjena.
- `optimisticCategoryUpdate` ostaje SSoT za `categories` tabelu.
- `cards` / `sources` cascade ostaje u orchestratoru.

## Test verifikacija (manuelno)

1. Kreirati subject sa: 1 source, 1 card, 1 article, 1 mindmap, 1 mnemonic, override settings, dodan u `subjectOrder` + `hardSubjects`.
2. Delete subject sa `purgeCards=true`.
3. Provjeriti DevTools → IndexedDB: nijedan red sa tim `categoryId`/`subjectId` ne smije ostati.
4. Otvoriti planner → subject ne smije biti u `subjectOrder` ni `hardSubjects`.
5. Mid-flight: throw u jednoj od `delete` operacija → cijeli batch rollback (Dexie tx semantika).
