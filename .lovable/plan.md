

# Analiza God Objekata i Monolita

## Rezultat: Većina koda je dobro dekomponovana. Postoji **1 pravi god object** i **2 monolita**.

---

## 🔴 GOD OBJECT: `useCards()` hook (262 linije, 35+ metoda)

**Fajl**: `src/hooks/useCards.ts`

Iako je interna logika delegirana u sub-hookove (`useCardCRUD`, `useCardAnnotations`, `useCategoryManagement`, `useCardExport`, `useCardImport`), `useCards()` ostaje **centralni orchestrator koji vraća 35+ metoda i 12+ state objekata** iz jednog return objekta. Svaki pozivalac (a to je samo `AppContext`) dobija sve — nema granularnog pristupa.

**Problem**: Bilo koja promjena u bilo kojem sub-hooku uzrokuje re-kreiranje cijelog return objekta. `AppContext` ovo kompenzira Proxy-jem za actions, ali `CardDataContext` i dalje re-renderuje sve potrošače kad se promijeni bilo koji podatak (cards, categories, reviewLog, srSettings — sve u istom kontekstu).

**Preporuka**: Razdvojiti na 3 nezavisna hooka:
- `useCardState()` — cards, dueCards, stats
- `useCategoryState()` — categoryRecords, subcategories, categoryStats
- `useReviewState()` — reviewLog, srSettings

---

## 🔴 MONOLIT: `SpeedReader.tsx` (946 linija)

**Fajl**: `src/components/SpeedReader.tsx`

Daleko najveća komponenta u projektu. Sadrži:
- TTS logiku (~100 linija)
- Word tokenizaciju i RSVP engine (~150 linija)
- Source selekciju i navigaciju (~100 linija)
- Settings panel (WPM, font, theme) (~100 linija)
- Keyboard shortcut handling (~50 linija)
- Kompletan JSX sa 4+ panela (~400 linija)

Sve u jednom fajlu, bez ekstrakcije hookova ili podkomponenti (za razliku od `SourceReader` koji je lijepo dekomponovan na 8 podkomponenti).

**Preporuka**: Ekstrahovati:
- `useSpeedReaderEngine()` — state mašina, tokenizacija, WPM logika
- `useSpeedReaderTTS()` — TTS integracija
- `SpeedReaderToolbar.tsx` — settings kontrole
- `SpeedReaderDisplay.tsx` — RSVP prikaz riječi

---

## 🟠 MONOLIT: `cognitive-analytics.ts` (552 linije, 8 nezavisnih funkcija)

**Fajl**: `src/lib/cognitive-analytics.ts`

Sadrži 8 potpuno nezavisnih analitičkih funkcija (`calcInterferencePairs`, `calcCategoryStability`, `calcForgettingCurve`, `calcFrictionTransitions`, `calcRetentionByHour`, `calcBlindSpots`, `calcWeakHooks`, `calcOverconfidenceSpots`). Nijedna ne zavisi od druge — čist "utility bag" anti-pattern.

**Preporuka**: Razdvojiti po domenu ili ostaviti kao jeste (nisko prioritetno jer nema state, samo pure funkcije).

---

## ✅ DOBRO DEKOMPONOVANO (nije problem)

| Modul | Linije | Status |
|-------|--------|--------|
| `AppContext.tsx` | 403 | ✅ Razdvojen na 4 konteksta (CardData, CardActions, UI, Pomodoro) |
| `SourceReader.tsx` | 153 | ✅ Orchestrator sa 8 podkomponenti |
| `Dashboard.tsx` | 115 | ✅ Razdvojen na 6 widgeta |
| `LearnSession.tsx` | 227 | ✅ Lazy-loaded režimi (Free, Recall, Chain) |
| `ReviewSession.tsx` | 207 | ✅ Razdvojen na Setup/Card/Complete |
| `StrategicPlanner.tsx` | 118 | ✅ Razdvojen na 3 taba + hook |
| `CardList.tsx` | 447 | ✅ Virtualizovan, badges i context menu ekstrahovani |
| `MnemonicWorkshop.tsx` | 359 | ✅ Virtualizovan, WorkshopCardItem ekstrahovan |
| `MentalSkeleton.tsx` | ~150 | ✅ Read-only, ChapterBox/SkeletonCardTile ekstrahovani |

---

## Sumarni pregled

| Tip | Fajl | Linije | Prioritet |
|-----|------|--------|-----------|
| 🔴 God Object | `useCards.ts` | 262 (35+ metoda) | Srednji — funkcionira ali skalira loše |
| 🔴 Monolit | `SpeedReader.tsx` | 946 | Visok — treba dekompoziciju |
| 🟠 Utility Bag | `cognitive-analytics.ts` | 552 | Nizak — pure functions, nema state |

**Preporučeni sljedeći korak**: Dekompozicija `SpeedReader.tsx` po istom obrascu kao `SourceReader.tsx` (hook + podkomponente).

