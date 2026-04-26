## Plan: 'Kartice' Hub — odvojeno upravljanje karticama za predmet

Jasno razdvojiti **Izvore** (sirovi dokumenti) od **Kartica** (učenje, struktura, mnemonika). Stvoriti novi posvećeni prostor `/subject/:categoryId/cards` koji postaje jedini izvor istine za upravljanje karticama jednog predmeta.

---

### 1. Čišćenje `CategoryView` (Izvori)

`src/views/CategoryView.tsx` postaje strogo "Izvori" view:

- Ukloniti `Tabs` blok sa tri taba (`Kartice`, `Izvori`, `Mentalne mape`).
- Ukloniti uvoze i upotrebe: `CardViewMode`, `CardOrgMode`, `CategoryMindMaps`, `Switch`, `Label`, `BookOpen`, `GitBranch`, `Tabs*`, `Badge` (ako se više ne koristi), `addCard`, `addFlashCard`, `patchCard`, `toggleTag`, `deleteCard`, `setEditingCard`, `orgMode` state, `activeTab` state, `masteryFilter` state, `mindMapCount` query.
- Zadržati: header sa naslovom predmeta, dugmad "Mapa znanja" i "Struktura", `Mastery progress bar` (klik više ne mijenja tab — samo info), `showKnowledge` granu, `SourcesTab` direktno renderovan (bez Tabs wrappera), `SourceReader` full-screen mod, `StructureManagerDialog`.
- Mapa Znanja grana ostaje funkcionalna kao do sada.

Rezultat: `/category/:categoryId` prikazuje **samo izvore** (lista, uvoz, čitač) + opciono mapu znanja.

---

### 2. Ruta i Dashboard wiring

**`src/App.tsx`**:
- Lazy import: `const SubjectCardsView = lazy(() => import("@/views/SubjectCardsView"));`
- Dodati rutu `/subject/:categoryId/cards` sa `ErrorBoundary` + `Suspense`, sa `key={categoryId}` wrapperom radi resetovanja state-a po predmetu (isti pattern kao `SubjectDashboardWrapper`).

**`src/views/SubjectDashboard.tsx`**:
- U `knowledgeBaseCards` array, kartica `Kartice` mijenja `to: "#"` u `to: \`/subject/${categoryId}/cards\``.
- Kratki opis ostaje: "Upravljanje karticama, struktura i mnemonika".

---

### 3. `SubjectCardsView.tsx` — novi Card Hub

Lokacija: `src/views/SubjectCardsView.tsx`. Layout sličan `SubjectDashboard`-u (header sa nazivom + back link na `/subject/:categoryId`), zatim `Tabs` sa 4 unutrašnja taba:

#### Tab 1: **Pregled** (default)
- Reuse `CardViewMode` (već postojeća komponenta), ista props ko u staroj `CategoryView` `cards` tab grani (`addCard`, `addFlashCard`, `patchCard`, `toggleTag`, `deleteCard`, `onEdit` koji navigira na `/edit`).
- Dugme "Nova kartica" već je unutra.
- Filter po mastery, search, tagovi — sve već radi unutar `CardViewMode`.

#### Tab 2: **Pasivno čitanje**
- Novi sub-komponent (npr. `src/components/subject-cards/PassiveReader.tsx`).
- Lista kartica filtrirana po `categoryId` (opciono filter po `subcategoryId` i `chapterId`), sortirana hronološki (`createdAt asc`).
- UI: jedna kartica u centru sa `question` + sve `sections` (sanitizovane HTML), dugmad **"← Prethodna"** / **"Sljedeća →"**, indikator `n / total`, padajući meni za izbor potkategorije/glave.
- **NEMA** FSRS dugmadi (1-4), nema "Prikaži odgovor" — čisti read-through režim. Sadržaj je odmah vidljiv.
- Tastura: `←` / `→` za navigaciju, `Esc` za izlaz iz fokusa.

#### Tab 3: **Struktura**
- Reuse `CardOrgMode` (drag & drop reorder kartica po potkategorijama/glavama; već postoji).
- Dodati iznad njega kratak meni za izbor "Grupiši po: Potkategorija / Glava" (state lokalno; CardOrgMode već grupiše po subkat. — proširenje za 'glava' ako nije, ali koristimo postojeće ponašanje gdje je primarna grupacija po `subcategoryId`).
- Dugme "Otvori Strukturu predmeta" (otvara `StructureManagerDialog` za upravljanje samim potkategorijama/glavama, ne karticama).

#### Tab 4: **Mnemonička radionica**
- Reuse postojeći `MnemonicModule` komponentu, ali filtriran samo na kartice tekućeg predmeta. Dvije opcije:
  - **(Odabrano)** Renderovati `MnemonicModule` direktno; on već prikazuje `subView` menu / workshop / test. Dodaćemo opcioni `categoryFilter` prop u `MnemonicModule` i `MnemonicWorkshop` koji ako je postavljen, filtrira `cards` po `categoryId`. Default = undefined → trenutno globalno ponašanje (`/mnemonics`) ostaje netaknuto.
  - Header `MnemonicModule`-a (h2 naslov + onboarding) postaje opcioni preko `embedded` prop-a kako bi unutar taba bio tiši.

`SubjectMnemonicPage.tsx` i ruta `/subject/:categoryId/mnemonics` se zadržavaju za backward kompatibilnost (ili kasnije uklanjaju; van scope-a).

---

### 4. Tehnička šema

```text
SubjectCardsView
├── Header (back → /subject/:categoryId, naziv predmeta)
└── Tabs
    ├── "Pregled"   → <CardViewMode .../>
    ├── "Čitanje"   → <PassiveReader cards={subjCards} subcategoryNodes/>
    ├── "Struktura" → <CardOrgMode .../>  + dugme StructureManagerDialog
    └── "Mnemonika" → <MnemonicModule embedded categoryFilter={categoryId} />
```

Data izvor — preko `useCardData()` (filter po `categoryId`), `useCategoryData()`, `useCardActions()` (sve već postoji).

---

### 5. Fajlovi

| Fajl | Akcija | Approx LOC |
|---|---|---|
| `src/views/CategoryView.tsx` | Ukloniti `Tabs`/Cards/MindMaps; ostaviti samo Sources + Mapa znanja | -90 / +5 |
| `src/views/SubjectCardsView.tsx` | **NOVO** — hub sa 4 taba | ~140 |
| `src/components/subject-cards/PassiveReader.tsx` | **NOVO** — chronological viewer bez grading | ~110 |
| `src/App.tsx` | +lazy import + ruta `/subject/:categoryId/cards` | +5 |
| `src/views/SubjectDashboard.tsx` | `to:` za 'Kartice' karticu → `/subject/${categoryId}/cards` | 1 |
| `src/components/MnemonicModule.tsx` | +opcioni `categoryFilter`, `embedded` props; primjeniti filter prije računanja `stats` i prosljedjivanja u `MnemonicWorkshop` | ~15 |
| `src/components/MnemonicWorkshop.tsx` | Prihvatiti i koristiti `categoryFilter` na ulaznoj listi (ako nije već filtrirana) | ~5 |

**Ukupno: ~7 fajlova, ~290 dodatih linija, ~90 uklonjenih.** Backward-compatible: `/mnemonics` i `/subject/:id/mnemonics` rute nastavljaju da rade.

---

### 6. Out-of-scope

- Nema izmjena u FSRS, učenju, Zettelkastenu ni Mind Map modulima.
- `CategoryMindMaps` ostaje dostupan preko postojeće `/subject/:categoryId/mind-maps` rute (već postoji u sidebaru / dashboardu); ne premiještamo ga.
