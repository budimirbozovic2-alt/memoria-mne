## Cilj

Na globalnom dashboardu, u `CoreStats` widgetu, drugo dugme ("Naučene cjeline" → vodi na `/categories` što završava na UUID-ovskoj stranici) zamijeniti dugmetom **"Najslabija kategorija"** koje vodi direktno u tu kategoriju (`/category/:id`).

## Izmjene

### 1. `src/components/dashboard/CoreStats.tsx`
- Ukloniti `learnedSections` / `totalSections` props i `<Link to="/categories">` blok.
- Dodati novi prop: `weakest?: { id: string; name: string; score: number } | null`.
- Renderovati drugi tile kao:
  - Ako `weakest` postoji: `<Link to={`/category/${weakest.id}`}>` sa ikonom `TrendingDown` (iz lucide-react), imenom kategorije (truncate), labelom "Najslabija kategorija" i malim score badgeom (npr. `${Math.round(score)}%`).
  - Fallback (nema kartica): disabled stanje sa porukom "Nema podataka" — bez linka.
- Zadržati postojeći glass-card stil, animacije i hover-gold.

### 2. `src/hooks/useDashboardData.ts`
- Već postoji `weakestCategories` (sortirano ascending po score). Izložiti dodatno `weakestCategory` = prvi element sa pridruženim `id`:
  - Trenutno mapiranje gubi `id`; izmijeniti mapiranje da zadrži `id` (interno), a postojeći `weakestCategories` (koji koristi `VelocityWidget`) ostaviti nepromijenjen u shape-u (`{name, score, total}`) izvođenjem iz nove strukture.
- Vratiti `weakestCategory` u return objektu.

### 3. `src/components/Dashboard.tsx`
- Iz destrukture `useDashboardData()` izvući `weakestCategory`.
- Ukloniti propse `learnedSections`, `totalSections` sa `<CoreStats />` i proslijediti `weakest={weakestCategory}`.

## Tehnički detalji

- Ruta `/category/:categoryId` već postoji u `App.tsx` (linija 58) — prirodno odredište.
- Score se računa u postojećem `categoryStats` (manji = slabiji), pa "najslabija" = `weakestCategories[0]`.
- Bez izmjena u settings/personalizaciji; `wc.showCoreStats` toggle ostaje isti (samo mu se mijenja sadržaj drugog tile-a).
- Nema migracija ni novih ovisnosti.

## Što se NE mijenja

- `VelocityWidget` "Najslabije kategorije" sekcija ostaje (lista top 3) — ovo je samo brzi shortcut na #1.
- `pendingFirstReview` i "Za ponavljanje" tile ostaju netaknuti.
