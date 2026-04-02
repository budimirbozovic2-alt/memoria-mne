

# Sljedeća faza: Čišćenje storage.ts mrtvih ostataka + mnemonic-storage localStorage helpers

## Rezime

Nakon svih dosadašnjih refaktora (SpeedReader dekompozicija, useCards kontekst razdvajanje, cognitive-analytics modularizacija), preostaje **mrtav kod i duplicirani localStorage helperi** u dva storage fajla.

---

## Problem

### 1. `src/lib/storage.ts` — mrtav kod
- `loadReviewLog()` (L51-53): **potpuno nekorištena** — nijedan fajl je ne importuje. Bootstrap koristi `idbLoadReviewLog()` iz `db.ts`.
- `REVIEW_LOG_KEY` konstanta (L46): nekorištena nakon brisanja `loadReviewLog`.
- `loadFromStorage`/`saveToStorage` generički helperi (L31-42): koriste se samo za `LearnProgress` i `lastBackup`. Ovi su legitimni (LearnProgress je sessionStorage-nivo podatak, ne zaslužuje IDB overhead), ali helper funkcije su duplikat istih u `mnemonic-storage.ts`.

### 2. `src/lib/mnemonic-storage.ts` — mrtvi localStorage helperi
- `loadFromStorage`/`saveToStorage` (L55-66): definirane ali **nigdje korištene** u aktivnom kodu. Bile su za pre-migraciju pristup; sve aktivne funkcije sada koriste `db.*` (IDB).
- `MNEMONIC_CARDS_KEY`, `MAJOR_SYSTEM_KEY`, `MNEMONIC_TEST_LOG_KEY` (L37-39): koriste se samo u `migrateMnemonicsFromLocalStorageToIDB()` — migracija se izvršava jednom i postavlja flag. Ovi ključevi su legitimni (migration code), ali helperi su mrtvi.

---

## Promjene po fajlovima

### 1. `src/lib/storage.ts` (~15 linija manje)

**Obrisati:**
- `loadReviewLog()` funkciju (L51-53)
- `REVIEW_LOG_KEY` konstantu (L46)

**Zadržati:**
- `loadFromStorage`/`saveToStorage` helperi — koriste ih `loadLearnProgress`, `saveLearnProgress`, `getLastBackupTime`, `setLastBackupTime`
- `ReviewLogEntry` tip — 29+ fajlova ga importuje
- Sve ostale aktivne funkcije

### 2. `src/lib/mnemonic-storage.ts` (~15 linija manje)

**Obrisati:**
- `loadFromStorage` helper (L55-62) — nekorišten u aktivnom kodu
- `saveToStorage` helper (L64-66) — nekorišten u aktivnom kodu

**Zadržati:**
- Migracijska funkcija (`migrateMnemonicsFromLocalStorageToIDB`) — koristi direktne `localStorage.getItem` pozive, ne helpere
- `MNEMONIC_CARDS_KEY`, `MAJOR_SYSTEM_KEY`, `MNEMONIC_TEST_LOG_KEY` — koriste se u migraciji
- Sve IDB-bazirane funkcije

### 3. Provjera: `src/hooks/useCardImport.ts`

Verifikovati da ne importuje `loadReviewLog` — prema grep rezultatima, ne importuje.

---

## Scope
- 2 fajla, ~30 linija obrisano
- Čisto brisanje mrtvog koda — nema promjene ponašanja
- Nema novih zavisnosti
- FSRS: netaknut

