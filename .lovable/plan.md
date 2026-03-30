

# Health Monitor → Podešavanja + Orphan Detection + Error Log

## Promjene

### 1. Ukloni Health tab iz MyStats.tsx
- Obriši `HeartPulse` import, `health` TabsTrigger i `TabsContent`
- Promijeni drugi `TabsList` grid sa `grid-cols-3` na `grid-cols-2` (Predikcija, Efikasnost)

### 2. Dodaj Health Monitor u SRSettingsPanel.tsx (tab "Sistem")
- Lazy import `HealthMonitor`
- Renderuj ga ispod CategoryManager sekcije unutar `TabsContent value="system"`

### 3. Proširi HealthMonitor.tsx sa orphan detekcijom i error logom
- **Orphan detekcija**: Nakon refresh-a, učitaj sve kartice i sve kategorije iz IDB. Pronađi kartice čiji `categoryId` ne postoji u tabeli kategorija. Prikaži upozorenje sa brojem orphan kartica i dugme "Očisti" koje postavlja `categoryId` na prvu validnu kategoriju (ili briše).
- **Error Log**: Čitaj `memoria-crash-log` iz localStorage. Prikaži listu crash entry-ja (timestamp, label, message) sa dugmetom za brisanje loga.
- UI struktura:
  - Postojeći storage/table widgets (nepromijenjeni)
  - Nova sekcija "Integritet podataka" — orphan count, badge, cleanup dugme
  - Nova sekcija "Error Log" — lista entry-ja, clear dugme

### Fajlovi
| Fajl | Promjena |
|------|----------|
| `src/components/MyStats.tsx` | Ukloni health tab (~15 linija) |
| `src/components/SRSettingsPanel.tsx` | Dodaj lazy HealthMonitor u system tab (~10 linija) |
| `src/components/HealthMonitor.tsx` | Dodaj orphan scan + error log viewer (~80 linija) |

## Scope
- 3 fajla, ~100 linija promjena
- Bez IDB schema promjena

