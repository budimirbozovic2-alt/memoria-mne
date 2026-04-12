

# Dodavanje tastaturnih prečica u InfoPanel za Statistiku, Dnevnik i Planer

## Problem
InfoPanel-i u modulima Statistika, Dnevnik i Planer sadrže samo opisne informacije o funkcijama, ali nemaju listu tastaturnih prečica kao što imaju Dashboard i Podešavanja.

## Rješenje
Dodati sekciju sa prečicama na dno svakog InfoPanel-a, koristeći isti `<kbd>` stil kao u DashboardPage i SRSettingsPanel.

### Fajlovi i izmjene

**1. `src/components/MyStats.tsx`** (Statistika InfoPanel, ~linija 55-62)
Dodati nakon postojećeg sadržaja:
- `Ctrl+K` — Globalna pretraga
- `M` — Workflow sidebar
- `ESC` — Zatvori modal

**2. `src/components/MetacognitiveCenter.tsx`** (Dnevnik InfoPanel, ~linija 48-52)
Dodati:
- `Ctrl+K` — Globalna pretraga
- `M` — Workflow sidebar
- `ESC` — Zatvori modal

**3. `src/components/StrategicPlanner.tsx`** (Planer InfoPanel, ~linija 46-53)
Dodati:
- `Ctrl+K` — Globalna pretraga
- `M` — Workflow sidebar
- `ESC` — Zatvori modal

Svaki dobija `<p className="pt-1 border-t border-border mt-1">` separator i listu prečica u istom formatu kao Dashboard InfoPanel.

## Scope
- 3 fajla, ~10 linija dodato u svaki
- Čisto dodavanje sadržaja, bez strukturnih promjena

