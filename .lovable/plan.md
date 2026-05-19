# P0 — Brisanje kartice ne ažurira UI (C4 regression)

## Korijenski uzrok

`src/lib/repositories/cardRepository.ts → commitDelete()` prvo radi `delete cardMapRefFacade.current[id]` (in-place mutacija), pa onda `setCardMap((prev) => { if (!prev[id]) return prev; … })`. Pošto C4 ujedinjuje ref i store u **isti atom** (`cardMapRefFacade.current === cardMapStore.getState().cardMap`), `prev[id]` je već `undefined` u trenutku poziva updater-a. Guard ranog izlaska vraća `prev` bez kreiranja novog objekta → Zustand ne emituje promjenu → `useSyncExternalStore` ne re-renderuje → kartica ostaje u listi.

Toast "Kartica obrisana" se i dalje pojavljuje jer `useCardCRUD.deleteCard` ga ispaljuje **prije** dispatch-a (sinkrono, bez čekanja). IndexedDB delete prolazi normalno, tako da nakon refresh-a kartica zaista nestane — ali korisniku to izgleda kao da klik ništa nije uradio.

Isti anti-paterni postoje i u `commitSingle`, `commitBulk`, `applySyncDelta`, `replaceAll` — slučajno rade jer ti updateri uvijek prave nov `{...prev}` objekat, ali su konceptualno pogrešni i predstavljaju tempiranu bombu (svaka buduća "skip-if-noop" optimizacija u tim metodama ponovo ulazi u istu rupu).

## Rješenje (root-cause, ne maskiranje)

Ukinuti sve in-place mutacije `cardMapRefFacade.current[...] = …` u repozitorijumu. U C4 modelu **`setCardMap` JE i ref-update i state-update u istom potezu**, jer Zustand sinkrono prepiše atom prije nego što izađe iz `setState`. Naredni `cardMapRefFacade.current` read odmah vraća novi objekat. Time pravimo jednosmjerni tok: writer → `setCardMap` → store atom → sync ref read + React subscribe.

### `src/lib/repositories/cardRepository.ts`

```ts
function commitSingle(card: Card): void {
  schedulePersist({ type: "put", card });
  setCardMap((prev) => ({ ...prev, [card.id]: card }));
  bumpMapVersion();
}

function commitBulk(cards: Card[]): void {
  if (cards.length === 0) return;
  schedulePersist({ type: "bulk", cards });
  setCardMap((prev) => {
    const next = { ...prev };
    for (const c of cards) next[c.id] = c;
    return next;
  });
  bumpMapVersion();
}

function commitDelete(id: string): void {
  schedulePersist({ type: "delete", id });
  setCardMap((prev) => {
    if (!(id in prev)) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
  bumpMapVersion();
}

export function applySyncDelta(rows: Card[], deletedIds: string[]): void {
  if (rows.length === 0 && deletedIds.length === 0) return;
  setCardMap((prev) => {
    const next = { ...prev };
    for (const c of rows) next[c.id] = c;
    for (const id of deletedIds) delete next[id];
    return next;
  });
  bumpMapVersion();
}

export function replaceAll(map: CardMap): void {
  setCardMap({ ...map });
  bumpMapVersion();
}
```

`get`/`snapshot` ostaju netaknuti — i dalje čitaju kroz `cardMapRefFacade.current` / `getCardMap()`, što je sad isto što i live store atom.

### `src/hooks/useCardCRUD.ts` — kvalitativna sitnica

Premjestiti `toast.success("Kartica obrisana.")` u `then()` `dispatch`-a (Promise) tako da se toast pojavi **tek kad commit prođe kroz mutex** — sprečava lažnu pozitivnu poruku ako mutex stane:

```ts
const deleteCard = useCallback((id: string) => {
  void cardCommandBus.dispatch({ type: "delete", id })
    .then(() => toast.success("Kartica obrisana."))
    .catch(() => toast.error("Brisanje nije uspjelo."));
}, []);
```

Isto za `updateCard` (već postojeća poruka).

## Testovi

Novi `src/test/card-repository-delete.test.ts`:
- `commitDelete` uklanja karticu iz `getCardMap()` snapshot-a *i* trigger-uje `cardMapStore.subscribe` listener (broj poziva == 1).
- Regresivni test: nakon `remove(id)` `getCardMap()[id]` je `undefined` **i** subscribe je dobio drugačiju referencu (`prev !== next`).
- `commitBulk` + `applySyncDelta` slično: jedan notify po batch-u, listener vidi nov objekat.
- `useCardCRUD.deleteCard` test (postojeći `card-command-bus.test.ts` stil): nakon `await drain()`, `getCardMap()` ne sadrži id; postojeći scenariji za put/patch ne regresuju.

## Out of scope (zabilježiti za kasnije)

- Konfirmacijski dijalog prije brisanja (UX) — korisnik nije tražio.
- Audit ostalih repozitorijuma (settings/reviewLog) na isti C4 anti-paterm — odvojeni PR.
