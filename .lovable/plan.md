

# Pruning mrtvih fajlova + migracija preostalih useAppContext poziva

## Mrtvi fajlovi (0 importa u cijelom projektu)

| Fajl | Linije | Razlog |
|------|--------|--------|
| `src/lib/safe-storage.ts` | 18 | Niko ga ne importuje — zamijenjen direktnim `JSON.parse` ili IDB pristupom |
| `src/components/FSRSGuide.tsx` | ~60 | Niko ga ne importuje — vjerovatno zamijenjeno InfoPanel-om ili uklonjen iz UI-a |

## Preostali `useAppContext` potrošači (3 fajla)

`useAppContext` je wrapper oko deprecated `useCardContext` + `useUIContext`. Ove 3 komponente treba prebaciti na granularne hookove:

| Fajl | Koristi | Zamjena |
|------|---------|---------|
| `src/hooks/useSpeedReaderEngine.ts` | `cards, categories, subcategories, categoryRecords` | `useCardData` + `useCategoryData` |
| `src/hooks/useSourceReaderActions.ts` | `addCard, cards, patchCard` | `useCardData` + `useCardActions` |
| `src/components/AutoSplitDialog.tsx` | `bulkAddCards, cards, updateCard` | `useCardData` + `useCardActions` |

## Nakon migracije

`useAppContext` i `useCardContext` u `AppContext.tsx` postaju potpuno nekorišteni i mogu se obrisati zajedno sa tipovima `AppContextValue` i `CardContextValue`.

## Promjene po fajlu

| Fajl | Akcija |
|------|--------|
| `src/lib/safe-storage.ts` | Obrisati |
| `src/components/FSRSGuide.tsx` | Obrisati |
| `src/hooks/useSpeedReaderEngine.ts` | Zamijeniti `useAppContext` sa `useCardData` + `useCategoryData` |
| `src/hooks/useSourceReaderActions.ts` | Zamijeniti `useAppContext` sa `useCardData` + `useCardActions` |
| `src/components/AutoSplitDialog.tsx` | Zamijeniti `useAppContext` sa `useCardData` + `useCardActions` |
| `src/contexts/AppContext.tsx` | Obrisati `useCardContext`, `useAppContext` i njihove tipove |

## Scope
- 6 fajlova: 2 brisanja, 3 migracije, 1 cleanup
- ~30 linija neto manje koda
- Eliminacija svih deprecated wrapper hookova
- Nema promjene ponašanja

