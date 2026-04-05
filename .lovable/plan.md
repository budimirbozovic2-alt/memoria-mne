

# Premještanje Mape Znanja u pojedinačne predmete

## Šta se mijenja

Umjesto jedne unificirane stranice `/knowledge-map` koja prikazuje sve predmete pa drill-down, Mapa Znanja postaje **novi tab unutar svakog predmeta** (CategoryView). Korisnik klikom na predmet u sidebaru odmah vidi tab "Mapa znanja" sa potkategorijama i mentalnim kosturom samo za taj predmet.

## Plan

### 1. Dodati "Mapa znanja" tab u CategoryView

**Fajl**: `src/views/CategoryView.tsx`
- Dodati novi `TabsTrigger` za "Mapa znanja" (sa `Map` ikonom) pored postojećih tabova (Kartice, Izvori, Mentalne mape)
- U `TabsContent` renderovati `SubcategoryList` (iz `knowledge-map/`) direktno — preskačući CategoryList korak jer je predmet već odabran
- SubcategoryList već prima `category`, `cards`, `sources`, `subcategories`, `categoryRecords` — sve dostupno u CategoryView
- Drill-down u MentalSkeleton (detalj po potkategoriji) ostaje isti — unutar taba

### 2. Ukloniti standalone Knowledge Map stranicu i rutu

**Fajlovi**:
- `src/App.tsx` — ukloniti `/knowledge-map` rutu i lazy import `KnowledgeMapPage`
- `src/views/KnowledgeMapPage.tsx` — obrisati fajl
- `src/components/KnowledgeMap.tsx` — zadržati samo exportovane helpere (`MASTERY_LEVELS`, `getCardMasteryLevel`, `getMasteryColor`) ali ukloniti default export (orchestrator komponentu) i `CategoryList` import
- `src/components/knowledge-map/CategoryList.tsx` — obrisati fajl (više nije potreban)

### 3. Očistiti reference na `/knowledge-map`

- `src/components/Breadcrumbs.tsx` — ukloniti `/knowledge-map` iz mapa
- `src/components/AppSidebar.tsx` — ne sadrži link (nema u TOOLS_NAV), ali provjeriti
- `src/contexts/AppContext.tsx` — ukloniti `"knowledge-map"` iz `View` tipa i `VIEW_TO_PATH`
- `src/components/stats/OverviewTab.tsx` — ukloniti `onShowKnowledgeMap` dugme (navigacija na ukinutu rutu)
- `src/components/MyStats.tsx` — ukloniti `onShowKnowledgeMap` prop
- `src/views/StatsPage.tsx` — ukloniti `onShowKnowledgeMap` callback

### 4. Izvući mastery helpere u zaseban modul

Trenutno `getCardMasteryLevel`, `getMasteryColor`, `MASTERY_LEVELS` žive u `KnowledgeMap.tsx` i importuju se iz 8+ fajlova. Pošto brišemo orchestrator:
- Kreirati `src/lib/mastery.ts` sa tim 3 exporta
- Ažurirati sve importere (MentalSkeleton, ChapterBox, SkeletonCardTile, AuditorDetailPanel, SubcategoryList, SubcategoryCard, OverviewTab)

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `src/lib/mastery.ts` | **NOV** — mastery helperi |
| `src/views/CategoryView.tsx` | Dodati "Mapa znanja" tab |
| `src/views/KnowledgeMapPage.tsx` | **OBRISATI** |
| `src/components/KnowledgeMap.tsx` | **OBRISATI** (helperi premješteni) |
| `src/components/knowledge-map/CategoryList.tsx` | **OBRISATI** |
| `src/App.tsx` | Ukloniti rutu |
| `src/contexts/AppContext.tsx` | Ukloniti view tip |
| `src/components/Breadcrumbs.tsx` | Ukloniti entry |
| `src/views/StatsPage.tsx` | Ukloniti callback |
| `src/components/MyStats.tsx` | Ukloniti prop |
| `src/components/stats/OverviewTab.tsx` | Ukloniti dugme |
| 7 fajlova u mental-skeleton/ i knowledge-map/ | Ažurirati import putanju |

## Scope
- ~13 fajlova, neto ~40 linija dodato, ~300 uklonjeno
- Backward-compatible — ista funkcionalnost, samo drugačija navigacija
- Nema novih zavisnosti

