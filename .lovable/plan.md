

# Analiza usklađenosti uputstava sa stvarnim funkcijama

## Pregledani sadržaji
- **5 onboarding modala**: AppOnboarding, DashboardOnboarding, LearnOnboarding, ReviewOnboarding (review-constants.ts), MnemonicOnboarding
- **6 InfoPanel-a**: Podešavanja, Statistika, Strateški planer, Mnemo radionica, Dnevnik, Speed Reader
- **3 ShortcutsHint-a**: Learn (free/active-recall/chain), Review

---

## Pronađene neusklađenosti

### 1. AppOnboarding — pogrešna lokacija backup-a
**Fajl:** `src/components/AppOnboarding.tsx`, zadnji slide, bullet 3
**Piše:** `"Backup podataka je dostupan u Bazi podataka (Export/Import)"`
**Stvarno:** Export/Import je u **Podešavanja → Sistem tab** (`SRSettingsPanel.tsx` → `SystemTab.tsx`). Nema nikakve "Baze podataka" sekcije u navigaciji.
**Popravka:** Zamijeniti sa `"Backup podataka je dostupan u Podešavanja → Sistem (Export/Import)"`

### 2. ReviewOnboarding — netačni intervali za ocjene
**Fajl:** `src/components/review/review-constants.ts`, slide 4
**Piše:** `"1 — Potpuno nepoznato (~20 min)\n2 — Poznato bez detalja (max 24h)"`
**Stvarno:**
- Ocjena 1 daje stability 0.1 dana = ~2.4 sata (ne 20 minuta)
- Ocjena 2 daje stability 1 dan, ali interval ovisi o targetRetention — pri 95% retenciji to je ~0.05 dana za novu karticu
- Ovi intervali su **dinamički** i zavise od stanja kartice, pa fiksne vrijednosti u onboardingu uvijek mogu biti netačne
**Popravka:** Ukloniti fiksne vremenske oznake i zamijeniti ih kvalitativnim opisom: `"1 — Ponovo uskoro\n2 — Kratak interval\n3 — Interval raste\n4 — Maksimalan rast"`

### 3. ReviewOnboarding — neusklađeni nazivi ocjena
**Fajl:** `src/components/review/review-constants.ts`, slide 4
**Piše:** Koristi `"Potpuno nepoznato"`, `"Poznato bez detalja"`, `"Sa ključnim detaljima"`, `"Savršeno"`
**Stvarno u UI-u:** Grade labels su `"Ponovo"`, `"Teško"`, `"Dobro"`, `"Lako"` (learn/types.ts) ili `"Opet"`, `"Teško"`, `"Dobro"`, `"Lako"` (spaced-repetition.ts)
**Popravka:** Uskladiti nazive sa stvarnim label-ima koji se prikazuju na dugmadima

### 4. ReviewOnboarding — prečica "N" ne postoji
**Fajl:** `src/components/review/review-constants.ts`, slide 4
**Piše:** `"N bilježi grešku"`
**Fajl:** `review-constants.ts` REVIEW_SHORTCUTS (L72): `{ keys: "N", description: "Zabilježi grešku" }`
**Treba provjeriti:** Da li je "N" shortcut zaista implementiran u ReviewCard.tsx

### 5. Statistika InfoPanel — "kalibracija" opisana kao "sigurnost 1-5"
**Fajl:** `src/components/MyStats.tsx`, L57
**Piše:** `"upoređuje procjenu sigurnosti (1-5) sa stvarnom ocjenom"`
**Stvarno:** Ocjene idu 1-4, ne 1-5
**Popravka:** Zamijeniti `(1-5)` sa `(1-4)`

---

## Usklađeni sadržaji (OK)

- **DashboardOnboarding** — svih 6 slajdova tačno opisuju widgete koji postoje (CoreStats, IdealFocus, StatusIcons, Velocity, Briefing). Toggle opcija u podešavanjima postoji (PersonalizationTab.tsx).
- **LearnOnboarding** — tri režima (free, active-recall, chain) tačno opisani. Chain zahtjev ≥3 modula potvrđen u kodu. Ocjena 4 za napredak potvrđena.
- **MnemonicOnboarding** — mentalni video, akronim, major sistem i testiranje svi postoje u MnemonicModule/Workshop.
- **AppOnboarding** — "Mapa znanja" opis sa Navigator/Auditor tačan (postoji u CategoryView). Ctrl+K pretraga postoji. Ostali opisi (Učenje, Konsolidacija, Statistika, Planer, Memorizacija) usklađeni.
- **InfoPanel-i** za Planer, Mnemo radionicu, Dnevnik i Speed Reader — svi tačni.
- **ShortcutsHint** za Learn i Review — prečice odgovaraju implementaciji.

---

## Plan popravki

### Faza 1: Popravka tekstova (3 fajla, ~10 linija)

**Fajl 1: `src/components/AppOnboarding.tsx`**
- L103: Zamijeniti `"Backup podataka je dostupan u Bazi podataka (Export/Import)"` sa `"Backup podataka je dostupan u Podešavanja → Sistem (Export/Import)"`

**Fajl 2: `src/components/review/review-constants.ts`**
- L46: Promijeniti opis Fokusiranog utvrđivanja — `"S<5d"` zamijeniti sa razumljivijim opisom
- L58: Opis najtežih — `"Leech kartice (≥5 padova)"` je tačan (leechThreshold=5), ali `"D>7"` treba provjeriti — u kodu piše `section.difficulty > 7` pa je OK
- L64: Zamijeniti fiksne intervale kvalitativnim opisom i uskladiti nazive ocjena sa UI labels

**Fajl 3: `src/components/MyStats.tsx`**
- L57: Zamijeniti `(1-5)` sa `(1-4)`

### Scope
- 3 fajla, ~10 linija promjena
- Bez rizika za funkcionalnost — samo tekst

