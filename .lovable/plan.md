

# Fix: 5 sitnih problema — TitleBar, UUID prikaz, Forum→Mapa, ikonica predmeta

## Rezime
5 konkretnih popravki: (1) window dugmad vidljiva i u web preview-u, (2) Mapa znanja prikazuje nazive umjesto UUID-ova na sva tri nivoa, (3) link "Forum Znanja" → "Mapa Znanja" u Statistici, (4) uklanjanje Mape znanja iz sidebar navigacije (dovoljno je iz Statistike), (5) Scale ikonica umjesto obojenih kružića za predmete u sidebaru.

---

## 1. TitleBar — window dugmad vidljiva u web preview-u

**Problem**: `TitleBar` na L23 vraća `null` ako nema `window.electronAPI`. U web preview-u korisnik nema window controls.

**Fix**: U `TitleBar.tsx`, umjesto `if (!api) return null`, prikazati fallback header sa brand logom ali bez minimize/maximize/close dugmadi (ta dugmad nemaju smisla van Electrona). Alternativno — potpuno ukloniti `if (!api) return null` guard i uvijek renderovati bar, ali sakriti window control dugmad kad nema API-ja.

| Fajl | Promjena |
|------|----------|
| `src/components/TitleBar.tsx` | Ukloniti early return; sakriti window controls `div` kad nema `api` |

---

## 2. Mapa znanja — UUID → Display Name (KRITIČNO)

**Problem**: `KnowledgeMap.tsx` proslijeđuje `categories: string[]` (UUID-ovi) i `subcategories: Record<UUID, UUID[]>` u `CategoryList` i `SubcategoryList`. Te komponente prikazuju UUID stringove kao naslove predmeta i potkategorija. `MentalSkeleton.tsx` L114 prikazuje `{category} → {subcategory}` — opet UUID-ovi.

**Fix**: Proslijediti `categoryRecords` kroz cijeli lanac i koristiti lookup.

| Fajl | Promjena |
|------|----------|
| `src/views/KnowledgeMapPage.tsx` | Dodati `categoryRecords` iz konteksta, proslijediti u `KnowledgeMap` |
| `src/components/KnowledgeMap.tsx` | Props: dodati `categoryRecords`, proslijediti u `CategoryList`, `SubcategoryList`, `MentalSkeleton` |
| `src/components/knowledge-map/CategoryList.tsx` | Dodati `categoryRecords` prop; `name` = lookup iz records umjesto UUID-a |
| `src/components/knowledge-map/SubcategoryList.tsx` | Dodati `categoryRecords` prop; lookup subcategory naziva iz `categoryRecords[cat].subcategories` |
| `src/components/knowledge-map/SubcategoryCard.tsx` | Bez promjena (prima `name` — sada će dobiti display name) |
| `src/components/MentalSkeleton.tsx` | Dodati `categoryRecords` prop; L114 lookup za category i subcategory nazive. Isto za chapter nazive. |
| `src/components/mental-skeleton/ChapterBox.tsx` | Chapter `displayName` — chapter je već UUID; treba lookup iz categoryRecords hijerarhije |

---

## 3. "Forum Znanja" → "Mapa Znanja" u Statistici

| Fajl | Promjena |
|------|----------|
| `src/components/stats/OverviewTab.tsx` | L151: `"Forum Znanja"` → `"Mapa Znanja"` |

---

## 4. Ukloniti Mapu znanja iz sidebar navigacije

Korisnik kaže da je link u Statistici dovoljan i da je suvišan u navigation panelu.

| Fajl | Promjena |
|------|----------|
| `src/components/AppSidebar.tsx` | Ukloniti `{ path: "/knowledge-map", icon: Globe, label: "Mapa znanja" }` iz `TOOLS_NAV` |

**Napomena**: Ruta `/knowledge-map` u `App.tsx` ostaje — pristupa joj se preko linka u Statistici.

---

## 5. Scale ikonica umjesto obojenih kružića za predmete

**Problem**: `AppSidebar.tsx` L88-95: kad sidebar nije collapsed i kategorija ima `cat.color`, prikazuje obojeni kružić. Korisnik želi uvijek Scale ikonicu.

**Fix**: Ukloniti `cat.color` granu — uvijek prikazivati `<Scale>`.

| Fajl | Promjena |
|------|----------|
| `src/components/AppSidebar.tsx` | L86-95: uvijek `<Scale className="h-4 w-4 shrink-0" />`, ukloniti colored dot |

---

## Scope
- ~8 fajlova, ~60 linija promjena
- Nema novih zavisnosti
- FSRS: netaknut

