# Plan: `useCardsBySource(sourceId)` selektor

Cilj: ukloniti "God context" pattern u dva hooka koja trenutno povlače cijeli `cards` niz iz `CardStateContext` samo da bi filtrirali po `sourceId`. Selektor će se subscribe-ovati direktno na `cardMapStore` (Zustand) i re-renderovati komponentu **samo kad se promijene kartice tog konkretnog source-a**.

## Zašto sada

- `useAutoSplitImport` (linija 49) i `useSourceReaderActions` (linija 22) trenutno pozivaju `useCardData()` i dobijaju cijeli ~15k niz. Bilo koja mutacija bilo koje kartice triggera re-render hook-a.
- U `useAutoSplitImport` to je dovelo do potrebe za `eslint-disable react-hooks/exhaustive-deps` (linija 79) i defensive `if (phase === "preview")` guard-a (linija 86) da uvoz u toku ne bi flip-ovao UI iz "done" nazad u "preview" kad `bulkAddCards` ažurira context.
- Sa selektorom oba ta workaround-a postaju nepotrebna (mogu ostati, ali gube razlog postojanja).
- Poklapa se sa Core memory-jem `[Context Decomposition]` — ovo je sljedeći logičan korak.

## Šta se dodaje

### 1. Novi hook `useCardsBySource`

Lokacija: `src/store/useCardsBySource.ts` (pored `useCardMapStore.ts`, isti nivo apstrakcije).

```ts
import { useSyncExternalStore, useRef } from "react";
import { cardMapStore } from "./useCardMapStore";
import type { Card } from "@/lib/spaced-repetition";

const EMPTY: readonly Card[] = Object.freeze([]);

/**
 * Subscribe to cards whose `sourceId === id`. Returns a stable array
 * reference: a new array is only produced when the set of matching
 * cards changes (length OR any referenced card object identity).
 *
 * Pass `undefined`/empty string to opt out (returns the frozen empty array).
 */
export function useCardsBySource(sourceId: string | undefined): readonly Card[] {
  const cache = useRef<{ map: unknown; result: readonly Card[] }>({
    map: null, result: EMPTY,
  });

  return useSyncExternalStore(
    cardMapStore.subscribe,
    () => {
      if (!sourceId) return EMPTY;
      const map = cardMapStore.getState().cardMap;

      // Re-compute only if the map root reference changed.
      if (cache.current.map === map) return cache.current.result;

      const matched: Card[] = [];
      for (const id in map) {
        const c = map[id];
        if (c.sourceId === sourceId) matched.push(c);
      }

      // Cheap equality vs last result: same length AND every reference equal.
      const prev = cache.current.result;
      const same = matched.length === prev.length &&
        matched.every((c, i) => c === prev[i]);

      const next = same ? prev : matched;
      cache.current = { map, result: next };
      return next;
    },
    () => EMPTY, // SSR snapshot
  );
}
```

Ključne osobine:
- Snapshot je stabilan između mutacija koje ne diraju matched set → nema "getSnapshot should be cached" warning-a iz Reacta.
- Re-render se desi samo kad se promijeni kartica čiji je `sourceId === id` (jer Ref-Delta uvijek alocira novi root map reference pri svakoj mutaciji, ali shallow-equal check filtrira "neke druge kartice su se promijenile" slučajeve).
- O(N) iteracija po map root change-u — isti red veličine kao postojeći `cards.filter(...)`, ali bez React diff-a kompletnog niza.

### 2. Migracija call-site-ova

#### `src/hooks/useAutoSplitImport.ts`
- Ukloniti `cards` iz `useCardData()` destructuring-a (ako `cards` ne treba ničemu drugom — provjeriti grep-om unutar fajla; trenutno ne treba).
- Zamijeniti:
  ```ts
  const { cards } = useCardData();
  const linkedCards = useMemo(
    () => cards.filter((c) => c.sourceId === source.id),
    [cards, source.id],
  );
  ```
  sa:
  ```ts
  const linkedCards = useCardsBySource(source.id);
  ```
- `useEffect` na liniji 84 ostaje (i dalje treba refresh row "exists" status kad se linked kartice promijene), ali `phase === "preview"` guard sada postaje **defensive belt-and-suspenders**, ne kritičan workaround. Komentar ažurirati.
- `eslint-disable` na liniji 79 može ostati — taj efekt ne zavisi od `linkedCards`, već od `open` i `source.id` (semantička intencija nepromijenjena).

#### `src/hooks/useSourceReaderActions.ts`
- Ista zamjena: `const linkedCards = useCardsBySource(source.id);`
- Ukloniti import `useCardData` ako više nije potreban (provjeriti).

### 3. Testovi

Novi fajl: `src/test/use-cards-by-source.test.tsx`

Scenariji:
1. Vraća prazan niz za `undefined` sourceId.
2. Vraća prazan niz kad nema kartica u store-u.
3. Vraća samo kartice sa matching `sourceId`.
4. Stabilan reference: dva poziva za isti store state → ista array referenca.
5. Mutacija nepovezane kartice (drugi `sourceId`) → array reference ostaje isti (regresija za "God context" simptom).
6. Mutacija povezane kartice → nova array referenca.
7. Dodavanje nove kartice sa matching sourceId → niz raste, novi reference.
8. Brisanje povezane kartice → niz se smanjuje, novi reference.

Setup koristi `replaceCardMap` iz `useCardMapStore` za direktnu manipulaciju store-a, render preko `@testing-library/react` + custom hook wrapper.

## Verifikacija

- `bunx tsc --noEmit` — clean.
- `bunx vitest run src/test/use-cards-by-source.test.tsx` — svih 8 zelenih.
- `bunx vitest run src/test/auto-split-import-phase.test.tsx src/test/card-import-flow-e2e.test.tsx` — postojeći AutoSplit/import flow testovi i dalje zeleni (regresija check).
- Spot-check u browseru: otvoriti AutoSplit dijalog, započeti uvoz, dok je u toku — kreirati/urediti nepovezanu karticu u drugom tabu/akciji. Dialog mora ostati u "importing"/"done" fazi (ne smije se vratiti na "preview").

## Šta ovaj plan NE dira

- `CardStateContext.cards` ostaje — i dalje ga koriste agregati (`useCardAggregates`, dashboard, stats). Ne diramo postojeće potrošače.
- `useCardData` API neizmijenjen, nema breaking promjena.
- Ne mijenjamo `phase` reducer, `executeImportPlan`, ni jedan drugi dio AutoSplit logike.
- Ne uvodimo `useLiveQuery` (zabranjen Core memory-jem).

## Tehnički detalji

- Iteracija `for (const id in map)` je namjerno odabrana umjesto `Object.values(map).filter(...)` — izbjegava alokaciju N-elementnog intermediate niza za 15k kartica.
- `useRef` cache je per-hook-instance — ne dijeli se između komponenti, što je OK: cijena re-compute-a je mala, a globalni cache bi tražio invalidaciju.
- Alternativa razmotrena i odbačena: secondary indeks `Map<sourceId, Set<cardId>>` u `cardMapStore`. Daje O(1) lookup ali zahtijeva održavanje u svakom mutation path-u (CRUD, bulk import, sync delta, restore) — visok rizik za drift bug. Selektor sa O(N) skenom je dovoljan jer N=15k traje <2ms i radi se samo kad se map reference mijenja.
