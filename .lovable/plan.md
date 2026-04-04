

# Poveži dnevni cilj sa planerom

## Šta se mijenja

U sekciji "Dnevna samoanaliza" u DiarySection, iznad postojećeg text inputa za cilj dana, dodaje se automatski izračunat preporučeni cilj iz planera — broj novih cjelina + dospjelih ponavljanja. Tekstualni input ostaje za kvalitativni cilj.

## Tehnički detalji

### Fajl: `src/components/metacognitive/DiarySection.tsx`

1. **Import** `loadPlanner`, `getSmartSuggestion`, `calcVelocity` iz `@/lib/planner-storage`
2. **Dodati `useMemo` blokove** za:
   - `dueCount` — prebrojati `card.sections` sa `nextReview <= now`
   - `velocity` — `calcVelocity(reviewLog, 7)`
   - `config` — `loadPlanner()` (sinhrono, iz localStorage)
   - `smartSuggestion` — `getSmartSuggestion(null, cards, config.finalGoalDate, velocity, config.bufferPercent)`
3. **UI** — unutar "Dnevna samoanaliza" bloka (L176), ispred labele "Dnevni cilj" (L178), dodati:
   - Ako `smartSuggestion` postoji i planer je konfigurisan (`config.finalGoalDate`):
     ```
     Preporučeni cilj danas: X novih + Y dospjelih
     ```
   - Kompaktna linija sa `Target` ikonom, `text-xs text-primary`, sa pozadinom `bg-primary/5 rounded-lg p-2`
   - Ako planer nije konfigurisan, ne prikazuje se ništa

### Scope
- 1 fajl, ~20 linija dodato
- Nema novih props — DiarySection već prima `cards` i `reviewLog`, čita planer direktno iz storage-a

