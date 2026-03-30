

# Fix: Preagresivna detekcija naslova u izvorima

## Problem
`promoteHeadings()` promovira **bold tekst** i **CAPS tekst** u H2/H3 tagove. To znači da se "Član 59", naslovi članova (bold) i slični elementi prikazuju kao naslovi u navigation panelu — a korisnik želi samo prave H1/H2/H3 tagove.

## Rješenje
Ukloniti bold/CAPS promociju iz `promoteHeadings()`. Zadržati **samo** promociju pravnih strukturnih obrazaca (DIO, GLAVA, POGLAVLJE, ODJELJAK) jer to su zaista strukturni naslovi dokumenta, ne članovi.

### Izmjene u `src/lib/heading-promotion.ts`

1. **Obrisati** `isPureBold()` funkciju (neće se više koristiti)
2. **Obrisati** `isMostlyUpperCase()` funkciju  
3. **Pojednostaviti** `classifyHeading()` — samo legal section regex-i (DIO→H1, GLAVA/POGLAVLJE→H2, ODJELJAK→H3)
4. **Pojednostaviti** `promoteHeadings()` — iterira paragraphe, provjerava samo legal pattern match, bez bold/CAPS provjere
5. **Zadržati** `detectTitle()` — koristi `isPureBold`/`isMostlyUpperCase` ali samo za detekciju naslova dokumenta (ne za outline), pa premjestiti te pomoćne funkcije kao privatne samo za `detectTitle`

### Rezultat
- Navigation panel prikazuje samo: DIO, GLAVA, POGLAVLJE, ODJELJAK + prave H1-H3 iz DOCX-a
- Članovi ("Član 59") se više NE prikazuju kao naslovi
- Bold paragrafi se više NE promovišu u headinge
- `detectTitle()` i dalje radi za auto-detekciju naslova dokumenta

## Scope
- 1 fajl (`heading-promotion.ts`), ~30 linija promijenjeno

