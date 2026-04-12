

# Audit: Import/Export — bugovi i optimizacije

## Pronađeni problemi

### Bug 1: Pogrešan uslov za legacy subcategories (useCardImport.ts, L182)
```
!Array.isArray(data.categories?.[0] && typeof data.categories[0] === 'object')
```
Izraz `data.categories?.[0] && typeof data.categories[0] === 'object'` vraća `true/false`, pa `Array.isArray(true)` je uvijek `false`, a `!false` je uvijek `true`. To znači da se legacy subcategories blok **uvijek izvršava**, čak i kad su kategorije u novom record formatu — potencijalno prepisujući već ispravne subcategories nodove.

**Fix:** Zamijeniti sa `!(Array.isArray(data.categories) && data.categories.length > 0 && typeof data.categories[0] === 'object' && 'id' in data.categories[0])`

### Bug 2: Dvostruko čitanje i dekompresija fajla
Korisnik odabere fajl → `ExportImportDialog` ga čita, dekompresuje ZIP, parsira JSON za validaciju → zatim `useCardImport` ponovo čita isti fajl, ponovo dekompresuje ZIP, ponovo parsira JSON. Za velike backup-e (10MB+) ovo znači dupli rad i dupla memorija.

**Fix:** Proslijediti već parsirani JSON (ili JSON string) iz validacije u import funkciju umjesto ponovnog čitanja File objekta.

### Bug 3: Tri IDB tabele se ne eksportuju niti importuju
Tabele dodane u v10 šemi — `mnemonics`, `majorSystem`, `mnemonicTestLog` — nemaju export/import podršku. Korisnikov Mnemo rad (kartice, major system mapiranja, test logovi) se gubi pri backup/restore ciklusu.

**Fix:** Dodati ove tri tabele u `exportData` (useCardExport) i `importData` (useCardImport), koristeći isti pattern kao ostale tabele.

### Optimizacija: Dvostruka sanitizacija
`ExportImportDialog` sanitizuje kartice tokom validacije (L124-130), ali taj rezultat se baca. Zatim `useCardImport` ponovo sanitizuje. Za 5000+ kartica ovo je nepotreban overhead.

**Fix:** Ukloniti sanitizaciju iz validacije (samo provjeriti strukturu), ostaviti je samo u importu.

## Plan implementacije

### Fajl 1: `src/hooks/useCardImport.ts`
- **L182:** Ispraviti pogrešan uslov za legacy subcategories
- Dodati import za `mnemonics`, `majorSystem`, `mnemonicTestLog` tabele (isti pattern kao diary/disciplineLog)
- Promijeniti `importData` potpis da prima opcioni `parsedJson?: unknown` parametar — ako postoji, preskočiti čitanje fajla

### Fajl 2: `src/hooks/useCardExport.ts`
- U `exportData`: dodati čitanje `mnemonics`, `majorSystem`, `mnemonicTestLog` iz IDB i uključiti u export objekat

### Fajl 3: `src/components/ExportImportDialog.tsx`
- Ukloniti sanitizaciju iz validacije (L124-130) — ostaviti samo strukturnu provjeru
- Čuvati parsirani JSON u validation state i proslijediti ga u `onImport` umjesto File objekta
- Ažurirati `onImport` prop tip da prima `parsedData` pored `file`

## Scope
- 3 fajla, ~40 linija izmjena
- Rizik nizak — ispravlja se latentni bug i dodaje podrška za već postojeće tabele

