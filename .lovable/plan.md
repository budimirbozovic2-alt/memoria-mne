

## Plan: Dashboard prominent cards + SubjectDashboard placeholder

### Korak 1 — Dva istaknuta dugmeta na Dashboard-u

U `src/components/Dashboard.tsx`, dodati novu komponentu `ToolCards` koja renderuje dva velika `glass-card` linka u grid rasporedu (`grid-cols-2`) odmah ispod `QuickActions` u lijevoj koloni:

1. **"Strateški planer"** — ikona `Gauge`, link ka `/planner`, kratak opis "Planiraj tempo i prioritete"
2. **"Statistika"** — ikona `BarChart3`, link ka `/stats`, kratak opis "Pregled napretka i analitika"

Stil: `glass-card rounded-xl p-5 hover:border-primary/40 transition-all` sa ikonom, naslovom i jednim redom opisa. Konzistentno sa postojećim widget-ima (CoreStats, DailyBriefing). Koristiće `Link` iz react-router-dom.

**Fajl:** `src/components/dashboard/ToolCards.tsx` (novi) + import u `src/components/Dashboard.tsx` (1 linija import + 1 linija JSX ispod `QuickActions`).

### Korak 2 — SubjectDashboard placeholder stranica

Nova ruta `/subject/:categoryId` sa placeholder stranicom:

1. **`src/views/SubjectDashboard.tsx`** (novi fajl):
   - Čita `categoryId` iz URL parametara (`useParams`)
   - Mapira UUID na ime predmeta iz `categoryRecords` (preko `useCategoryData()`)
   - Prikazuje naslov predmeta, `glass-card` placeholder sekcija "Učenje" (sa placeholder tekstom), i "Nazad na početnu" dugme (`Link to="/"`)
   - Čist, minimalan dizajn konzistentan sa ostatkom app-a

2. **`src/App.tsx`** — dodati novu rutu:
   ```
   <Route path="/subject/:categoryId" element={<SubjectDashboardWrapper />} />
   ```
   Sa `key={categoryId}` wrapper-om kao kod postojećeg `CategoryViewWrapper`.

3. **`src/views/CategoriesRoutePage.tsx`** (ili `CategoryManager.tsx`):
   - Dodati `onClick` na svaku kategoriju karticu koja navigira na `/subject/{categoryId}`
   - Postojeća `/category/:categoryId` ruta i `CategoryView` ostaju potpuno netaknuti

### Šta NE diram

- Sidebar navigacija — nepromijenjena, i dalje vodi na `/category/:categoryId`
- `CategoryView.tsx` — netaknut, radi kao i prije
- Svi postojeći widgeti na Dashboard-u — nijedan se ne uklanja ni pomjera
- Existing navigation links i rute — sve ostaje

### Fajlovi

| Fajl | Akcija |
|------|--------|
| `src/components/dashboard/ToolCards.tsx` | Novi — 2 prominentne kartice |
| `src/components/Dashboard.tsx` | Edit — import + render ToolCards |
| `src/views/SubjectDashboard.tsx` | Novi — placeholder stranica |
| `src/App.tsx` | Edit — dodati rutu + lazy import + wrapper |
| `src/components/CategoryManager.tsx` | Edit — dodati onClick navigaciju na kategoriju |

**Ukupno: 3 nova fajla, 3 editovana. 0 uklonjenih funkcionalnosti.**

