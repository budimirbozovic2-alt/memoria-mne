
# Plan: Premjesti Heatmap aktivnosti pod BackupCard

## Promjena
U `src/components/Dashboard.tsx`:
- Ukloniti `<ActivityHeatmap />` iz lijeve analitičke kolone (trenutno linija 144).
- Dodati ga u desni `<aside>` kao posljednji element, ispod `<BackupCard />`.

## Rezultat
Desni rail postaje:
```text
QuickActions
ToolCards (Planer + Statistika)
BackupCard
ActivityHeatmap   ← novo
```
Lijeva kolona time gubi visinu i dashboard djeluje vertikalno uravnoteženije.

## Napomena
`ActivityHeatmap` zadržava puni unutrašnji layout; samo mijenja roditeljsku kolonu. `wc.showHeatmap` toggle ostaje aktivan.
