

# Settings Reorganization Plan

## Current Problems

| Tab | Contents | Issue |
|-----|----------|-------|
| Algoritam | Retention, FSRS, Resistance weights | ✅ Clean |
| Interfejs | Theme, Widgets, Sound, Backup, Pomodoro, Notifications, TTS | ❌ Overloaded — mixes visual customization with workflow tools |
| Referenca | FSRS guide collapsibles | ✅ Fine but could live elsewhere |
| (outside tabs) | HealthMonitor | ❌ Orphaned at bottom, unrelated to settings |

**Core issue**: "Interfejs" became a dumping ground. Pomodoro, TTS, and Notifications are *workflow/study tools*, not interface customization. Health Monitor has no logical home.

## Proposed Structure: 4 Tabs

```text
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Algoritam  │  Interfejs  │  Tok rada   │   Sistem    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Tab 1: Algoritam (unchanged)
- Ciljna retencija
- Ponavljanje (FSRS) — leech, daily goal
- Težine kognitivnog otpora

### Tab 2: Interfejs (slimmed down)
- Tema boja
- Dashboard widgeti
- Zvučni efekti (toggle only)

### Tab 3: Tok rada (new — study workflow settings)
- Pomodoro tajmer (work/break/long break)
- Glasovni čitač (TTS) — speed, voice, test button
- Podsjetnik za ponavljanje (notifications)
- Backup podsjetnik

### Tab 4: Sistem (new — diagnostics & reference)
- Health Monitor (moved from bottom)
- FSRS Referenca / Vodič (moved from old Tab 3)

## Changes

### File: `src/components/SRSettingsPanel.tsx`

1. Change `TabsList` from `grid-cols-3` to `grid-cols-4`, add "Tok rada" and "Sistem" triggers
2. **Interfejs tab**: Remove Pomodoro, TTS, Notifications sections; keep only Theme, Widgets, Sound toggle
3. **New "Tok rada" tab**: Move Pomodoro, TTS, Notifications, and Backup reminder here
4. **New "Sistem" tab**: Move HealthMonitor inside this tab + move the FSRS reference collapsibles here
5. Remove the orphaned `<HealthMonitor />` from bottom of component
6. Update subtitle text from "Algoritam, interfejs i referenca" to "Algoritam, interfejs, tok rada i sistem"

### No other files changed
- `HealthMonitor.tsx` — unchanged
- `app-settings.ts` — unchanged
- No data model changes

