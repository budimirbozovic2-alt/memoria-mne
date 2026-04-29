## Cilj

Razdvojiti **internu logiku** preklopnika unutar taba "Uređivanje i raspored kartica" od **prikaznih labela** ("View", "Org", srpski naslovi, tooltipovi). Trenutno su interni ključevi `"edit" | "structure"` već stabilni, ali su sav UI tekst, ikone, kratke oznake i tooltipovi raštrkani inline u `SubjectCardsView.tsx`. Bilo kakva izmjena teksta zahtijeva diranje uvjeta i `aria-*` atributa, što je krhko.

Uvodimo jedan **registry** (mapa rola) kao jedinu istinu — komponenta čita konfiguraciju iz mape, nikad ne poredi po labelima.

## Šta se mijenja

### 1. Novi modul `src/views/subject-cards/manageModes.ts`

Definira:

- **Enum-like konstante** internih ID-jeva rola (stabilne, koriste se svuda u logici i `sessionStorage` snapshotu):
  ```ts
  export const MANAGE_MODE = {
    Edit: "edit",
    Structure: "structure",
  } as const;
  export type ManageMode = typeof MANAGE_MODE[keyof typeof MANAGE_MODE];
  ```
- **Registry** sa svim prikaznim podacima po roli:
  ```ts
  interface ManageModeDescriptor {
    id: ManageMode;          // stabilan interni ključ
    icon: LucideIcon;        // LayoutList | Network
    label: string;           // "Pregled i uređivanje"
    shortTag: string;        // "View" / "Org" — vizualni hint
    tooltip: string;         // dugačak opis za title/aria-label
  }
  export const MANAGE_MODES: ManageModeDescriptor[];        // poredan niz za render
  export const MANAGE_MODE_BY_ID: Record<ManageMode, ManageModeDescriptor>;
  export const DEFAULT_MANAGE_MODE: ManageMode = MANAGE_MODE.Edit;
  export function isManageMode(v: unknown): v is ManageMode;  // type-guard za snapshot restore
  ```

### 2. Refaktor `src/views/SubjectCardsView.tsx`

- Tip `EditReturnSnapshot.manageMode` postaje `ManageMode` (umjesto inline union).
- Početna vrijednost: `useState<ManageMode>(isManageMode(initialSnapshot?.manageMode) ? initialSnapshot.manageMode : DEFAULT_MANAGE_MODE)` — robusno na promjene snapshot formata.
- Dva `<button>` ručno ispisana bloka zamjenjujemo `MANAGE_MODES.map(...)` petljom; sve klase ostaju iste (aktivno = `bg-primary text-primary-foreground`), samo ikona/labela/tooltip dolaze iz deskriptora.
- Conditional render: `manageMode === MANAGE_MODE.Structure` umjesto string literal `"structure"`.
- Render grane ispod (`CardViewMode` vs `CardOrgMode`): isti switch po `MANAGE_MODE.Edit` / `Structure`.

### 3. Ostali pozivni dijelovi

`rg "manageMode"` pokazuje da se polje koristi samo unutar `SubjectCardsView.tsx` i `EditReturnSnapshot` tipa — nema drugih konzumenata. Interni ključevi `"edit"` i `"structure"` ostaju identični kao stringovi, pa **postojeći `sessionStorage` snapshoti i dalje rade** (nema migracije).

## Šta NE mijenjamo

- Vidljive srpske labele i `(View)`/`(Org)` tagove — ostaju isti tekstualno, samo se sad čitaju iz registry-a.
- `sessionStorage` ključeve i format (`useEditReturn` ostaje netaknut).
- `CardViewMode` / `CardOrgMode` API — komponente ne znaju za rolu, samo se mountaju po grani.
- Tabs (manage/read) — to je viši nivo, izvan ovog scope-a.

## Korist

- Promjena teksta "View" → "List" (ili lokalizacija) = jedan red u registry-u, nula `if`-ova.
- Dodavanje treće rele (npr. "Preview") = jedan novi descriptor + grana u JSX switchu.
- `aria-pressed`, `title`, `aria-label`, ikona i labela su uvijek u sinhronizaciji jer dolaze iz iste strukture — nemoguće ih razdvojiti.
- Type-guard `isManageMode` štiti od korumpiranog snapshota.

## Fajlovi

- **Novo:** `src/views/subject-cards/manageModes.ts` (~40 linija).
- **Izmjena:** `src/views/SubjectCardsView.tsx` — import registry-a, refactor `EditReturnSnapshot`, `useState` init, segmented switch render (~30 linija manje boilerplate-a), use-site usporedbe.
