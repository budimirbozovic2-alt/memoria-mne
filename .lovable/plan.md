

# Audit: Tražene izmjene vs. trenutno stanje koda

## FAZA 1: "Pure UUID" Arhitektura

### 1.1 `src/hooks/useCategoryManagement.ts` — renameCategory
**STATUS: NIJE URAĐENO — KRITIČNO**

Problem: `renameCategory` (line 49) radi `c.categoryId === oldName` i postavlja `categoryId: newName`. Ovo je **name-based logika** — mijenja categoryId kartica sa starog imena na novo ime. U UUID sistemu, rename treba samo ažurirati `name` polje u CategoryRecord, a kartice **ne dirati** jer one već pokazuju na UUID.

Takođe, `deleteCategory` (line 82-95) radi `c.categoryId === name` — name-based poređenje. `addCategory` (line 25) dodaje `name` string u `categories[]`, ali categories je sada UUID[].

Subcategory operacije (line 61-63, 129-131) koriste `next[oldName]` / `delete next[name]` — ali subcategories su sada keyed by UUID (bootstrap to radi po `r.id`). Ovo je **konfuzija**: bootstrap stavlja UUID ključeve, ali rename/delete operišu po imenu.

**Potrebne izmjene:**
- `renameCategory(oldName, newName)` → trebao bi primati `categoryId: string, newName: string`, ažurirati samo CategoryRecord.name u IDB, ne dirati kartice
- `deleteCategory(name)` → trebao bi primati `categoryId: string`, porediti `c.categoryId === categoryId`
- Subcategory keys u `setSubcategories` moraju koristiti UUID, ne name

### 1.2 `src/hooks/useCards.ts` — Statistika
**STATUS: DJELIMIČNO URAĐENO**

`useMemo` blok (line 170-251) ima UUID→name mapu i koristi `uuidToName[card.categoryId]`. Ali:
- `catAccum` se inicijalizuje iz `categories` (line 186-189) — `categories` je sada UUID[], pa `catAccum[uuid]` je OK
- `finalCatStats` (line 236) iterira `categories` (UUID[]) i vraća stats keyed by UUID — ali komentari kažu "keyed by NAME" i koristi `catName` (line 193) koji je **ime**, ali accumulator key je `catName` — koji je ime. Dakle `catAccum` je keyed by **name** ali `categories` su UUID[], pa inicijalizacija `catAccum[cat]` gdje `cat` = UUID **neće matchovati** `catAccum[catName]` gdje `catName` = ime.

**BUG:** Line 186 `catAccum[cat]` inicijalizuje po UUID, ali line 215 `catAccum[catName]` pristupa po imenu. Ovo je **nekonzistentno** i gubi podatke.

**Potrebna izmjena:** Statistika treba biti **isključivo UUID-keyed**. Ukloniti `uuidToName` translaciju za accumulator key — koristiti `card.categoryId` direktno.

### 1.3 `src/hooks/useCards.ts` — `reorderCategories` (line 254-270)
**STATUS: NIJE URAĐENO**

Koristi `byName` mapu (line 259) — `existing.map(c => [c.name, c])`. Treba koristiti `byId` — `existing.map(c => [c.id, c])`. Ordered je sada UUID[], pa lookup po imenu neće pronaći ništa.

### 1.4 `src/hooks/useCards.ts` — `reorderSubcategories` (line 273-289)
**STATUS: NIJE URAĐENO**

Line 280: `cat.name === category` — ali `category` parametar je sada UUID. Treba biti `cat.id === category`.

### 1.5 `src/lib/planner-storage.ts` — calcPhaseProgress
**STATUS: URAĐENO** ✅

Line 134: `phase.categories.includes(c.categoryId)` — koristi UUID pravilno (pretpostavljajući da `phase.categories` čuva UUID-ove).

### 1.6 `src/lib/forum-logic.ts` — calculateForumState
**STATUS: DJELIMIČNO OK**

Koristi `card.categoryId` kao ključ (line 232-233). Monument types lookup (line 255) radi `monumentTypes[cat]` gdje `cat` = categoryId (UUID). Ali `saveMonumentType` (line 36-40) prima `category: string` — ako UI šalje ime umjesto UUID-a, nema podudaranja. **Treba provjeriti pozivaoce.**

### 1.7 `src/hooks/useCardImport.ts` — UUID translacija pri uvozu
**STATUS: TREBA PROVJERITI DETALJNIJE** — ali import već prima `category` kao string i prosljeđuje ga u `createCard`. Ako forma šalje UUID, OK. Ako šalje ime — bug.

### 1.8 `src/lib/planner-storage.ts` — calcDynamicPhaseDates fantomski dani
**STATUS: NIJE URAĐENO**

Line 150: `Math.max(1, ...)` — daje minimum 1 dan čak i kad `remainingCards === 0`. Treba `remainingCards === 0 ? 0 : Math.max(1, ...)`.

### 1.9 `src/lib/planner-storage.ts` — getSmartSuggestion prošli ispit
**STATUS: NIJE URAĐENO**

Line 174: `Math.max(1, differenceInDays(effectiveGoal, new Date()))` — ako je effectiveGoal u prošlosti, `differenceInDays` vraća negativan broj, `Math.max(1, ...)` daje 1, i `remaining / 1` = ogromna kvota.

### 1.10 `src/lib/cognitive-analytics.ts` — isNaN guard
**STATUS: NIJE URAĐENO**

Line 141: `const examDate = examDateStr ? new Date(examDateStr) : null` — nema `!isNaN(examDate.getTime())` provjere.

---

## FAZA 2: Render Guards & Double Fetch

### 2.1 `src/hooks/useCards.ts` — Dupli fetch
**STATUS: URAĐENO** ✅

Nema useEffect koji ponovo poziva `idbLoadCards()`. Bootstrap je jedini data loader. `ready` = `bootstrapReady || forceReady` (line 55). Čisto.

### 2.2 Ready guard na rutama (LearnPage, ReviewPage, RomanForumPage)
**STATUS: NIJE URAĐENO**

- `LearnPage.tsx` — nema `if (!ready)` guard
- `ReviewPage.tsx` — nema `if (!ready)` guard
- `RomanForumPage.tsx` — nema `if (!ready)` guard

Ove komponente odmah renderuju UI i pokreću sesiju bez provjere `ready`.

---

## FAZA 3: Electron Main Process

### 3.1 `window.cjs` — Sintaksna greška u dialog.showErrorBox
**STATUS: NEMA BUGA**

Line u `window.cjs` — string `'Aplikacija se neprestano ruši'` i `'Renderer proces je pao više od 3 puta...'` su obični jednolinijski stringovi. **Nema multi-line syntax error.** Ovo je čisto.

### 3.2 `window.cjs` — IPC Curenje memorije
**STATUS: DJELIMIČNO URAĐENO**

`render-process-gone` handler (line 158-168) **već poziva** `ipcMain.removeListener` za minimize/maximize/close i `ipcMain.removeHandler('window-is-maximized')` prije `win.destroy()`. Ali — `win.on('closed')` cleanup **ne postoji** za normalno zatvaranje (bez crasha). Ako korisnik zatvori prozor normalno, IPC listeneri ostaju.

### 3.3 `backup.cjs` — Viseći Promise
**STATUS: DJELIMIČNO URAĐENO**

Line 118-124: `Promise.race` sa timeout-om od 5s postoji. Ali `ipcMain.once('quit-backup-done')` listener ostaje ako timeout pobijedi — nikada se ne uklanja. **Memory leak pri svakom restartu ako timeout pobijedi.**

---

## FAZA 4: Utilities & Edge Cases

### 4.1 `src/views/CategoryView.tsx` — Infinite Loading
**STATUS: TREBA PROVJERA**

Line 28-31: `useLiveQuery(() => db.categories.get(categoryId))` — vraća `undefined` dok se učitava **i** ako ne postoji. Ali line 109+ vjerovatno provjerava `if (!category)`. Treba pogledati kako se `undefined` vs `null` handluje.

### 4.2 `src/lib/zip-service.ts` — macOS __MACOSX
**STATUS: NIJE URAĐENO**

Line 27: `Object.keys(zip.files).find((n) => n.endsWith(".json"))` — ne filtrira `__MACOSX` fajlove.

### 4.3 `src/lib/cognitive-analytics.ts` — isNaN guard
**STATUS: NIJE URAĐENO** (kao gore)

---

## Sažetak — Šta TREBA uraditi

| # | Fajl | Izmjena | Prioritet |
|---|------|---------|-----------|
| 1 | `useCategoryManagement.ts` | Prebaciti rename/delete na UUID umjesto imena | KRITIČNO |
| 2 | `useCards.ts` useMemo | Fix catAccum key inconsistency (UUID vs name) | KRITIČNO |
| 3 | `useCards.ts` reorderCategories | `byName` → `byId` lookup | HIGH |
| 4 | `useCards.ts` reorderSubcategories | `cat.name ===` → `cat.id ===` | HIGH |
| 5 | `LearnPage.tsx`, `ReviewPage.tsx`, `RomanForumPage.tsx` | Dodati `if (!ready)` guard sa spinner | HIGH |
| 6 | `planner-storage.ts` calcDynamicPhaseDates | Ne davati 1 dan kad `remainingCards === 0` | MODERATE |
| 7 | `planner-storage.ts` getSmartSuggestion | Handle effectiveGoal u prošlosti | MODERATE |
| 8 | `cognitive-analytics.ts` | `!isNaN(examDate.getTime())` guard | MODERATE |
| 9 | `zip-service.ts` | Filtrirati `__MACOSX` u decompressJsonFromZip | LOW |
| 10 | `backup.cjs` | Cleanup `quit-backup-done` listener kad timeout pobijedi | LOW |
| 11 | `window.cjs` | Dodati `win.on('closed')` cleanup za normalno zatvaranje | LOW |
| 12 | `CategoryView.tsx` | Eksplicitno razlikovati `undefined` (loading) od `null` (not found) | LOW |

## Šta je VEĆ urađeno
- Bootstrap koristi UUID-ove (`catRecords.map(r => r.id)`, `subsMap[r.id]`) ✅
- `setCategories` koristi `byId` lookup ✅
- `setSubcategories` koristi `cat.id` ✅
- Nema duplog fetch-a u useCards ✅
- `calcPhaseProgress` koristi `c.categoryId` ✅
- Backup quit ima 5s timeout ✅

## Preporuka za redoslijed implementacije
1. Prvo popraviti **#1 i #2** — to su root-cause bugovi koji uzrokuju da statistika i category operacije ne rade
2. Zatim **#3-4** — reorder operacije
3. Zatim **#5** — ready guards (sprečava crash pri brzoj navigaciji)
4. Ostalo po prioritetu

