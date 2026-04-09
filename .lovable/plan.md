

# Deep Audit — Pronađene greške i problemi

## Kritični problemi

### 1. State ne resetuje pri promjeni kategorije (CategoryView)
**Fajl:** `src/views/CategoryView.tsx`

Kad korisnik klikne na drugi predmet u sidebaru, React re-renderuje istu `CategoryView` komponentu sa novim `categoryId` parametrom, ali `useState` inicijalizacije se **ne resetuju**. Rezultat:
- `showKnowledge` ostaje `true` ako je bio uključen u prethodnom predmetu
- `kmSubcategory` zadržava UUID prethodne potkategorije — prikazuje MentalSkeleton sa pogrešnim podacima
- `masteryFilter` ostaje aktivan sa nivoom iz prethodnog predmeta
- `orgMode`, `activeTab`, `editorSource`, `readerSource` — sve "curi" između predmeta

**Fix:** Dodati `useEffect` koji resetuje sva lokalna stanja kad se `categoryId` promijeni, ili koristiti `key={categoryId}` na `<CategoryView>` u Route-u.

### 2. Sidebar link "Mentalne mape" vodi na globalnu stranicu — redundantan
**Fajl:** `src/components/AppSidebar.tsx` (L26)

Plan za premještanje Mape Znanja u predmete je implementiran, ali **globalna ruta `/mind-map`** i njen sidebar link još uvijek postoje. Ovo stvara konfuziju — korisnik ima i globalne mentalne mape (MindMapPage) i per-predmet mentalne mape (CategoryMindMaps tab). Sidebar prikazuje "Mentalne mape" pod "Alati" što vodi na potpuno drugačiji view.

**Napomena:** Ovo možda nije greška ako su to namjerno dva različita modula — ali treba razjasniti.

### 3. `scoreColor` u sidebaru se računa ali ne prikazuje (mrtav kod)
**Fajl:** `src/components/AppSidebar.tsx` (L86-88)

Varijabla `color` se računa putem `scoreColor(score)` ali se koristi samo za mali dot kad je sidebar collapsed (L101-104). Kad je sidebar expanded, nema vizuelnog indikatora score-a — `color` se ne koristi. Prethodno je uklonjen progress bar, pa je sad `scoreColor` funkcija i `color` varijabla djelomično mrtav kod.

## Srednji problemi

### 4. `showKnowledge` ne resetuje `kmSubcategory` pri toggle-u
**Fajl:** `src/views/CategoryView.tsx` (L193)

Kad korisnik klikne "Mapa znanja" dugme da ga isključi (`showKnowledge` → false), `kmSubcategory` ostaje setovan. Kad ponovo uključi mapu, odmah vidi MentalSkeleton umjesto liste potkategorija.

**Fix:** Toggle treba resetovati: `setShowKnowledge(v => { if (v) setKmSubcategory(null); return !v; })`

### 5. `onBack={() => {}}` — nefunkcionalan back u SubcategoryList
**Fajl:** `src/views/CategoryView.tsx` (L278)

`SubcategoryList` prima `onBack={() => {}}` — no-op. Iako je `embedded` prop prisutan pa se Header ne renderuje, ovo je code smell — prop bi trebao biti opcionalan ili uklonjen u embedded modu.

### 6. Chapters sort po UUID u SessionFilters
**Fajl:** `src/components/SessionFilters.tsx` (L67)

`.sort()` na chaptersInSub koristi default string sort — sortira po UUID-u umjesto po imenu ili `sortOrder`. Kad korisnik vidi listu glava, redoslijed je nepredvidiv.

**Fix:** Sortirati po `subNameMap[ch]` ili po `sortOrder` iz `CategoryRecord`.

## Manji problemi

### 7. `as any` castovi u CategoryView (L145-146)
Subcategory mapping koristi `as any[]` i `as any` — gubitak type safety. Trebalo bi koristiti `SubcategoryNode` tip direktno.

### 8. CSS custom property `--segment-color` se postavlja ali nigdje ne koristi
**Fajl:** `src/views/CategoryView.tsx` (L220)
`'--segment-color': MASTERY_LEVELS[i].color` — ova CSS varijabla se ne referencira nigdje u CSS-u. Mrtav kod.

### 9. `ref` callback na mastery segmentima ne čisti `dataset.animated`
**Fajl:** `src/views/CategoryView.tsx` (L222-229)
Kad se komponenta re-renderuje (npr. nova kartica dodana), `dataset.animated` flag sprječava ponovnu animaciju. To je namjerno, ali ako se `cards` dramatično promijene (import), animacija se neće ponovo pokrenuti.

## Predloženi plan popravki

### Fajl 1: `src/views/CategoryView.tsx`
- Dodati `key={categoryId}` na Route ili `useEffect` reset za sva lokalna stanja
- Resetovati `kmSubcategory` kad se `showKnowledge` toggleuje na false
- Ukloniti `--segment-color` CSS property
- Zamijeniti `as any` sa tipiziranim mapiranjem

### Fajl 2: `src/components/SessionFilters.tsx`
- Sortirati `chaptersInSub` po imenu (iz `subNameMap`)

### Fajl 3: `src/components/AppSidebar.tsx`
- Ukloniti nekorištenu `scoreColor` logiku ili je iskoristiti u expanded stanju

### Scope
- 3 fajla, ~20 linija neto promjena
- Najkritičnija popravka: state reset pri promjeni kategorije

