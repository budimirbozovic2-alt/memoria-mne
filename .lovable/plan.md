

# Oživljavanje mrtvog koda i čišćenje 404 ruta

## FAZA 1: Rješavanje 404 ruta

### TopNav.tsx (L228-242)
- `BAZA_NAV` sadrži `/cards`, `/categories`, `/sources` — od kojih `/cards` i `/sources` ne postoje
- Zamijeniti sa: `/categories` → "Kategorije" (jedina validna ruta)
- Ukloniti cijeli `BazaDropdown` jer ostaje samo jedna stavka — direktan `NavLink` na `/categories`
- Ukloniti `DatabaseIcon` import i `BazaDropdown` komponentu (L27-67)
- L234: `isBazaActive` provjera za `/database` — ukloniti

### QuickActions.tsx (L30-35)
- `to="/sources"` — zamijeniti sa `to="/categories"` (ili ukloniti taj link potpuno)

### CardForm.tsx (L46)
- `window.location.hash = "#/sources"` — zamijeniti sa navigacijom na kategoriju kartice: `#/category/${editCard.categoryId}`

### Breadcrumbs.tsx (L12-15)
- Ukloniti `/cards`, `/sources`, `/database` iz `ROUTE_LABELS` — te rute ne postoje

### MainLayout.tsx (L20)
- `SOURCE_ROUTES` sadrži `/cards`, `/sources`, `/database` — ukloniti mrtve, ostaviti samo `/categories` i `/category/`

## FAZA 2: Oživljavanje skrivenih stranica

### AppSidebar.tsx — dodati Knowledge Map
- U `TOOLS_NAV` niz dodati: `{ path: "/knowledge-map", icon: Map, label: "Mapa znanja" }`
- `Map` je već importovan

### MnemonicModule.tsx — Major System kao Dialog
- Umjesto `subView === "major"` koji renderuje `<MajorSystemSettings />` kao zasebnu stranicu, renderovati ga unutar `<Dialog>` modala
- Dugme "Mentalne tablice" u grid meniju otvara dialog umjesto `setSubView("major")`

### App.tsx — ukloniti `/major-system-settings` rutu
- Obrisati `const MajorSystemPage = lazy(...)` (L31)
- Obrisati `<Route path="/major-system-settings" ...>` (L66)

### MajorSystemPage.tsx — obrisati fajl (više nije potreban)

### `/frequent-errors` — bez promjena (ostaje skrivena, kontekstualna)

## FAZA 3: Spašavanje napuštene logike

### splitCard() — dodati dugme u CardForm.tsx
- U header sekciju forme (L38-73), pored "Vrati me nazad", dodati dugme "Podijeli karticu" (ikona `Scissors`)
- Prikazuje se samo kada: `editCard` postoji I `editCard.sections.length > 1`
- `onClick`: poziva `splitCard(editCard.id)` iz konteksta, prikazuje toast "Kartica podijeljena", navigira nazad
- CardForm prima novi prop `onSplit?: (id: string) => void`
- EditPage.tsx prosljeđuje `onSplit={splitCard}` iz `useCardContext()`

### reorderCards() — obrisati
- `useCardAnnotations.ts`: obrisati `reorderCards` callback (L169-181) i ukloniti iz return objekta
- `useCards.ts`: ukloniti iz destructuring-a i return objekta
- `AppContext.tsx`: ukloniti iz interface-a i provider value-a

## Fajlovi koji se mijenjaju

| Fajl | Promjena |
|------|----------|
| `src/components/TopNav.tsx` | Ukloniti BazaDropdown, direktan link na /categories |
| `src/components/dashboard/QuickActions.tsx` | `/sources` → `/categories` |
| `src/components/CardForm.tsx` | Fix #/sources link, dodati Split dugme |
| `src/components/Breadcrumbs.tsx` | Ukloniti mrtve rute iz ROUTE_LABELS |
| `src/components/MainLayout.tsx` | Očistiti SOURCE_ROUTES |
| `src/components/AppSidebar.tsx` | Dodati Knowledge Map u TOOLS_NAV |
| `src/components/MnemonicModule.tsx` | Major System → Dialog modal |
| `src/App.tsx` | Ukloniti /major-system-settings rutu |
| `src/views/MajorSystemPage.tsx` | Obrisati fajl |
| `src/views/EditPage.tsx` | Proslijediti splitCard prop |
| `src/hooks/useCardAnnotations.ts` | Obrisati reorderCards |
| `src/hooks/useCards.ts` | Ukloniti reorderCards |
| `src/contexts/AppContext.tsx` | Ukloniti reorderCards iz interfejsa i providera |

## Scope
- 13 fajlova, ~120 linija promjena
- Bez IDB/FSRS promjena

