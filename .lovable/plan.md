# Plan: Diskretnija integracija Mentalnih mapa i Memorizacije unutar predmeta

## Cilj
- Ukloniti podstavke "Mentalne mape" i "Memorizacija" iz bočnog navigacionog panela ispod svakog predmeta.
- **Memorizaciju** dodati kao suptilnu malu ikonicu u zaglavlju stranice kartica (desni kraj reda sa naslovom predmeta), bez narušavanja postojeće strukture.
- **Mentalne mape** integrisati kao novi tab unutar `SourcesTab` pored "Propisi" i "Skripte", sa listom postojećih mapa za predmet i dugmetom za kreiranje na dnu (vodi na postojeću stranicu).

## Izmjene po fajlovima

### 1. `src/components/AppSidebar.tsx`
- Ukloniti `SUBJECT_TOOLS` konstantu i `Map`/`Brain` importe.
- Ukloniti blok koji renderuje podstavke (linije ~98–114) ispod svakog predmeta.
- Sidebar predmeta vraća se na čistu listu — samo naziv + due badge.

### 2. `src/views/SubjectCardsView.tsx` (Memorizacija — diskretna ikonica)
- U header redu (gdje se nalazi naslov, esej/blic badge-ovi i "Nazad na uređivanje" dugme), na **suprotnoj strani** od naslova dodati malu ikonicu-link:
  - Lucide `Brain` ikonica, `size-4`, `variant="ghost"` `size="icon"`, `h-8 w-8`.
  - `tooltip`/`title="Memorizacija"`, `aria-label="Memorizacija"`.
  - Link na `/subject/${categoryId}/mnemonics`.
- Postavlja se prije postojećeg "Nazad na uređivanje" dugmeta (ili na samom kraju reda kad smo u `manage` tabu, jer tada to dugme nije prisutno) — u oba slučaja `ml-auto` raspored ostaje očuvan jer je `flex-1 min-w-0` blok već gura na desno.

### 3. `src/components/category/SourcesTab.tsx` (novi tab "Mentalne mape")
- Dodati `"mape"` kao treću vrijednost `activeSourceTab` state-a (`"propis" | "skripta" | "mape"`).
- U `TabsList` dodati `<TabsTrigger value="mape">Mentalne mape</TabsTrigger>` sa Badge brojačem mapa.
- Dodati `useEffect` za učitavanje mapa za `categoryId` preko `loadMindMaps()` iz `@/lib/mindmap-storage`, filtrirane po `d.categoryId === categoryId`.
- Dodati novi `<TabsContent value="mape">` koji:
  - Prikazuje listu mapa istim vizuelnim stilom kao izvore (red sa ikonom Map, naslovom, modom i datumom).
  - Klik na red navigira na `/subject/${categoryId}/mind-maps` i otvara mapu (preko `sessionStorage` flag-a, vidi sljedeću tačku) — ili jednostavnije, samo navigira na `/subject/${categoryId}/mind-maps` sa `?open={id}` query-jem.
  - Ako nema mapa: empty state sa Map ikonicom i porukom.
  - **Na dnu**, ispod liste, veliko centrirano dugme `<Plus/> Kreiraj mentalnu mapu` koje vodi na `/subject/${categoryId}/mind-maps`.
- "Importuj DOCX" dugme u toolbar-u sakriti (ili `disabled`) kad je aktivni tab `"mape"` — nije primjenjivo.

### 4. `src/views/SubjectMindMapPage.tsx` (opciono, za otvaranje mape iz tab-a)
- Pročitati `?open={id}` query parametar pri mountu i, ako mapa postoji u učitanim mapama, automatski je postaviti kao `activeDoc`. Ovo daje korisniku besprekoran prelaz iz `SourcesTab` direktno u canvas mape.

## Tehnički detalji

```text
Header kartica (SubjectCardsView):
[<- Back] [Layers] Naslov + badges ............. [Brain ikonica] [Nazad na uređivanje?]

SourcesTab tabovi:
[Propisi (3)] [Skripte (1)] [Mentalne mape (5)]              [Importuj DOCX]
```

- `MindMapDoc` već ima polje `categoryId` (vidljivo u `MindMapSidePanel.tsx`), tako da je filtriranje trivijalno.
- Ikonica Brain u headeru karta ne narušava postojeći layout jer header već koristi `flex items-center gap-3` sa `flex-1` blokom za naslov.
- Sve postojeće rute (`/subject/:id/mnemonics`, `/subject/:id/mind-maps`) ostaju netaknute — samo se mijenjaju ulazne tačke.

## Šta se NE mijenja
- `Breadcrumbs.tsx`, `useCurrentView.ts` — ostaju kako jesu (rute i dalje postoje).
- Same stranice `SubjectMnemonicPage` i `MindMapCanvas` ostaju netaknute.
- `MindMapSidePanel` u `PassiveReader`-u ostaje kao zaseban entry-point i nije zahvaćen.
