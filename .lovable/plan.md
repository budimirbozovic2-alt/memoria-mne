

# Deep Audit Izvještaj — Post-Refaktor QA Inspekcija

---

## 🔴 KRITIČNO (High Priority)

### K1. UUID se prikazuje korisniku umjesto naziva — Stats modul (6 komponenti)

Sve stats komponente koriste UUID `categories` niz i prikazuju ga direktno korisnicima. `category: cat` gdje je `cat` UUID, pa se u JSX-u renderuje UUID string.

| Fajl | Linije | Problem |
|------|--------|---------|
| `src/components/stats/PredictionTab.tsx` | L57, L66, L119 | `{p.category}` prikazuje UUID |
| `src/components/stats/ResistanceTab.tsx` | L61, L114, L127 | `{d.category}` prikazuje UUID |
| `src/components/CognitiveAnalytics.tsx` | L49, L53, L88, L234, L260 | `{pair.cardA.category}`, `{cat.category}`, `{spot.category}`, `{hook.category}` — sve UUID |
| `src/components/MetacognitiveCenter.tsx` | L199, L223 | `{l.category}` i `{s.category}` prikazuje UUID iz `ReviewLogEntry.category` |
| `src/pages/FrequentErrors.tsx` | L233, L305 | `{error.subcategory}` prikazuje UUID (popunjeno sa `card.subcategoryId` na L114) |

**Uzrok**: `ReviewLogEntry.category` (L29 u `useCardAnnotations.ts`) se puni sa `c.categoryId` (UUID). Downstream potrošači koriste tu vrijednost za prikaz. Isto za `cognitive-analytics.ts` koji gradi `InterferencePair.category`, `CategoryStabilityInfo.category` itd. koristeći UUID.

**Potreban fix**: Svi ovi fajlovi moraju koristiti `categoryRecords` lookup (`uuidToName` map) prije prikaza.

---

### K2. `FrequentErrors` — `groupByCategory` grupira po UUID-u, prikazuje UUID kao naslov grupe

| Fajl | Linije |
|------|--------|
| `src/pages/FrequentErrors.tsx` | L113-114, L136-143 |

`category: card.categoryId` (UUID) i `subcategory: card.subcategoryId` (UUID) se koriste za grupiranje i prikaz. Korisnik vidi UUID naslove sekcija.

---

## 🟠 UPOZORENJE (Medium Priority)

### U1. `cognitive-analytics.ts` — propušta UUID-ove kroz sve interfejse

| Fajl | Linije | Problem |
|------|--------|---------|
| `src/lib/cognitive-analytics.ts` | L13-14 | `InterferencePair.cardA.category` — `string` bez lookup-a |
| `src/lib/cognitive-analytics.ts` | L117-118 | Popunjava sa `card.categoryId` (UUID) |
| `src/lib/cognitive-analytics.ts` | L129, L172 | `CategoryStabilityInfo.category` = UUID |
| `src/lib/cognitive-analytics.ts` | L275, L281 | `FrictionInsight` koristi `ReviewLogEntry.category` (UUID) za `fromCategory`/`toCategory` |
| `src/lib/cognitive-analytics.ts` | L403, L432, L507, L543 | `BlindSpot.category`, `WeakHook.category` = UUID |

**Impakt**: Svi kognitivni widgeti prikazuju UUID umjesto naziva predmeta.

### U2. `getLearningVelocity` vraća UUID-ove kao `category`

| Fajl | Linije |
|------|--------|
| `src/lib/metacognitive-storage.ts` | L355 | `{ category: cat, ... }` gdje je `cat` UUID |
| `src/components/stats/PredictionTab.tsx` | L31, L66 | `v.category` se koristi za prikaz — UUID |

### U3. `ResistanceTab` — filtrira `reviewLog` i `latencyData` po UUID ali `LatencyEntry.category` čuva UUID?

| Fajl | Linije |
|------|--------|
| `src/components/stats/ResistanceTab.tsx` | L35-36, L42 | `e.category === cat` — radi jer su oba UUID, ali prikaz `{d.category}` je UUID |

**Napomena**: Funkcionalnost filtriranja je ispravna (UUID === UUID), ali prikaz je neispravan.

### U4. `CardOrgMode.tsx` — `tree.find(n => n.subcategory === overContainer.subDisplay)` koristi display name za lookup

| Fajl | Linije |
|------|--------|
| `src/components/category/CardOrgMode.tsx` | L307-308, L321-322 | `find` po display name. Radi samo ako su nazivi jedinstveni — krhko. Trebalo bi koristiti `subcategoryId`. |

### U5. `loadLatency()` i `loadCalibration()` — sinhroni localStorage pozivi u `useMemo`

| Fajl | Linije |
|------|--------|
| `src/components/stats/ResistanceTab.tsx` | L28 | `useMemo(() => loadLatency(), [])` |
| `src/components/stats/CalibrationTab.tsx` | L12 | `useMemo(() => loadCalibration(), [])` |

Ove funkcije čitaju iz localStorage sinhrono. Nije anti-pattern per se, ali sa praznim dependency nizom `[]` nikad se ne re-evaluira čak ni kad se podaci promijene tokom sesije. Minor issue — korisnik mora refreshovati stranicu da vidi nove podatke.

---

## 🟡 ČIŠĆENJE (Low Priority)

### C1. Zustand selektori — ČISTI (nema kršenja)

Pregled svih 6 fajlova koji koriste `useSourceReaderStore`:
- Nijedna komponenta ne koristi `const state = useSourceReaderStore()` — svi koriste `.getState()` ili granularne selektore.
- ✅ Nema kršenja pravila granularnih selektora.

### C2. Gamification — potpuno očišćeno

- ✅ Nema preostalih importa iz `src/components/gamification/`.
- ✅ Nema referenci na `RomanForum`, `ForumPage`, `forum-logic`.
- ✅ `useChapterManagement` potpuno uklonjen.

### C3. Rute — čiste

- ✅ Nema zaostalih ruta za Forum u routeru.

### C4. EventBus listeners — ispravno čišćeni

- `MnemonicModule.tsx` L91-94: `subscribe()` vraća `unsubscribe`, poziva se u cleanup.
- `BlockingModal.tsx` L15-23: Oba subscribe-a čiste se u return.
- ✅ Nema curenja memorije.

### C5. ZIP Worker — ispravno implementiran

- `zip-service.ts` koristi Worker-first sa fallback.
- ✅ Nema direktnih `new JSZip()` poziva na main thread-u (osim fallback-a).
- ✅ Worker se terminira nakon upotrebe.

### C6. `src/test/construction-phases.test.ts` — već obrisan ✅

### C7. `CardForm.tsx` — prop nazivi `category`, `subcategory`, `chapter`

| Fajl | Linije |
|------|--------|
| `src/components/CardForm.tsx` | L107-112 |

Ovi prop-ovi koriste stare nazive (`category`, `subcategory`, `chapter`) ali **interno čuvaju UUID vrijednosti** (potvrđeno u `useCardActions.ts` L108-110). Ovo je kozmetički zbunjujuće ali nije bug. Preimenovanje u `categoryId`/`subcategoryId`/`chapterId` bi poboljšalo čitljivost.

---

## Sumarni pregled

| Prioritet | Broj problema | Pogođeni fajlovi |
|-----------|---------------|-------------------|
| 🔴 KRITIČNO | 2 problema | 6 fajlova (UUID prikaz u Stats/Analytics/Errors) |
| 🟠 UPOZORENJE | 5 problema | 5 fajlova (UUID propagacija kroz analytics, krhki lookup u CardOrgMode) |
| 🟡 ČIŠĆENJE | 1 kozmetički | `CardForm.tsx` prop naming |

**Najveći preostali problem**: UUID-ovi se prikazuju korisnicima u cijelom Stats/Analytics modulu (PredictionTab, ResistanceTab, CognitiveAnalytics, MetacognitiveCenter, FrequentErrors). Prethodni UUID display fix je popravio Learn/Review/SpeedReader, ali Stats modul je propušten.

**Preporučeni sljedeći korak**: Uvesti `categoryRecords` ili `uuidToName` map u svih 5 pogođenih Stats komponenti i `cognitive-analytics.ts` po istom obrascu koji je primijenjen na `SessionHeader.tsx` i `ReviewCard.tsx`.

