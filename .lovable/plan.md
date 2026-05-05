## B2 — Dexie query strategija audit + fix

### Audit (read-only nalaz)

| Site | Status | Akcija |
|---|---|---|
| `cards [categoryId+subcategoryId]` (v9, v15→16) | OK | — |
| `cards.where("categoryId/type/sourceId")` | OK indeksirano | — |
| `sources.where("categoryId")` (`loadSourcesByCategory`) | OK indeksirano | — |
| `knowledgeBaseArticles.where("subjectId")` + compound `[subjectId+title]` | OK | — |
| `reviewLog.where("timestamp")` + 90d rolling u `metacognitive-storage` | OK | — |
| `disciplineLog/pomodoroLog/slippageLog` | OK | — |
| Cards in-memory `filter(c.categoryId === X)` u CategoryView/SubjectCardsView/ReviewPage/etc. | **OK — ostaje** | SSOT cache; indexed sub-query bi razbio Single-Source-of-Truth |
| `mindMaps.categoryId` indeks (v8) | NEVER queried | **Ostaje** — SSOT cache + listener (`useMindMapsByCategory` filtrira u memoriji jednom, dijeli ga svi konzumenti) |
| `sources [categoryId+sourceKind]` (v11) | NEVER queried | Mrtav indeks; uklanjanje zahtijeva schema bump + Clean Slate — **ne diram sad** |
| **`mnemonics.categoryId` indeks (v10)** | **NEVER queried — pravi B2 leak** | **FIX** |

**Pravi nalaz**: `loadMnemonicCards()` radi globalni `toArray()` i svi konzumenti (MnemonicModule sa `categoryFilter`, MnemonicWorkshop, MnemonicTest) JS-filter-uju po `categoryId`. Indeks postoji od v10 ali ga niko ne koristi. Pri 9 predmeta × N kartica, scoped view povlači 9× više nego što treba.

### Fix (jedini stvarni potreban rad)

#### 1. `src/lib/mnemonic-storage.ts`
Dodati indexed scoped loader:
```ts
export async function loadMnemonicCardsByCategory(categoryId: string): Promise<MnemonicCard[]> {
  try {
    return await db.mnemonics.where("categoryId").equals(categoryId).toArray();
  } catch (err) {
    console.error("[mnemonic-storage] loadMnemonicCardsByCategory failed", err);
    return [];
  }
}
```
`loadMnemonicCards()` ostaje (koristi je `MnemonicWorkshop`, `MnemonicTest`, `blind-spots.ts`, `TextSelectionTooltip` — global skenovi koji su semantički ispravni jer obuhvataju više predmeta).

#### 2. `src/components/MnemonicModule.tsx`
Inicijalni load i `MNEMONICS_UPDATED` reload prebaciti na `loadMnemonicCardsByCategory(categoryFilter)` kad je `categoryFilter` set; effect dependency dodaje `[categoryFilter]`. Bez `categoryFilter` (global Memo radionica iz menija) ostaje globalni `loadMnemonicCards()`.

### Memory update
`mem://architecture/dexie-query-strategy` — dokumentuj politiku:
- SSOT cache + in-memory filter za sve što ima global listener subscription (cards, sources, mindMaps).
- Indexed `where()` query SAMO kad nema cache layer-a (mnemonics scoped, sources by category za jednokratno učitavanje, KB articles).
- Mrtvi indeksi (`sources [categoryId+sourceKind]`) ostaju do sljedećeg schema bump-a.

### Bez izmjena
- Nema schema migracija (sve potrebne indekse imamo, samo se bolje koriste).
- API back-compat: `loadMnemonicCards` je netaknut; novi loader je dodatak.
- Nula UI promjena.
