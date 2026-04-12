

# Plan: Razdvajanje izvora na Propise i Skripte

## Pregled

Dodati `sourceKind` polje (`"propis" | "skripta"`) na `Source` interfejs i razdvojiti prikaz u CategoryView tabu na dva pod-taba ili sekcije. Sve postojeće funkcionalnosti ostaju identične za oba tipa, jedino se Auto-Split dugme sakriva u SourceToolbar kada je izvor tipa "skripta".

## Izmjene

### 1. DB šema — dodati `sourceKind` polje
**Fajl: `src/lib/db-schema.ts`**
- Dodati `sourceKind?: "propis" | "skripta"` na `Source` interfejs
- Dodati novu verziju baze (version 10+) sa indeksom `[categoryId+sourceKind]` na `sources` tabelu
- Postojeći izvori bez polja automatski se tretiraju kao `"propis"` (backward compatible)

### 2. SourceEditor — dodati izbor tipa pri kreiranju/uređivanju
**Fajl: `src/components/category/SourceEditor.tsx`**
- Dodati select/radio za `sourceKind` u editor formu

### 3. CategoryView — razdvojiti tab "Izvori" na dva pod-taba
**Fajl: `src/views/CategoryView.tsx`**
- Unutar `TabsContent value="sources"` dodati ugniježđeni `Tabs` sa dva pod-taba: "Propisi" i "Skripte"
- Filtrirati `sources` po `sourceKind` za svaki pod-tab
- DOCX import dugme prisutno u oba pod-taba, pri čemu se automatski postavlja `sourceKind` prema aktivnom pod-tabu
- Badge na glavnom "Izvori" tabu i dalje pokazuje ukupan broj, pod-tabovi pokazuju svoje brojeve

### 4. DOCX import — postaviti sourceKind
**Fajl: `src/views/CategoryView.tsx`**
- `handleDocxImport` prima aktivni pod-tab i postavlja `sourceKind` na novom izvoru

### 5. SourceToolbar — sakriti Auto-Split za skripte
**Fajl: `src/components/source-reader/SourceToolbar.tsx`**
- Proslijediti `sourceKind` prop; ako je `"skripta"`, ne renderovati Auto-Split dugme

### 6. SourceReader — proslijediti sourceKind
**Fajl: `src/components/SourceReader.tsx`**
- Bez logičkih promjena, samo forwarding prop-a do toolbar-a

## Analiza rizika

### Nizak rizik
- **Backward kompatibilnost**: Postojeći izvori nemaju `sourceKind` polje. Tretiraju se kao `"propis"` putem `?? "propis"` fallback-a. Nema migracije podataka.
- **Dexie verzija**: Dodavanje novog indeksa je standardna Dexie upgrade operacija. Ako korisnik već ima bazu, Dexie automatski migrira.

### Srednji rizik
- **Auto-link i Coverage**: Ove funkcije filtriraju po `sourceId` i `categoryId`. Ne koriste `sourceKind`, pa neće biti pogođene. Međutim, ako korisnik poveže karticu sa propisom, a zatim promijeni izvor u skriptu, veza ostaje validna ali može biti konfuzna. **Mitigacija**: Ne dozvoliti promjenu `sourceKind` nakon kreiranja, ili upozoriti korisnika.
- **Export/Import**: `ExportImportDialog` serijalizuje izvore. Novi `sourceKind` polje mora biti uključeno. Stari exporti bez tog polja će raditi jer koristimo fallback. **Mitigacija**: Automatski fallback `?? "propis"` pri importu.

### Nizak-do-srednji rizik
- **SubcategoryList Knowledge Map**: Komponenta `SubcategoryList` prima `sources` prop. Trenutno prikazuje sve izvore. Treba odlučiti da li Knowledge Map prikazuje samo propise, samo skripte, ili oboje. **Preporuka**: Prikazati oboje jer je to pregled pokrivanja.

## Scope
- 4 fajla izmjena (db-schema, CategoryView, SourceToolbar, SourceEditor)
- 1 fajl minimalna izmjena (SourceReader — prop forwarding)
- ~80 linija novih/izmijenjenih
- Bez destruktivnih promjena nad postojećim podacima

