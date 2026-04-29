# Čišćenje navigacije

## Cilj
Pojednostaviti navigaciju uklanjanjem suvišnih prečica koje već postoje na globalnom dashboardu, i zamijeniti Statistiku Dnevnikom u zaglavlju lokalnog (predmetnog) dashboarda.

## Promjene

### 1. `src/components/AppSidebar.tsx` — sekcija "Alati"
Iz `TOOLS_NAV` ukloniti dvije stavke:
- `/stats` — Statistika
- `/planner` — Strateški planer

Ostaju: Dnevnik, Memorizacija, Speed Reader, Mentalne mape.

Razlog: prečice za Statistiku i Planera su već dostupne kao kartice na globalnom dashboardu (`ToolCards`), pa su u sidebaru duplikat.

### 2. `src/views/SubjectDashboard.tsx` — header dugmad
U trenutnom layoutu zaglavlja predmeta nalaze se tri ikon-dugmeta: Statistika, Info, Podešavanja.

- Ukloniti dugme **Statistika** (link ka `/stats`, `BarChart3` ikona).
- Na isto mjesto dodati dugme **Dnevnik** koje vodi na `/metacognitive` koristeći `BookOpen` ikonu (ista kao u sidebar `TOOLS_NAV`).
- Tooltip: "Dnevnik".
- Zadržati raspored: Dnevnik → Info → Podešavanja.

Ažurirati importe iz `lucide-react` (ukloniti `BarChart3` ako više nije korišten u fajlu, dodati/zadržati `BookOpen`).

## Bez izmjena
- Globalni dashboard (`ToolCards`) zadržava kartice Strateški planer i Statistika — ostaju primarni ulaz.
- Rute `/stats` i `/planner` ostaju funkcionalne (samo se uklanjaju prečice iz sidebara).
