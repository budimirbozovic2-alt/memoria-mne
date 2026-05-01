# Problem

Bočni panel ima statičke linkove `/mind-map` i `/mnemonics`, ali te globalne rute više ne postoje u `App.tsx` — postoje samo per‑predmet varijante (`/subject/:categoryId/mind-maps` i `/subject/:categoryId/mnemonics`). Klik na njih vodi na 404 (vidi se i u konzoli).

Ovo je u skladu sa već postavljenim pravilom (Domain Scoping): sve je strogo skopovano po `categoryId`, pa "globalna" mentalna mapa / mnemonika nemaju smisla.

# Rješenje

Reorganizovati grupu "Alati" u sidebaru tako da se Mentalne mape i Memorizacija prikazuju **kao podstavke unutar svakog predmeta**, umjesto kao globalni linkovi.

## Promjene

### 1. `src/components/AppSidebar.tsx`
- Ukloniti konstantu `TOOLS_NAV` i čitavu sekciju "Alati" sa globalnim linkovima `/mnemonics` i `/mind-map`.
- U sekciji "Predmeti", ispod svake stavke predmeta, dodati dva pod‑linka (uvučena, manja ikona):
  - `Mentalne mape` → `/subject/{cat.id}/mind-maps` (ikona `Map`)
  - `Memorizacija` → `/subject/{cat.id}/mnemonics` (ikona `Brain`)
- Pod‑linkovi se prikazuju samo kada sidebar nije `collapsed`.
- Glavni link predmeta ostaje `/subject/{cat.id}` (Subject Dashboard).

### 2. `src/components/Breadcrumbs.tsx`
- Ukloniti zastarele globalne unose `/mnemonics` i `/mind-map` iz mape ruta i iz `LAB_ROUTES` skupa, jer te rute više ne postoje. Per‑predmet rute već se rješavaju kroz postojeću logiku.

### 3. `src/contexts/routing/useCurrentView.ts`
- Ukloniti `mnemonic: "/mnemonics"` iz `VIEW_TO_PATH` (i odgovarajući unos u `VIEW_ACTIVITY_MAP` ako referenciše `mnemonic`) jer odgovarajući globalni view više ne postoji. Ovo sprečava buduće slučajne navigacije na nepostojeću rutu.

# Rezultat

- Nestaju 404 greške za `/mind-map` i `/mnemonics`.
- Bočni panel jasno prikazuje da su ovi alati per‑predmet (što je arhitekturna istina projekta).
- Korisnik iz sidebara može direktno otvoriti Mentalne mape ili Memorizaciju za bilo koji predmet u jednom kliku.
