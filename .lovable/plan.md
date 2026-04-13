

# Plan: Premještanje QuickActions na dno lijeve kolone + preimenovanje naslova

## Izmjene

### 1. Preimenovati "Dashboard" u "Početna tabla"
**Fajl:** `src/components/Dashboard.tsx` (linija 39)
Zamijeniti tekst `Dashboard` sa `Početna tabla`.

### 2. Premjestiti QuickActions na dno lijeve kolone
**Fajl:** `src/views/DashboardPage.tsx`
- Ukloniti `<QuickActions>` sa linije 54 (iznad Dashboard komponente)
- Proslijediti `dueCount` i `hasCards` kao props u `Dashboard`

**Fajl:** `src/components/Dashboard.tsx`
- Dodati `dueCount` i `hasCards` u Props interfejs
- Renderovati `<QuickActions>` na kraju lijeve kolone (nakon `DailyBriefing`, linija ~105), unutar existing `<div className="space-y-6">` bloka

Ovako će dugmad "Nastavi učenje" i "Ponovi dospjele" biti na dnu lijeve kolone, popunjavajući prazan prostor i balansirajući layout.

## Scope
- 2 fajla, minimalne izmjene

