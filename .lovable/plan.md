## Status

Osnovna funkcionalnost — čuvanje i vraćanje scroll pozicije nakon edita kartice — **već postoji** (implementirana u prethodnom koraku kao dio "vrati se gdje sam bio" sistema):

- `handleEdit` u `SubjectCardsView.tsx` snima `window.scrollY` (zajedno sa tabom, sub-modom, pretragom i filterom) u `sessionStorage` prije navigacije na `/edit`.
- Pri povratku, `useEffect` restaurira sve to, uključujući scroll, kroz `requestAnimationFrame`.

## Problem koji ostaje

Trenutni restore koristi **samo jedan `requestAnimationFrame`**. Lista kartica je virtualizovana (`@tanstack/react-virtual`), pa se ukupna `scrollHeight` mjeri asinhrono kako redovi ulaze u viewport. Posljedica: ako je korisnik bio duboko skrolan, prvi frame još nema dovoljno visine, `scrollTo` "ošteti" target i stane gdje god može — što izgleda kao da scroll restore ne radi.

## Plan: ojačati scroll restore u `SubjectCardsView.tsx`

Zamijeniti single-frame `requestAnimationFrame` sa kratkim retry-loop-om koji se zaustavlja čim je dokument dovoljno visok da prihvati traženi `targetY` (ili nakon ~8 frame-ova, ~130 ms — nevidljivo korisniku).

### Algoritam

1. Pročitaj `targetY = initialSnapshot.scrollY`.
2. Svaki frame:
   - Izračunaj `maxScroll = scrollHeight - innerHeight`.
   - `scrollTo({ top: min(targetY, maxScroll), behavior: "auto" })`.
   - Ako je `maxScroll < targetY` i `attempt < 8`, zakaži novi frame.
   - Inače: stani.
3. `useEffect` cleanup postavlja `cancelled = true` i otkazuje aktivni frame.

### Zašto ovo rješava slučaj

- Virtualizer naraste dovoljno već nakon 1–3 frame-a u tipičnim slučajevima.
- Cap od 8 frame-ova štiti od beskonačne petlje ako je sadržaj zaista kraći (npr. korisnik je obrisao kartice u edit-u).
- `min(targetY, maxScroll)` osigurava da nikad ne tražimo nemoguće, pa pozicija ostaje u dnu liste umjesto da bude resetovana na vrh.

## Fajlovi

- **Izmijenjeno:** `src/views/SubjectCardsView.tsx` — samo `useEffect` blok za scroll restore (linije ~77–84).

## Van opsega

- Ostali dijelovi snapshot sistema (path, tab, filteri) ostaju netaknuti.
- `LearnPage` i ostale rute koriste isti helper i ne treba ih dirati ovdje.