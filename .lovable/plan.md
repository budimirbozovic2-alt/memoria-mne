

# Plan: Popraviti praznu "Sesija završena" kod manjih filtera

## Dijagnoza (potvrđeno čitanjem koda)

U `LearnSession.tsx:25-28`, `currentIndex` se inicijalizuje iz `sessionStorage["sr-learn-current-index"]` — **vrijednost preživljava između sesija**. Scenarijski tok bug-a:

1. Korisnik pokrene Slobodno učenje za cijeli predmet "Konvencijsko pravo" → ima npr. 80 kartica → dođe do kartice 47.
2. Vrati se nazad (`onBack` → `setStarted(false)`) — `currentIndex` ostaje **47** u memoriji i u `sessionStorage`.
3. Pokrene novu sesiju u potkategoriji koja ima 5 kartica.
4. `sortedCards.length === 5`, ali `currentIndex === 47` → `card = sortedCards[47] === undefined`.
5. Blok `if (!card)` (linija 156) odmah pokreće `SessionComplete` sa **0 pregledanih kartica** (jer `readCards.size === 0` u novoj sesiji).

Dodatni okidači istog bug-a:
- Promjena `filterType` (Esej/Blic) ili `filterExamFrequent` smanji `sortedCards.length` ispod trenutnog `currentIndex`.
- Promjena `learnMode === "chain"` (filter `c.type === "essay" && c.sections.length >= 3`) drastično skrati listu.
- Hot reload tokom razvoja ostavlja stari index.

## Rješenje (3 izmjene u `LearnSession.tsx`)

### 1. Reset `currentIndex` na `onStart`
Pri kliku na "Počni učenje", uvijek krenuti od 0:
```ts
onStart={() => { 
  setCurrentIndex(0); 
  sessionStorage.setItem("sr-learn-current-index", "0");
  setReadCards(new Set());
  setCompletedCards(new Set());
  setChainCompletedCards(new Set());
  setStarted(true); 
}}
```

### 2. Defensivni clamp u `useEffect`
Ako `sortedCards.length` postane manji od `currentIndex` tokom aktivne sesije (npr. zbog nekog filter-promjene), spustiti index:
```ts
useEffect(() => {
  if (started && currentIndex >= sortedCards.length && sortedCards.length > 0) {
    goToCard(sortedCards.length - 1);
  }
}, [started, sortedCards.length, currentIndex, goToCard]);
```

### 3. Razlikovati "prazan filter" od "završena sesija"
U `if (!card)` bloku (linija 156), ako `sortedCards.length === 0` → prikazati poruku "Nema kartica za odabrani filter — vrati se i promijeni izbor" umjesto `SessionComplete`. Inače aktivira pogrešan toast/log.

```ts
if (!card) {
  if (sortedCards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Nema kartica za odabrani filter.</p>
        <Button onClick={() => setStarted(false)}>Promijeni filter</Button>
      </div>
    );
  }
  // ... postojeća SessionComplete logika
}
```

Ovo sprečava pogrešno logovanje aktivnosti (`addActivityEntry`) i `recordDayDiscipline` u "lažno završenim" sesijama.

## Što NE diram
- `sessionStorage` perzistencija je korisna za **resume unutar iste sesije** (refresh stranice) — ostaje, samo se resetuje na novom `onStart`.
- Filter logika u `SessionFilters` — radi ispravno.
- `ReviewSession` — ima vlastiti session-restore mehanizam i ne pati od ovog bug-a (drugačiji tok).

## Fajlovi
- `src/components/LearnSession.tsx` — ~15 izmijenjenih linija (3 patch-a iznad)

Ukupno: **1 fajl**. Direktno rješava korisnikov scenarij i sprečava lažno logovanje aktivnosti.

