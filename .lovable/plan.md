

# Plan: Daily Deck, 20-minutno pravilo, FSRS pojačanje i vizuelna mapa zaborava

## Overview

Pet povezanih izmjena: (1) Daily Deck widget na Dashboardu, (2) 20-minutno pravilo za nove kartice, (3) anti-pasivnost zaštita u ReviewSession, (4) upozorenje kad dospjele kartice prelaze limit, (5) crvena/narandžasta oznaka za dospjele kartice u kategorijama.

## 1. Daily Deck widget na Dashboardu

**Fajl: `src/components/Dashboard.tsx`**

Dodati novi dominantan widget odmah ispod top-stats kartica (iznad Pomodoro sekcije). Widget prikazuje:
- Naslov "Dnevni špil" sa ikonom
- Broj preostalih ponavljanja za danas (due sections iz svih kategorija)
- Broj novih kartica koje čekaju "prvo ponavljanje" (20-min pravilo)
- Dugme "Započni ponavljanje" koje poziva callback

**Props: `Dashboard`** — dodati `onStartReview: () => void` prop.

**Fajl: `src/pages/Index.tsx`** — proslijediti `onStartReview={() => setView("review")}` u Dashboard.

## 2. Implementacija 20-minutnog pravila

**Fajl: `src/lib/spaced-repetition.ts`**

Promijeniti `INITIAL_VALUES` za grade 3 i 4 kad je kartica `SectionState.New`:
- Za ocjenu 3 (Good): `nextReview = now + 15min` umjesto standardnog intervala
- Za ocjenu 4 (Easy): `nextReview = now + 20min` umjesto standardnog intervala

Konkretno, u `calculateNextReview`, kad je `isNew && grade >= 3`, postavi `nextReview` na `Date.now() + 15*60*1000` (grade 3) ili `Date.now() + 20*60*1000` (grade 4), ali zadrži stability/difficulty normalno. State ostaje `Learning` (ne `Review`) dok se ovo prvo ponavljanje ne završi.

Dodati novi field `firstReviewPending: boolean` u `Section` interface (default `false`). Kad se New kartica prvi put ocijeni sa 3 ili 4, postavi `firstReviewPending = true`. Kad se taj "pending" modul ponovi uspješno, postavi `firstReviewPending = false` i state prelazi u `Review`.

**Fajl: `src/lib/storage.ts`** — migracija: dodati `firstReviewPending: s.firstReviewPending || false` u `migrateSection`.

## 3. FSRS Reinforcement — anti-pasivnost u ReviewSession

**Fajl: `src/components/ReviewSession.tsx`**

- Dodati tekst instrukciju iznad "Prikaži odgovor" dugmeta: `"Pokušaj odgovoriti na glas prije otkrivanja."` (italic, muted boja)
- Pratiti `answerRevealedAt` timestamp (state). Kad korisnik otkrije odgovor, zabilježi `Date.now()`.
- Dugme za ocjenu 4 ("Lako") je `disabled` ako je prošlo manje od 3 sekunde od otkrivanja odgovora. Vizuelno: sivo dugme sa tooltipom "Pričekajte bar 3 sekunde".
- Nakon 3 sekunde, dugme se automatski aktivira (useEffect sa timeoutom).

## 4. Strategija "Pola-Pola" — upozorenje za previše dospjelih

**Fajl: `src/components/Dashboard.tsx`**

U Daily Deck widgetu, ako `stats.due > 50`:
- Prikazati upozorenje: "Imate {due} dospjelih kartica. Preporučujemo da prvo ponovite bar polovinu prije učenja novog materijala."
- Upozorenje u narandžastoj/crvenoj boji sa AlertTriangle ikonom.

**Fajl: `src/components/LearnSession.tsx`**

Na setup ekranu (korak izbora režima), ako je `dueCount > 50`, prikazati banner sa upozorenjem i preporukom. Režimi su i dalje dostupni (ne blokirati), ali je vizuelno jasno upozorenje.

Dodati `dueCount` prop u LearnSession (ili proslijediti `stats.due` iz Index.tsx).

## 5. Vizuelna mapa zaborava — boje u kategorijama

**Fajl: `src/components/Dashboard.tsx`**

U sekciji "Pregled kategorija", dodati vizuelni indikator za status pitanja:
- Pored `s.due > 0` badgea, dodati narandžastu/crvenu tačku ili border za kategorije sa visokim brojem dospjelih
- Konkretno: ako `due/total > 0.5` → crvena lijeva bordura, ako `due/total > 0.25` → narandžasta, inače zelena
- Subcategory stavke dobijaju istu logiku boja

**Fajl: `src/components/LearnSession.tsx`**

U listi pitanja (sidebar), pored postojeće svijetlo/tamno zelene za završena pitanja, dodati:
- Crvena/narandžasta oznaka za pitanja kojima je `nextReview < now` (dospjela za ponavljanje ali nisu urađena)

## Tehnički detalji

- `Section.firstReviewPending` — boolean field, default false, koristi se za 20-min pravilo
- Anti-pasivnost timer: `useState<number | null>(null)` za `answerRevealedAt`, `useEffect` sa `setTimeout(3000)` za aktiviranje grade-4 dugmeta
- Daily Deck sortira: dospjeli moduli (nextReview < now) → nove kartice (state === New), unutar svakog po starosti nextReview ascending
- Limit za upozorenje (50) se može eventualno dodati u SRSettings, ali inicijalno hardcodiran
- Nove boje: `border-l-4 border-destructive` za crvenu, `border-l-4 border-warning` za narandžastu na kategorijama

## Izmjene po fajlovima (sumarno)

1. `src/lib/spaced-repetition.ts` — Section interface + calculateNextReview za 20-min pravilo
2. `src/lib/storage.ts` — migracija za firstReviewPending
3. `src/components/Dashboard.tsx` — Daily Deck widget + kategorije sa bojama
4. `src/components/ReviewSession.tsx` — instrukcija + 3-sec timer za grade 4
5. `src/components/LearnSession.tsx` — upozorenje za previše dospjelih + boje u listi
6. `src/pages/Index.tsx` — novi props za Dashboard i LearnSession

