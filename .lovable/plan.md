# Plan: Ujednačiti layout dugmeta za dodavanje u Izvorima

## Cilj
Primijeniti isti layout kao kod tab-a "Mentalne mape" (centrirano dugme na dnu) i na tabove **Propisi** i **Skripte**, sa preimenovanjem dugmeta iz "Importuj DOCX" u **"Dodaj dokument"**.

## Izmjene u `src/components/category/SourcesTab.tsx`

1. **Ukloniti gornje-desno dugme "Importuj DOCX"** iz toolbar-a iznad tabova. `<input type="file" ref={fileInputRef}>` ostaje u DOM-u (skriven), samo se uklanja vidljivo `<Button>` i okolni `<div>`.

2. **Dodati centrirano dugme "Dodaj dokument" na dno** svakog `TabsContent` za `propis` i `skripta` tabove — identičan layout kao kod Mentalnih mapa:
   ```tsx
   <div className="mt-4 flex justify-center">
     <Button
       variant="outline"
       size="sm"
       disabled={importing}
       onClick={() => fileInputRef.current?.click()}
       className="gap-2"
     >
       {importing
         ? <Loader2 className="h-4 w-4 animate-spin" />
         : <Plus className="h-4 w-4" />}
       {importing ? "Importujem…" : "Dodaj dokument"}
     </Button>
   </div>
   ```
   - Ikonica `Plus` (već importovana) zamjenjuje `Upload` radi vizuelne konzistentnosti sa "Kreiraj mentalnu mapu".
   - Dugme se dodaje **i u empty state granu i u listing granu** unutar `TabsContent` mapper-a, tako da je uvijek dostupno.

3. **Empty state poruka**: ažurirati tekst "Kliknite \"Importuj DOCX\" da biste započeli." → "Kliknite \"Dodaj dokument\" da biste započeli."

## Šta se NE mijenja
- Logika `handleDocxImport` ostaje netaknuta — i dalje prima samo `.docx` i koristi aktivni tab za `sourceKind`.
- Tab "Mentalne mape" ostaje kako jest.
- Skriveni `<input type="file">` ostaje u istom roditeljskom kontejneru kako bi `fileInputRef` bio validan kad korisnik klikne dugme na dnu.
