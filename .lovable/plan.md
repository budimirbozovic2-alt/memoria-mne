# Standardizacija naziva: "Uređivanje i raspored kartica" + "View ↔ Org"

Cilj: jedan vokabular za isti koncept svuda u aplikaciji.

## Kanonski rječnik (referenca)

| Koncept | Kanonski tekst |
|---|---|
| Top-level tab kartica | **Uređivanje i raspored kartica** |
| Pod-mode (lista, pregled, edit) | **View — pregled i uređivanje** |
| Pod-mode (DnD, raspored, struktura) | **Org — struktura i raspored** |
| Sažeti opis u dashboardu/tile-u | "Uređivanje i raspored kartica" |
| Mali pomenski tekst (legacy) | "Org — struktura i raspored" |

Sve postojeće varijante poput "Upravljanje karticama", "Struktura i raspored", "Struktura" (kao naziv moda) treba uskladiti sa ovim.

## Mjesta za izmjenu

### 1) `src/views/SubjectDashboard.tsx` (linija 108)
Tile "Kartice" `desc` trenutno glasi: *"Upravljanje karticama, struktura i mnemonika"*.
- Promijeniti na: **"Uređivanje i raspored kartica"** (mnemonika je uklonjena iz hub-a — vidjeti memoriju `subject-cards-hub-v2`).

### 2) `src/views/SubjectCardsView.tsx`
- Dodati `title` i `aria-label` na dva pod-mode dugmeta radi konzistentnosti i pristupačnosti:
  - View dugme → `title="View — pregled i uređivanje kartica"`, `aria-label` isto.
  - Org dugme → `title="Org — struktura i raspored kartica"`, `aria-label` isto.
- (Vidljivi tekst i ikonice ostaju isti — već su kanonski.)
- Komentar `{/* ── Group: Upravljanje ── */}` (linija 184) preimenovati u `{/* ── Group: Kartice ── */}` da ne zavarava buduće čitače koda.
- Komentar `{/* Segmented sub-mode switch: Edit ↔ Structure */}` (linija 212) → `{/* Segmented sub-mode switch: View ↔ Org */}`.

### 3) `src/components/category/SubjectHierarchyTree.tsx` (linija 233)
Prazan-state poruka: *"Nema potkategorija. Dodaj ih u \"Struktura i raspored\"."* upućuje na nepostojeći naziv.
- Promijeniti na: **"Nema potkategorija. Dodaj ih u \"Org — struktura i raspored\"."**

### 4) `src/components/card-form/MetadataSection.tsx` (linija 117)
Hint: *"Koristite \"Struktura\" dugme u prikazu kategorije za dodavanje glava."*
- Promijeniti na: **"Koristite \"Org — struktura i raspored\" u prikazu kartica za dodavanje glava."**

## Šta se NE dira

- Interni state ključevi `manageMode: "edit" | "structure"`, ruta `/edit`, `EditPage`, `Breadcrumbs["/edit"] = "Uređivanje"`, `setEditMode` u source readeru, `editMode` u `WorkshopCardItem`, `useCardOrgDnd` — to su tehnički/UI-nezavisni identifikatori.
- `StructureManagerDialog` naslov "Struktura — {categoryName}" — dijalog je posebna komponenta za uređivanje hijerarhije, ne odnosi se na pod-mode.
- `localStorage` ključevi i `EditReturnSnapshot` logika.

## Rezultat

Korisnik svuda u UI-u vidi isti rječnik: "Uređivanje i raspored kartica" kao top-level i "View — pregled i uređivanje" / "Org — struktura i raspored" kao pod-modovi. Sve poruke koje upućuju korisnika na neki od ovih ekrana koriste tačan naziv tog ekrana.
