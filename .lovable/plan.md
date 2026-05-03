## Cilj
Ukloniti duplirane "Dodaj/Masovni uvoz" akcije iz centra ekrana u `CardViewMode` empty-state-u — header već ima `CardCreateMenu` dugme, pa je središnji blok suvišan.

## Trenutno stanje
- `src/views/SubjectCardsView.tsx` (linije 186–196): `CardCreateMenu` u headeru (zadržati).
- `src/components/category/CardViewMode.tsx` (linije 118–133): empty-state ponovo renderira `CardCreateMenu` u sredini ekrana (ukloniti).

## Izmjene

### `src/components/category/CardViewMode.tsx`
1. Empty-state (kad `cards.length === 0`) zamijeniti samo porukom koja upućuje korisnika na header dugme:
   ```tsx
   <div className="text-center py-16">
     <p className="text-sm text-muted-foreground">
       Nema kartica u ovoj kategoriji. Koristi dugme „Dodaj" u zaglavlju.
     </p>
   </div>
   ```
2. Ukloniti import-e koji postaju neiskorišteni: `CardCreateMenu`, `useBackupActions` (i lokalna varijabla `importCards`), `allCategoryNames` memo (provjeriti druge potrošače; ako nema — ukloniti).

### Bez izmjena
- Header `CardCreateMenu` u `SubjectCardsView` ostaje jedini ulaz za "Dodaj/Masovni uvoz".
- Props `addCard`, `addFlashCard`, `bulkAddFlashCards` ostaju u `Props` interface-u (nisu više korišteni unutar komponente, ali ih i dalje prosljeđuje roditelj — mogu se ukloniti u zasebnom cleanup-u; sada ostaviti da se izbjegne kaskadna izmjena).

## Acceptance
- Kada nema kartica, prikazana je samo poruka, bez sekundarnog "Dodaj" bloka.
- Header dugme „Dodaj" i dalje radi kao jedini ulaz.
- TypeScript prolazi čisto.