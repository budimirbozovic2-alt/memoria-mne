# Refaktoring Dnevnika u lokalnu dijagnostiku predmeta

## Pregled

Dnevnik se transformiše iz globalne funkcije sa dnevnikom samoanaliza i dijagnostikom u **lokalnu dijagnostiku predmeta** koja prikazuje greške i kognitivnu analitiku filtrirane po jednom categoryId. Uklonja se:
- Dnevnik (DiarySection) — kompletno brisanje
- Globalna /metacognitive ruta i /frequent-errors ruta
- Dnevnik iz navigacionog panela (sidebar + TopNav)

Dodaje se:
- Dugme "Dijagnostika" na SubjectDashboard umjesto "Dnevnik"
- Nova ruta `/subject/:categoryId/diagnostics` sa refaktorisanim komponentama

---

## Detaljne promjene

### 1. Nova ruta i stranica: SubjectDiagnosticsPage

**Novi fajl: `src/views/SubjectDiagnosticsPage.tsx`**

Čita `categoryId` iz URL parametara, filtrira kartice i reviewLog samo na taj predmet, i renderuje:
- `FrequentErrors` — prosljeđuje samo kartice tog predmeta
- `CognitiveAnalytics` — prosljeđuje samo kartice i reviewLog tog predmeta

Nema tab-ova (uklonjen diary tab), samo vertikalni stack: Greške pa Kognitivna dijagnostika.

### 2. Modifikacija analitičkih funkcija za category-scoping

Analitičke funkcije (`calcInterferencePairs`, `calcCategoryStability`, `calcStressPerformance`, `calcBlindSpots`, `calcWeakHooks`) već primaju cards kao parametar — dovoljno je proslijediti filtrirane kartice. `calcCategoryStability` prima categories niz — proslijedit ćemo samo `[categoryId]`. `calcStressPerformance` i `calcFrictionAnalysis` koriste reviewLog — filtriraćemo ga po categoryId prije slanja (reviewLog ima `cardId`, pa ćemo koristiti set kartica predmeta za filtriranje). `calcRecoveryRate` i `calcWeakHooks` koriste globalne IDB podatke bez mogućnosti filtriranja — privremeno ih možemo izostaviti ili prilagoditi.

Konkretno:
- `calcFrictionAnalysis` — analizira tranzicije **između** predmeta, nema smisla na nivou jednog predmeta → ukloniti iz lokalne dijagnostike
- `calcRecoveryRate` — baziran na discipline logu, ne na predmetu → ukloniti iz lokalne dijagnostike
- `calcInterferencePairs` — već filtrira po categoryId interno → radi sa filtriranim karticama
- `calcCategoryStability` — primiće `[categoryId]` umjesto svih kategorija
- `calcStressPerformance` — primiće filtrirani reviewLog
- `calcBlindSpots` — primiće filtrirane kartice
- `calcWeakHooks` — koristi mnemonicCards, teško scoping → izostaviti za sada

### 3. Promjena SubjectDashboard

U zaglavlju (header icon buttons):
- Zamijeniti dugme **Dnevnik** (`/metacognitive`) sa **Dijagnostika** (`/subject/${categoryId}/diagnostics`)
- Ikona: `AlertTriangle` (kao u postojećem tab-u greški)
- Tooltip: "Dijagnostika"

### 4. Uklanjanje globalnih ruta i navigacije

**`src/App.tsx`**:
- Ukloniti `/metacognitive` rutu
- Ukloniti `/frequent-errors` rutu
- Dodati `/subject/:categoryId/diagnostics` rutu
- Ukloniti lazy importa za MetacognitivePage i FrequentErrorsPage

**`src/components/AppSidebar.tsx`**:
- Ukloniti `{ path: "/metacognitive", icon: BookOpen, label: "Dnevnik" }` iz TOOLS_NAV

**`src/components/TopNav.tsx`**:
- Ukloniti `{ path: "/metacognitive", label: "Dnevnik" }` iz TOOLS_NAV

**`src/components/Breadcrumbs.tsx`**:
- Ukloniti `/metacognitive` iz ROUTE_LABELS i LAB_ROUTES
- Ukloniti `/frequent-errors` iz ROUTE_LABELS

**`src/contexts/AppContext.tsx`**:
- Ukloniti `"metacognitive"` i `"frequent-errors"` iz View type i VIEW_ROUTES

### 5. Brisanje nepotrebnih fajlova

- `src/views/MetacognitivePage.tsx` — brisanje
- `src/views/FrequentErrorsPage.tsx` — brisanje
- `src/components/MetacognitiveCenter.tsx` — brisanje
- `src/components/metacognitive/DiarySection.tsx` — brisanje
- `src/components/metacognitive/WeeklyChart.tsx` — brisanje
- `src/components/MetacognitiveOnboarding.tsx` — brisanje

**Napomena**: `src/lib/metacognitive-storage.ts` se NE briše jer ga koriste brojne komponente (ReviewCard, stats tabovi, AppContext itd.) za calibration, latency, activity tracking.

### 6. CognitiveAnalytics refaktoring

Modifikovati `CognitiveAnalytics` da prima opcioni `categoryId` prop. Kada je prisutan:
- Izostaviti Friction Analysis i Recovery Rate sekcije
- Izostaviti Weak Hooks sekciju
- Proslijediti `[categoryId]` u `calcCategoryStability`
- Ostale sekcije (Interference, Stability, Stress, Blind Spots) rade sa već filtriranim podacima

### 7. FrequentErrors — bez izmjena u logici

Komponenta već prima `cards` i `categoryRecords` kao prop-ove. Prosljeđivanjem filtriranih kartica automatski prikazuje samo greške tog predmeta.

---

## Fajlovi

| Akcija | Fajl |
|--------|------|
| Kreiranje | `src/views/SubjectDiagnosticsPage.tsx` |
| Izmjena | `src/views/SubjectDashboard.tsx` |
| Izmjena | `src/components/CognitiveAnalytics.tsx` |
| Izmjena | `src/App.tsx` |
| Izmjena | `src/components/AppSidebar.tsx` |
| Izmjena | `src/components/TopNav.tsx` |
| Izmjena | `src/components/Breadcrumbs.tsx` |
| Izmjena | `src/contexts/AppContext.tsx` |
| Brisanje | `src/views/MetacognitivePage.tsx` |
| Brisanje | `src/views/FrequentErrorsPage.tsx` |
| Brisanje | `src/components/MetacognitiveCenter.tsx` |
| Brisanje | `src/components/metacognitive/DiarySection.tsx` |
| Brisanje | `src/components/metacognitive/WeeklyChart.tsx` |
| Brisanje | `src/components/MetacognitiveOnboarding.tsx` |
