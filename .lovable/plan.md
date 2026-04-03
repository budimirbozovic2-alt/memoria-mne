# Dashboard dorада — UUID fix + StudyFlow widget

## 1. Bug: UUID umjesto imena u najslabijim kategorijama

**Problem:** `useDashboardData.ts` L186-192 koristi `categories` (niz UUID-ova) kao `name` u `weakestCategories`.

**Fix:** Proslijediti `categoryRecords` u `useDashboardData`, koristiti `categoryRecords.find(r => r.id === cat)?.name` za display name.

### Fajlovi:
- `useDashboardData.ts` — dodati `categoryRecords` parametar, fix `weakestCategories` useMemo
- `Dashboard.tsx` — proslijediti `categoryRecords` prop u hook
- `DashboardPage.tsx` — proslijediti `categoryRecords` u Dashboard

## 2. Novi widget: StudyFlow (tok učenja iz planera)

Widget koji prikazuje danas preporučeni tok učenja na osnovu generisanog plana iz Strateškog planera.

### Šta prikazuje:
- **Trenutni predmet u fokusu** — koji predmet je po rasporedu danas (na osnovu `generateStudyPlan` timeline-a)
- **Dnevna kvota** — koliko sekcija treba danas obraditi (iz `SmartSuggestion`)
- **Omjer učenje/ponavljanje** — dinamički iz `calcLearningReviewRatio` (90/10 → 10/90)
- **Progres danas** — koliko je urađeno vs cilj
- CTA dugme "Nastavi učenje" koje vodi na `/learn`

### Izgled:
```text
┌─────────────────────────────────────┐
│ 📋 Plan za danas                    │
│                                     │
│ Fokus: Krivično materijalno pravo   │
│ ████████░░ 16/25 sekcija            │
│                                     │
│ Omjer: 70% učenje · 30% ponavljanje │
│ Faza: Učenje + konsolidacija        │
│                                     │
│ [Nastavi učenje →]                  │
└─────────────────────────────────────┘
```

### Fajlovi:
| Fajl | Promjena |
|------|----------|
| `src/components/dashboard/StudyFlowWidget.tsx` | **NOVI** — widget komponenta |
| `src/hooks/useDashboardData.ts` | Dodati `categoryRecords` param, fix UUID, izračunati studyFlow podatke iz `generateStudyPlan` + `calcLearningReviewRatio` |
| `src/components/Dashboard.tsx` | Proslijediti categoryRecords, renderovati StudyFlowWidget u lijevu kolonu |
| `src/views/DashboardPage.tsx` | Proslijediti `categoryRecords` prop |

### Logika u `useDashboardData`:
- Poziva `generateStudyPlan(config, categoryRecords, cards)` kroz `useDeferredCompute`
- Pronalazi koji predmet je "aktivan danas" (gdje `startDate <= today <= endDate`)
- Računa `calcLearningReviewRatio(overallPct)` za omjer
- Koristi postojeći `dailyMapped` i `dailyQuota` za progres

### Uslovi:
- Widget se prikazuje samo ako je planer konfigurisan (`finalGoalDate` postoji)
- Ako nema plana, ne prikazuje se (graceful degradation)

## Scope
- 1 novi fajl, 3 modifikovana
- ~80 linija neto
- Koristi isključivo postojeće funkcije iz `planner-storage.ts`
