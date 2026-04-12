

# Razdvajanje Sistem taba na dva taba

## Problem
Sistem tab trenutno sadrži tri nepovezane sekcije: Backup & Restore, Predmeti (CategoryManager) i Health Monitor. To ga čini pretrpanim i logički nekoherentnim.

## Rješenje
Podijeliti sadržaj na dva taba:
- **Predmeti** — sadrži samo CategoryManager (upravljanje predmetima/potkategorijama)
- **Sistem** — sadrži Backup & Restore i Health Monitor (održavanje baze)

## Izmjene

### 1. Kreirati `src/components/settings/SubjectsTab.tsx`
Nova komponenta koja preuzima CategoryManager sekciju iz SystemTab-a. Prima iste props za categories/subcategories/onAdd/onRename/onDelete.

### 2. Ažurirati `src/components/settings/SystemTab.tsx`
Ukloniti CategoryManager sekciju — ostaviti samo Backup & Restore i Health Monitor.

### 3. Ažurirati `src/components/SRSettingsPanel.tsx`
- Promijeniti grid sa `grid-cols-4` na `grid-cols-5`
- Dodati novi tab "Predmeti" (sa `FolderOpen` ikonom) između "Tok rada" i "Sistem"
- Renderovati `SubjectsTab` u novom `TabsContent`

## Scope
- 1 novi fajl, 2 editovana fajla
- Čisto UI preraspoređivanje, bez logičkih promjena

