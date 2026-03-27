

# Imperial Standardization — Localized UI (Serbian Latin)

## Overview
Replace all remaining Latin/Roman placeholders with clean Serbian labels across the Forum, Dashboard, Navigation, and Database. Keep the building type identifiers (`BuildingType` enum values like `"tabularium"`, `"basilica"`) as internal constants — only change user-facing display text.

## Changes

### 1. `src/components/gamification/monument-buildings.tsx` (line 11-22)
Replace `BUILDING_LABELS` with Serbian translations:
```
amphitheatrum → "Amfiteatar"
basilica → "Bazilika"
tabularium → "Arhiv"
rostra → "Govornica"
curia → "Senat"
macellum → "Tržnica"
argentaria → "Blagajna"
templum → "Hram"
arcus → "Slavoluk"
insula → "Blok"
```

### 2. `src/components/gamification/MonumentCard.tsx` (line 195, 203)
- `"Dominatio"` → `"Savladanost"`
- `"cives"` → `"modula"` (consistent with app terminology)

### 3. `src/components/gamification/MonumentInterior.tsx` (line 182)
- `"Fontes"` → `"Izvori"`

### 4. `src/components/Dashboard.tsx` (lines 126-127)
- `"ENTER THE FORVM"` → `"FORUM ZNANJA"`
- `"Forum Iustitiae — tvoj hram znanja"` → `"Pregled napretka po kategorijama"`

### 5. `src/components/TopNav.tsx`
- Line 224: `title="Forum Iustitiae"` → `title="Forum znanja"`, same for `aria-label`
- Line 352: `"Forum Iustitiae"` → `"Forum znanja"`

### 6. `src/views/RomanForumPage.tsx` (line 75)
- `"Nulla monumenta. Crea disciplinas ut Forum aedificētur."` → `"Nema kategorija. Kreiraj kartice da bi se Forum izgradio."`

### 7. `src/views/DatabasePage.tsx` (line 98)
- `"Tabularium"` → `"Registar izvora"`

## Files Changed

| File | Change |
|------|--------|
| `src/components/gamification/monument-buildings.tsx` | Serbian building labels |
| `src/components/gamification/MonumentCard.tsx` | "Savladanost", "modula" |
| `src/components/gamification/MonumentInterior.tsx` | "Izvori" |
| `src/components/Dashboard.tsx` | Serbian Forum gateway text |
| `src/components/TopNav.tsx` | "Forum znanja" |
| `src/views/RomanForumPage.tsx` | Serbian empty state |
| `src/views/DatabasePage.tsx` | "Registar izvora" |

## Guardrails
- Internal `BuildingType` enum values (`"tabularium"`, `"basilica"`, etc.) stay unchanged — only display labels change
- No FSRS math changes
- No navigation structure changes
- No new dependencies

