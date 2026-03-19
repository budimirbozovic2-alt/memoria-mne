

# Plan: Tri režima učenja (Slobodno, Aktivno prisjećanje, Metod lanca)

## Overview

Refaktorisati LearnSession komponentu tako da korisnik prvo bira režim učenja, pa tek onda kategoriju/filter. Dodati dva nova režima pored postojećeg "Slobodnog učenja": **Aktivno prisjećanje** (drill sa ocjenjivanjem modula) i **Metod lanca** (snowball kumulativni test).

## Flow korisnika

```text
[Režim selekcija] → [Kategorija/Podkat/Sort filter] → [Sesija]
     ↓                                                    
  Slobodno (postojeće)                                    
  Aktivno prisjećanje                                     
  Metod lanca (samo esejska sa ≥3 sekcija)               
```

## Izmjene po fajlovima

### 1. `src/lib/storage.ts` — Persistence progresa učenja

Dodati localStorage ključ `sr-learn-progress` koji čuva mapu `{ [cardId]: { mode, currentModule, completedModules[], chainPosition } }`. Učitava se pri pokretanju sesije, briše se kad se pitanje završi.

### 2. `src/components/LearnSession.tsx` — Kompletna rekonstrukcija

**Setup ekran (3 koraka umjesto 2):**
- **Korak 1**: Izbor režima — 3 kartice sa ikonom, nazivom, nivoom težine i kratkim opisom
- **Korak 2**: Kategorija/podkategorija filter (postojeći kod)
- **Korak 3**: Sort + Start dugme

**Filter za Metod lanca**: Kad je izabran ovaj režim, `sortedCards` se filtrira na `type === "essay" && sections.length >= 3`.

**Slobodno učenje**: Bez izmjena — postojeća logika čitanja i označavanja.

**Aktivno prisjećanje**:
- State: `phase: "preview" | "drill"`, `drillIndex`, `drillGrade`, `completedCards: Set<string>`
- Faza 1: Prikaži pitanje + sve sekcije otvorene. Dugme "Pročitano" prelazi u Fazu 2
- Faza 2: Prikaži pitanje, sakrij odgovore. Serviraj sekcije jednu po jednu. UI podsjetnik iznad "Otkrij" dugmeta. Ocjena 1-3 restartuje modul, ocjena 4 prelazi na sljedeći
- Završeno pitanje → svijetlo zelena pozadina u listi

**Metod lanca**:
- State: `chainIndex`, `chainReviewIndex`, `chainPhase: "learn" | "chainReview"`, `completedCards: Set<string>`
- Learn faza: Prikaži modul N, korisnik ocjenjuje. Ocjena 4 → pokreni chainReview od modula 1 do N
- ChainReview faza: Sekvencijalno prikaži module 1..N sa skrivenim odgovorima. UI podsjetnik "Pokušaj ponoviti cijeli lanac na glas". Ako bilo koji modul < 4 → reset na modul 1
- Završen lanac → tamno zelena u listi

### 3. `src/pages/Index.tsx` — Proširenje props-a

Dodati `onReviewSection` prop u LearnSession poziv da Aktivno prisjećanje i Metod lanca mogu upisivati ocjene u FSRS sistem (ne samo readCount).

### 4. Vizuelni elementi

- Režim kartice na setup ekranu: ikone BookOpen (slobodno), Brain (aktivno), Link (lanac) sa badge-ovima "Lak", "Srednji", "Teški"
- Lista pitanja sa sidebar-om koji prikazuje status boja (neutralna, svijetlo zelena, tamno zelena)
- Ocjenjivanje: 4 dugmeta (1-4) u stilu postojećeg ReviewSession-a
- Modul progress: horizontalni stepper koji pokazuje poziciju u lancu

## Tehnički detalji

- Persistence: `localStorage` sa ključem `sr-learn-progress`, JSON mapa card ID → progres objekat. Čita se u `useState` inicijalizatoru, piše se u `useEffect` na svaku promjenu stanja
- Chain filter: `cards.filter(c => c.type === "essay" && c.sections.length >= 3)`
- FSRS integracija: Režimi Aktivno/Lanac pozivaju `onReviewSection(cardId, sectionId, grade)` za svaku ocjenu, čime se ažurira stability/difficulty u realnom vremenu
- Ocjena modula koristi isti `calculateNextReview` iz spaced-repetition.ts

