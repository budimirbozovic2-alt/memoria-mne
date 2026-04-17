

Analiziram zahtjev. Tri konkretna problema + analiza za dodatna unapređenja.

## Problemi za ispraviti

### 1. Breadcrumb "Laboratorija" → "Alati"
**Fajl:** `src/components/Breadcrumbs.tsx:28`

Trenutno `LAB_ROUTES` set ubacuje "Laboratorija" za stats/metacognitive/mnemonic/planner/speed-reader/mind-map. Promijeniti string "Laboratorija" → "Alati".

### 2. Memorizacija ne prikazuje "Alati" u breadcrumbu
**Fajl:** `src/components/Breadcrumbs.tsx:18`

`LAB_ROUTES` sadrži `/mnemonic` (singular), ali stvarna ruta je `/mnemonics` (plural). Iako je u prethodnoj rundi popravljen `ROUTE_LABELS` key, `LAB_ROUTES` set nije ažuriran. Promijeniti `/mnemonic` → `/mnemonics` u `LAB_ROUTES`.

### 3. Naslov "Podešavanja" žute boje
**Provjera:** Trebam pogledati `SRSettingsPanel.tsx` i `SettingsPage.tsx` da vidim gdje je naslov i koja klasa daje žutu boju.
<lov-tool-use id="toolu_vrtx_01J9oseHq7zmQZecuLj1Mxnn" name="code--search_files" integration-id="code" data="{\"query\": \"Podešavanja\", \"include_patterns\": \"src/components/SRSettingsPanel.tsx,src/views/SettingsPage.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0186iaFZyZrhVJQVhGaxeQM3" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/SRSettingsPanel.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JUb5u4v51KNd3TuAaGTdbo" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/Breadcrumbs.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KjmztvxhHu4mJ4A1sgewug" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/SRSettingsPanel.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01R4A1co858jaV93E2GSkL51" name="code--search_files" integration-id="code" data="{\"query\": \"imperial-title\", \"include_patterns\": \"src/index.css,src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01W18rGdqiuVFxMiY2KUS7MJ" name="code--view" integration-id="code" data="{\"file_path\": \"src/index.css\", \"lines\": \"700-740\"}">
</lov-tool-use>
Now I have enough context. The `imperial-title` class still uses gold color — earlier the user requested all titles to be white. Let me check memory for that.
<lov-tool-use id="toolu_vrtx_0178XktdiJDz5URnmfE3K9bw" name="code--exec" integration-id="code" data="{\"command\": \"grep -r \\\"imperial-title\\\\|--gold\\\" /dev-server/.lovable/memory/ 2>/dev/null | head -20\", \"user_facing_description\": \"Checking memory for title color rules\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PxCWgSaJ7rPapHGNYgVg1g" name="code--view" integration-id="code" data="{\"file_path\": \"mem://ui/layout-and-navigation-v5\"}">
</lov-tool-use>
Confirmed: titles should be white bold. The `imperial-title` class needs updating. Now I have everything needed for the plan.

<lov-plan>

# Plan: UI/UX Konzistentnost — Naslovi, Breadcrumbs, dodatna unapređenja

## Problem analiza

1. **Breadcrumbs prikazuje "Laboratorija"** — naziv ne postoji nigdje u sidebaru (sidebar koristi "Alati"). Stranice Statistika, Dnevnik, Strateški planer, Speed Reader, Mentalne mape pokazuju `Laboratorija › X`.
2. **Memorizacija (`/mnemonics`) ne dobija grupni breadcrumb** — nije u `LAB_ROUTES` setu (ima i tipo: `/mnemonic` umjesto `/mnemonics`).
3. **Naslov "Podešavanja" je žut** — globalna CSS klasa `.imperial-title` koristi `color: hsl(var(--gold))`. Memorija (`layout-and-navigation-v5`) nalaže bijele bold naslove. Klasa se koristi na **11 mjesta** kroz aplikaciju (CardForm, MnemonicWorkshop, MnemonicTest, MajorSystemSettings, BulkImportDialog, ReviewSetup, FrequentErrors, SharedWidgets, FilterSetup, SRSettingsPanel) — sve su trenutno žute, što krši pravilo.

## Izmjene

### 1. `src/components/Breadcrumbs.tsx`
- Preimenovati grupu `"Laboratorija"` → `"Alati"`.
- Dodati `/mnemonics` u `LAB_ROUTES` set.
- Ukloniti dead key `"/mnemonic"` iz `LAB_ROUTES` (već popravljen u `ROUTE_LABELS` ali ostao u setu).
- Rezultat: `Početna tabla › Alati › Statistika`, `Početna tabla › Alati › Mnemo radionica`.

### 2. `src/index.css` — `.imperial-title`
- Promijeniti `color: hsl(var(--gold))` → `color: hsl(var(--foreground))` (bijela u dark temi, tamna u light — ali aplikacija je primarno dark).
- Ovo automatski popravlja naslove na svih 11 mjesta odjednom (uključujući "Podešavanja", "Novi modul", "Najčešće greške", "Mentalne tablice", itd.).

## Dodatna UI/UX unapređenja (mali, sigurni)

### 3. Konzistentnost label-a u Breadcrumbs
- `"/mnemonics": "Mnemo radionica"` → `"/mnemonics": "Memorizacija"` (uskladiti sa sidebar labelom "Memorizacija" iz `AppSidebar.tsx`).

### 4. Sitno čišćenje
- Ukloniti zaostali prazan red u `ROUTE_LABELS` između `/stats` i `/metacognitive` (kozmetika).

## Što NE diram
- Sidebar labeli i grupisanje — već korektno ("Alati").
- Druga upotreba `--gold` boje (npr. `.btn-imperial` border, brand ikona) — ostaju netaknuti.
- Funkcionalna logika ruta.

## Fajlovi
- `src/components/Breadcrumbs.tsx` — 4 male izmjene
- `src/index.css` — 1 linija (color value)

Ukupno: **2 fajla**, ~6 izmijenjenih linija. Globalni efekat na 11 naslova + 5 stranica breadcrumbs-a.

