

# Dekompozicija SRSettingsPanel.tsx (505 → ~120 linija)

## Struktura razdvajanja

| Novi modul | Sadržaj | ~Linije |
|------------|---------|---------|
| `src/components/settings/AlgorithmTab.tsx` | Ciljna retencija, FSRS parametri, kognitivni otpor | ~80 |
| `src/components/settings/PersonalizationTab.tsx` | Tema boja, dashboard widgeti, zvučni efekti | ~85 |
| `src/components/settings/WorkflowTab.tsx` | Pomodoro, TTS, podsjetnici, backup | ~140 |
| `src/components/settings/SystemTab.tsx` | Export/Import, CategoryManager, HealthMonitor | ~45 |
| `src/components/SRSettingsPanel.tsx` | Orchestrator — state, header, Tabs shell, action buttons | ~120 |

## Detalji

### Zajednički props interfejs

Svaki tab prima iste props za state koji koristi:

```ts
// AlgorithmTab: local, setLocal, app, setApp
// PersonalizationTab: app, setApp
// WorkflowTab: app, setApp, tts, setTts, voices
// SystemTab: exportImportOpen, setExportImportOpen, cards, categories, subcategories, cardCountByCategory, addCategory, renameCategory, deleteCategory, exportData, exportTemplate, importData
```

### `AlgorithmTab.tsx` (L104-177)
- Ciljna retencija slider
- Leech prag i dnevni cilj inputi
- Težine kognitivnog otpora slideri
- Props: `local`, `setLocal`, `app`, `setApp`

### `PersonalizationTab.tsx` (L180-258)
- Color theme picker grid
- Dashboard widget toggle lista
- Zvučni efekti switch
- Props: `app`, `setApp`

### `WorkflowTab.tsx` (L262-446)
- Pomodoro tajmer (4 slidera + select)
- TTS brzina, glas, test dugme
- Podsjetnik za ponavljanje (notification + time picker)
- Backup podsjetnik
- Props: `app`, `setApp`, `tts`, `setTts`, `voices`

### `SystemTab.tsx` (L449-480)
- Backup & Restore dugme
- CategoryManager
- HealthMonitor (lazy)
- Props: kategorije i akcije iz konteksta, `onOpenExportImport`

### `SRSettingsPanel.tsx` (orchestrator)
- Sav state ostaje ovdje (local, app, tts, voices, exportImportOpen)
- handleSave, handleReset, hasChanges, isDefault
- Header + InfoPanel
- `<Tabs>` shell sa 4 `<TabsTrigger>`
- 4 `<TabsContent>` sa importovanim tab komponentama
- Action buttons + ExportImportDialog

## Scope
- 4 nova fajla u `src/components/settings/`
- 1 refaktorisan fajl (`SRSettingsPanel.tsx`)
- 0 promjena u potrošačima (`SettingsPage.tsx`)
- Nema novih zavisnosti

