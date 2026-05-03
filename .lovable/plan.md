## Cilj
Dodati pravi **bulk tagovanje** (proizvoljne `tags[]` oznake na karticama) u toolbar selekcije, pored postojeće frekvencije i brisanja. Trenutni "Često/Rijetko/Nikad" postavlja `frequencyTag` (jedno polje, semantička trijaža) — to nije isto što i `tags[]` (slobodne oznake koje se koriste npr. u Workshop-u i Mnemo modulu).

## Izmjene

### `src/components/category/CardViewMode.tsx`

1. Importi: dodati `Tag, X, Plus` iz `lucide-react`, `useRef`.

2. Novi state u komponenti:
   ```ts
   const [tagInput, setTagInput] = useState("");
   const [tagPanelOpen, setTagPanelOpen] = useState(false);
   ```

3. Memo postojećih tagova preko izabranih kartica (za prikaz "ukloni"):
   ```ts
   const selectedTagsSummary = useMemo(() => {
     const counts = new Map<string, number>();
     for (const id of selectedIds) {
       const c = cards.find(x => x.id === id);
       for (const t of c?.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
     }
     return Array.from(counts.entries())
       .sort((a, b) => b[1] - a[1])
       .map(([tag, count]) => ({ tag, count }));
   }, [selectedIds, cards]);
   ```

4. Handleri:
   ```ts
   const handleBulkAddTag = useCallback((rawTag: string) => {
     const tag = rawTag.trim();
     if (!tag || selectedIds.size === 0) return;
     let added = 0;
     selectedIds.forEach(id => {
       patchCard(id, c => {
         const existing = c.tags ?? [];
         if (existing.includes(tag)) return c;
         added++;
         return { ...c, tags: [...existing, tag] };
       });
     });
     setTagInput("");
     toast.success(added === 0 ? `Tag "${tag}" već postoji na svim izabranima.` : `Dodan tag "${tag}" na ${added} kartica.`);
   }, [selectedIds, patchCard]);

   const handleBulkRemoveTag = useCallback((tag: string) => {
     if (selectedIds.size === 0) return;
     let removed = 0;
     selectedIds.forEach(id => {
       patchCard(id, c => {
         const existing = c.tags ?? [];
         if (!existing.includes(tag)) return c;
         removed++;
         return { ...c, tags: existing.filter(t => t !== tag) };
       });
     });
     toast.success(`Uklonjen tag "${tag}" sa ${removed} kartica.`);
   }, [selectedIds, patchCard]);
   ```

5. UI proširenje — toolbar dijeli se u dva reda kad je nešto izabrano:
   - **Red 1** (postojeći): broj izabranih + "Označi sve" + frekvencija + "Obriši" + "Otkaži".
   - **Dodati u Red 1**, prije "Obriši", novi separator + dugme `<Tag /> Tagovi` koje toggluje `tagPanelOpen`.
   - **Red 2** (samo kad `tagPanelOpen && selectedIds.size > 0`): kompaktan panel:
     ```tsx
     <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2">
       <span className="text-[10px] uppercase text-muted-foreground">Oznake za izabrane</span>
       {selectedTagsSummary.map(({ tag, count }) => (
         <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-xs">
           {tag}
           <span className="text-[9px] text-muted-foreground">({count}/{selectedIds.size})</span>
           <button onClick={() => handleBulkRemoveTag(tag)} aria-label={`Ukloni ${tag}`} className="text-muted-foreground hover:text-destructive">
             <X className="h-3 w-3" />
           </button>
         </span>
       ))}
       <input
         value={tagInput}
         onChange={e => setTagInput(e.target.value)}
         onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleBulkAddTag(tagInput); } }}
         placeholder="Novi tag..."
         className="h-7 px-2 rounded-md border bg-background text-xs w-32 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
       />
       <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleBulkAddTag(tagInput)} disabled={!tagInput.trim()}>
         <Plus className="h-3 w-3" /> Dodaj
       </Button>
     </div>
     ```

6. Cleanup: kad se selection mode zatvori (`exitSelectionMode`), reset i `setTagPanelOpen(false)` + `setTagInput("")`.

### Bez izmjena
- `Card.tags` polje već postoji i koristi se na više mjesta.
- `patchCard` već persist-uje preko `useCardCRUD` → IDB.
- Frekvencija dugmad ostaju kao zasebna trijaža.

## Acceptance
- U selection modu: dugme "Tagovi" otvara panel; korisnik upisuje tag → Enter ili "Dodaj" primjenjuje na sve izabrane.
- Postojeći tagovi prikazani sa brojem `(N/total)` i X-om za uklanjanje sa svih izabranih.
- Toast potvrde za dodavanje/uklanjanje.
- Selekcija ostaje aktivna nakon tagovanja (mogu se dodati još tagova).
- TypeScript prolazi čisto.