## Cilj

Dodati **JSON-backup-driven remap** za `card.subcategoryId` i `card.chapterId`. Korisnik upload-uje stari backup → izgradi se mapa `(stari_UUID → ime → novi_UUID)` po imenu unutar iste kategorije → kartice u IDB se ažuriraju da gađaju trenutne, validne UUID-ove.

Fallback: kartice za koje match ne uspije ostaju "neraspoređene" (postojeće ponašanje već popraveno u prethodnom koraku).

## Format backupa (potvrđeno iz `useCardExport.ts`)

```json
{
  "version": 5, "type": "full",
  "cards": [{ "id", "subcategoryId", "chapterId", "categoryId", ... }],
  "categories": [
    { "id": "<uuid>", "name": "Krivično pravo",
      "subcategories": [
        { "id": "<old-uuid>", "name": "Opći dio",
          "chapters": [{ "id": "<old-uuid>", "name": "Glava 1" }, ...] }
      ]
    }
  ]
}
```

Kategorije i podkategorije/glave se exportuju **sa starim UUID-jevima i imenima**. Ovo je cijela osnova za remap.

## Algoritam remapa

Za svaki `oldCard` u backupu koji ima `subcategoryId` ili `chapterId`:

1. Iz **backup categories** izvuci: `oldCat = categoryId`, `oldSubName = name(oldSubId)`, `oldChapName = name(oldChapId)`.
2. U **trenutnoj IDB strukturi** nađi `currentCat` po istom `categoryId` (kategorije su ranije bile stabilne); ako fail → match po `name`.
3. U `currentCat.subcategories` nađi `newSub` po `name === oldSubName` (case-insensitive trim). Isto za `newChap` u `newSub.chapters`.
4. Ako `newSub` postoji → pripremi update: trenutna kartica sa `id === oldCard.id` dobija `subcategoryId: newSub.id` (i `chapterId: newChap?.id ?? ""`).

Ključno: match radimo **po `card.id`** (Card UUID je stabilan kroz exporte), tako da preciznost remapa zavisi samo od toga je li ta kartica bila u backupu.

Kartice koje:
- nisu u backupu → ostaju kakve jesu (mogu se kasnije očistiti Health Monitor-om)
- imaju oldSubName ali ime više ne postoji u trenutnoj strukturi → reset (`""`)

## Implementacija

### 1. Novi modul `src/lib/migrations/remap-from-backup.ts`

```ts
export interface BackupRemapReport {
  cardsInBackup: number;
  matchedCards: number;          // u IDB-u nađene po id
  remappedSubcategory: number;
  remappedChapter: number;
  resetSubcategory: number;      // ime nije nađeno u trenutnoj strukturi
  resetChapter: number;
  skippedSameId: number;         // već gađa pravu strukturu
  errors: string[];
}

export async function remapFromBackup(
  backupJson: unknown,
  options?: { dryRun?: boolean }
): Promise<BackupRemapReport>;
```

Logika:

- Parsira backup, validira `type === "full" || "template"`, validira shape.
- Gradi `oldSubIdToInfo: Map<string, {catId, subName, chapters: Map<chapId, chapName>}>` iz `backup.categories`.
- Učita `db.categories.toArray()` i `db.cards.toArray()`.
- Gradi `currentSubByName: Map<categoryId, Map<subNameNormalized, subId>>` i isto za chapters (po sub).
- Iterira **kartice iz backupa**, za svaku traži trenutnu po `id`. Kalkuliše patch.
- Ako ne `dryRun`: bulk `db.cards.update(...)` u jednoj transakciji `db.transaction("rw", db.cards, ...)`.
- Vraća detaljan izvještaj.

### 2. UI dialog `src/components/RemapFromBackupDialog.tsx`

Mali, fokusiran modal:

- File input (`.json` / `.zip`). Za zip: koristi postojeći `@/lib/zip-service` ili `JSZip` (provjerit ću je li već zavisnost) da raspakuje prvi `.json`.
- **Korak 1 — Analiza (dry run)**: parsiraj + pokreni `remapFromBackup({ dryRun: true })`. Pokaži tabelu izvještaja: "X kartica u backupu, Y match-ovano u tvojoj bazi, Z će dobiti nove subcategoryId, W chapterId, R neće naći match → reset".
- **Korak 2 — Potvrda**: dugme "Primijeni remap" → poziva bez `dryRun`. Toast sa rezultatom. Emituje `eventBus.emit(EVENT_TYPES.CARDS_UPDATED)`.
- Cancel u svakom trenutku. Greške parsiranja prikažu se inline.

### 3. Integracija u `HealthMonitor.tsx`

U postojećoj sekciji "Zastarjele veze sa strukturom" (Alert) dodati **drugo dugme** pored "Očisti zastarjele veze":

```
[ Remap iz backupa ]   [ Očisti zastarjele veze ]
```

"Remap iz backupa" otvara `RemapFromBackupDialog`. Po završetku → `refresh()` Health Monitor-a.

### 4. Tipovi i validacija

`src/lib/migrations/backup-schema.ts` (mali, samo za remap):

```ts
interface BackupCategory { id: string; name: string; subcategories?: BackupSub[]; }
interface BackupSub { id: string; name: string; chapters?: BackupChap[]; }
interface BackupChap { id: string; name: string; }
interface BackupCard { id: string; categoryId?: string; subcategoryId?: string; chapterId?: string; }
interface MinimalBackup { categories: BackupCategory[]; cards: BackupCard[]; }
```

Type-guard `isMinimalBackup(json): json is MinimalBackup` koji odbacuje sve što nema oba polja kao nizove.

### 5. ZIP support

Provjerit ću `package.json`: ako `jszip` već postoji (vjerovatno da, jer `zip-service` ga koristi za export) → reuse. Inače čisti `.json` only u prvoj iteraciji.

## Fajlovi

- **Novo:** `src/lib/migrations/backup-schema.ts` (~30 linija) — tipovi + type-guard.
- **Novo:** `src/lib/migrations/remap-from-backup.ts` (~120 linija) — core algoritam.
- **Novo:** `src/components/RemapFromBackupDialog.tsx` (~200 linija) — file input, dry-run analiza, apply, izvještaj.
- **Izmjena:** `src/components/HealthMonitor.tsx` — dodati "Remap iz backupa" dugme u već postojeći "Zastarjele veze" Alert + state za otvaranje dialoga.

## Garancije

- **Idempotentno**: ponovno pokretanje sa istim backupom ne radi ništa novo (već bi `current.sub === backup.sub` po imenu).
- **Bezbijedno**: nikad ne mijenja `categoryId`, `question`, `sections`, FSRS state. Samo `subcategoryId` i `chapterId`.
- **Transparentno**: dry-run pokazuje tačno šta će se promijeniti **prije** apply.
- **Ne briše**: kartice koje nisu u backupu ostaju netaknute.
- **Bez gubitka podataka**: ako match po imenu ne uspije, kartica završi u "Neraspoređeno" — ista kao trenutno stanje, ne gore.