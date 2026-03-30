

# Analiza problema iz dokumenta i plan implementacije

## Sažetak nalaza

Dokument identifikuje probleme u 10+ modula. Nakon detaljne provjere koda, ovo je status svakog:

---

## TRIAGE TABELA

| # | Modul | Problem | Stvarni status | Prioritet |
|---|-------|---------|---------------|-----------|
| 1 | Dashboard | "Naučene cjeline" vodi na 404 (`/cards`) | **POTVRĐEN** — `CoreStats.tsx` line 24: `<Link to="/cards">` — ruta `/cards` ne postoji u `App.tsx` | CRITICAL |
| 2 | Dashboard | "Izvori" vodi na 404 | **TREBA PROVJERA** — nema eksplicitnog "Izvori" dugmeta u Dashboard.tsx, vjerovatno se misli na nešto u StatusIconsRow | MODERATE |
| 3 | Konsolidacija | Ne prikazuje kartice za ponavljanje | **VJEROVATNO FSRS** — `dueCards` logika (useCards.ts L199-206) zahtijeva `s.state !== New && s.nextReview <= now`. Ako kartice nikad nisu pregledane, nemaju `nextReview` — ostaju "New" zauvijek | HIGH |
| 4 | Forum | UUID umjesto naziva kategorije | **POTVRĐEN** — `monument.category` je UUID (iz `card.categoryId`), a `MonumentCard.tsx` L68 i `MonumentInterior.tsx` L87 prikazuju ga sirovo | CRITICAL |
| 5 | Kartice / Edit dugme | Edit u CardViewMode ne radi | **POTVRĐEN RANIJE, POPRAVLJEN** — edit navigacija postoji (setEditingCard + navigate('/edit')). Treba verifikovati | LOW |
| 6 | Organizacija / Potkategorije | Dugme "Dodaj potkategoriju" ne radi | **TREBA PROVJERA** — ranija popravka je dodala subcategory management u CardOrgMode | MODERATE |
| 7 | Bulk import blic kartica | Višelinijski odgovori se lome | **POTVRĐEN** — `BulkImportDialog.tsx` L26-33 splituje po `\n` i traži `;` delimiter. Višelinijski odgovor = svaka linija se tretira kao novo pitanje | HIGH |
| 8 | Izvori / Outline navigacija | Klik na poglavlje u SourceReader ne skroluje | **VJEROVATNO OK** — `scrollToHeading` (useSourceLogic L156-158) radi `querySelector(#id).scrollIntoView()`. Problem može biti da `contentRef` nije isti DOM čvor | MODERATE |
| 9 | Mentalne mape / Veze nevidljive | Eksportovane mape nemaju vidljive edge-ove | **POTVRĐEN** — `MindMapViewer.tsx` L32 prosljeđuje `edges={doc.edges}` ali ReactFlow bez `defaultEdgeOptions` može imati nevidljive edge-ove ako nedostaju stilovi | HIGH |
| 10 | Statistika / Naziv | "Laboratorija znanja" umjesto "Statistika" | **POTVRĐEN** — `MyStats.tsx` L45: `Laboratorija znanja` | LOW |
| 11 | Statistika / Mapa znanja | Pregled upućuje na Knowledge Map | **POTVRĐEN** — `OverviewTab.tsx` L141-174 prikazuje "Mapa Znanja" dugme koje vodi na `/knowledge-map`. Ovo možda konfliktuje sa Forum integracijom | MODERATE |
| 12 | Memorizacija / UUID | UUID u MnemonicTest filterima | **UPRAVO POPRAVLJENO** — prethodni commit je migrirao na `categoryId` sa `idToName` mapom | DONE |
| 13 | Memorizacija / Major System save | "Sačuvaj" dugme ne radi | **POTVRĐEN** — `MajorSystemSettings.tsx` L24: `hasChanges` poredi sa `loadMajorSystem()` koji čita localStorage. Svaki input onChange poziva `setSystem` ali NE poziva `saveMajorSystem`. Dugme `handleSave` radi — ali `hasChanges` bi trebao raditi jer poredi current state vs saved. Moguć bug: `JSON.stringify` poređenje objekata sa numeričkim ključevima | MODERATE |
| 14 | Speed Reader | Ne prepoznaje izvore | **POTVRĐEN** — `SpeedReader.tsx` koristi samo `cards`, nema pristup `sources`. Nema način da se čitaju izvori | HIGH |
| 15 | Speed Reader | Nema filtriranja po glavama | **POTVRĐEN** — ima filter po kategoriji i potkategoriji, ali ne po "glavama" (chapters) | MODERATE |
| 16 | Speed Reader | UUID prikazan umjesto naziva | **POTVRĐEN** — L427 i L456 prikazuju `c` (UUID) i `selCat` (UUID) umjesto imena; L484 prikazuje `card.categoryId` (UUID) | HIGH |

---

## PLAN IMPLEMENTACIJE

### Faza 1: Kritični linkovi i UUID prikazi (5 fajlova)

**1.1 Dashboard 404 — `src/components/dashboard/CoreStats.tsx`**
- Line 24: `<Link to="/cards">` → `<Link to="/categories">` (ili ukloniti link jer `/cards` ruta ne postoji)

**1.2 Forum UUID prikaz — 3 fajla**
- `src/lib/forum-logic.ts`: Funkcija `buildMonument` prima `category` (UUID) i stavlja ga u `monument.category`. Dodati opcioni `categoryName` field u `Monument` interfejs
- `calculateForumState`: Primiti `categoryRecords` kao parametar, napraviti `uuidToName` mapu, i postaviti `monument.categoryName = uuidToName[cat] ?? cat`
- `src/components/gamification/MonumentCard.tsx` L68: `{monument.categoryName || monument.category}`
- `src/components/gamification/MonumentInterior.tsx` L87: isto
- Svi pozivači `calculateForumState` (ForumContext) — proslijediti `categoryRecords`

**1.3 SpeedReader UUID prikaz — `src/components/SpeedReader.tsx`**
- Uvesti `categoryRecords` iz contexta
- Napraviti `uuidToName` mapu
- L427: prikazati `uuidToName[c] ?? c` umjesto sirovog UUID-a
- L456: prikazati `uuidToName[selCat] ?? selCat`
- L484: prikazati `uuidToName[card.categoryId] ?? card.categoryId`

### Faza 2: Konsolidacija / FSRS provjera (2 fajla)

**2.1 Provjera dueCards logike**
- `useCards.ts` L199-206: Logika je ispravna — kartica je "due" ako ima barem jednu sekciju u Review stanju sa `nextReview <= now`
- Problem je vjerovatno što kartice nikad nisu bile pregledane (sve sekcije ostaju "New")
- Korisnik mora prvo proći sesiju učenja da bi sekcije prešle u Review stanje
- **Akcija**: Dodati dijagnostički info u ReviewPage EmptyState — prikazati koliko kartica je u "New" stanju vs "Review" stanju

### Faza 3: Bulk Import fix (1 fajl)

**3.1 `src/components/category/BulkImportDialog.tsx`**
- Trenutni format: `pitanje;odgovor` po redu — višelinijski odgovori se lome
- Fix: Dodati podršku za alternativni delimiter (npr. prazan red razdvaja pitanja, ili koristiti `---` kao separator između Q/A parova)
- Dodati opciju za izbor formata u UI

### Faza 4: Statistika rename + Knowledge Map (2 fajla)

**4.1 `src/components/MyStats.tsx` L45**
- `"Laboratorija znanja"` → `"Statistika"`
- L48: opis ažurirati

**4.2 `src/components/stats/OverviewTab.tsx` L141-174**
- Knowledge Map dugme: preusmjeriti na `/forum` umjesto `/knowledge-map`, ili potpuno ukloniti ako je funkcionalnost integrirana u Forum

### Faza 5: Source Reader navigacija (1 fajl)

**5.1 `src/hooks/useSourceLogic.ts` L156-158**
- `scrollToHeading` koristi `contentRef.current?.querySelector(#id)`. Problem: `SourceContent` koristi `enhanceHeadings` callback ref koji postavlja `contentRef` — ali ako se heading ID sadrži specijalne znakove, `querySelector` pada
- Fix: Koristiti `document.getElementById(id)` umjesto `querySelector(#${id})` jer getElementById ne zahtijeva CSS escaping

### Faza 6: MindMap veze nevidljive (1 fajl)

**6.1 `src/components/category/MindMapViewer.tsx`**
- Dodati `defaultEdgeOptions` sa vidljivim stilom:
```ts
defaultEdgeOptions={{ 
  style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
  animated: false 
}}
```
- Provjeriti da `doc.edges` sadrži ispravne `source`/`target` reference

### Faza 7: Speed Reader — podrška za izvore (1 fajl)

**7.1 `src/components/SpeedReader.tsx`**
- Dodati tab ili toggle: "Kartice" | "Izvori"
- Kada je izvor odabran, koristiti `source.htmlContent` → `stripHtml()` → segmenti
- Dodati filter po izvorima (source titles) unutar odabrane kategorije
- Zahtijeva pristup `sources` iz IDB-a (uvesti `useLiveQuery` ili proslijediti iz konteksta)

### Faza 8: Major System Save (1 fajl)

**8.1 `src/components/MajorSystemSettings.tsx`**
- L24: `hasChanges` koristi `JSON.stringify` poređenje. Objekti sa numeričkim ključevima mogu imati različit redoslijed
- Fix: Sortirati ključeve prije poređenja, ili koristiti deep-equal utility

---

## Redoslijed izvršenja

1. **Faze 1.1 + 1.2 + 1.3** (UUID prikazi + 404 fix) — najvidljiviji bugovi
2. **Faza 4** (Statistika rename) — trivijalan fix
3. **Faza 3** (Bulk import) — korisnik aktivno koristi
4. **Faza 5 + 6** (Source Reader + MindMap) — funkcionalni bugovi
5. **Faza 7** (Speed Reader izvori) — nova funkcionalnost
6. **Faza 2 + 8** (FSRS dijagnostika + Major System) — manje urgentno

## Ukupan opseg
- ~12 fajlova, ~150 linija promjena
- Bez IDB schema promjena
- Bez FSRS logike promjena (samo dijagnostika)

