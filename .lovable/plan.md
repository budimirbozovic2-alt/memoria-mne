

# Analiza: Race conditions i arhitektonske neusklađenosti

## Pronađeni problemi

### 1. Race condition u `optimisticCategoryUpdate` (KRITIČAN)

**Fajl**: `src/lib/category-service.ts` L9-28

Problem: Funkcija poziva `updater(prev)` na React stanju (optimistički), zatim **asinhrono** učitava `idbLoadCategories()` i ponovo poziva `updater(current)`. Između ta dva poziva, ako se desi druga category operacija (npr. brzi double-click na "dodaj podkategoriju"), `current` iz IDB-a može biti zastarjelo jer prvi `idbSaveCategories` još nije završen.

```text
T1: addSubcategory("A") → setCategoryRecords(+A) → idbLoad → updater(stale) → idbSave(+A)
T2: addSubcategory("B") → setCategoryRecords(+B) → idbLoad → updater(stale) → idbSave(+B, ali BEZ A!)
```

Rezultat: Druga operacija pregazi prvu u IDB-u. React stanje pokazuje obje promjene, ali IDB ima samo drugu — nakon reloada, prva promjena nestaje.

**Fix**: Umjesto `idbLoadCategories()` + `updater(current)`, koristiti `setCategoryRecords` stanje kao izvor istine i perzistirati direktno to stanje, ili uvesti mutex/serializaciju za IDB operacije.

---

### 2. `deleteCategory` zaobilazi `optimisticCategoryUpdate` (NEUSKLAĐENOST)

**Fajl**: `src/hooks/useCategoryManagement.ts` L67-130

Sve ostale category operacije (add, rename, reorder) koriste `optimisticCategoryUpdate` sa rollback mehanizmom. Ali `deleteCategory` direktno poziva `setCategoryRecords` + ručni `db.categories.delete()` u fire-and-forget async bloku — bez rollbacka ako IDB operacija padne.

**Fix**: Refaktorisati `deleteCategory` da koristi isti `optimisticCategoryUpdate` pattern, ili dodati rollback logiku.

---

### 3. Import remap: kartice mutirane NAKON perzistencije (RACE CONDITION)

**Fajl**: `src/hooks/useCardImport.ts` L99-143

Redoslijed operacija:
1. L99: `schedulePersist({ type: "bulk", cards: merged })` — kartice idu u persist queue
2. L132-136: `importedCards.forEach(card => { card.categoryId = remapped })` — **mutira iste objekte** koji su već u persist queue-u

Problem: `schedulePersist` sa debounce od 16ms može flush-ovati kartice prije ili nakon remapa. Ako flush-uje prije remapa, kartice se snimaju sa starim `categoryId`.

**Fix**: Remap kategorija mora se desiti PRIJE `schedulePersist` poziva.

---

### 4. TTS i SpeedReader koriste localStorage umjesto IDB (NEUSKLAĐENOST)

**Fajlovi**: `src/lib/tts.ts`, `src/hooks/useSpeedReaderEngine.ts`

Ostatak aplikacije je migriran na IDB za podešavanja, ali TTS settings i speed reader TTS mode (`sr-tts-mode`) još uvijek koriste čist localStorage. Ovo znači da se ovi podaci NE uključuju u backup/restore flow (jer se ne čitaju iz IDB tabela, niti su u `localStorageData` export listi).

---

### 5. `isAutoBackupOverdue` čita iz pogrešnog ključa (NEUSKLAĐENOST)

**Fajl**: `src/lib/app-settings.ts` L165-170

Čita `localStorage.getItem("sr-last-backup")`, ali `setLastBackupTime` u `storage.ts` zapisuje u IDB pod ključem `"sr-last-backup"`. Funkcija `isAutoBackupOverdue` nikad ne čita iz IDB-a, pa ako je localStorage prazan (očišćen ili novi tab), backup podsjetnik neće raditi čak i kad je backup zaista overdue.

---

### 6. Module-level `_mapVersion` cache nije otporan na HMR (MINOR)

**Fajl**: `src/lib/persist-queue.ts` L17-30

`_mapVersion`, `_cachedVersion` i `_cachedArray` su module-level varijable. Prilikom HMR-a (development), modul se ponovo evaluira, resetujući ove varijable na početne vrijednosti, dok React stanje (`cardMap`) ostaje isto. To može uzrokovati stale `mapToArray` rezultate u developmentu (ne u produkciji).

---

## Sažetak po prioritetu

| # | Problem | Ozbiljnost | Fix kompleksnost |
|---|---------|------------|-------------------|
| 1 | `optimisticCategoryUpdate` race | KRITIČAN | Srednja — dodati serializaciju |
| 3 | Import remap nakon persist | KRITIČAN | Niska — premjestiti remap prije persist |
| 2 | `deleteCategory` bez rollbacka | SREDNJI | Niska — ujednačiti pattern |
| 5 | `isAutoBackupOverdue` čita pogrešan izvor | SREDNJI | Niska — dodati IDB fallback |
| 4 | TTS/SpeedReader na localStorage | NIZAK | Niska — migrirati na IDB |
| 6 | HMR cache reset | NIZAK | Zanemarljivo — samo dev |

## Predloženi plan fixa

### Fajl 1: `src/lib/category-service.ts`
- Dodati promise-based mutex (`_pendingSave`) koji serializuje IDB operacije
- Umjesto `idbLoadCategories()` → `updater(current)`, koristiti stanje iz `setCategoryRecords` callback-a direktno za persist

### Fajl 2: `src/hooks/useCardImport.ts`
- Premjestiti category ID remap blok (L117-144) ISPRED `schedulePersist` poziva (L99)

### Fajl 3: `src/hooks/useCategoryManagement.ts`
- Refaktorisati `deleteCategory` da koristi rollback pattern konzistentan sa ostatkom

### Fajl 4: `src/lib/app-settings.ts`
- `isAutoBackupOverdue`: dodati async IDB fallback za `getLastBackupTime()`

## Scope
- 4 fajla, ~50 linija neto promjena
- Kritični fixevi (1 i 3) su backward-compatible
- Nema novih zavisnosti

