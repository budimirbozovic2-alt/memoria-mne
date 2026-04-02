

# Tier 2: Centralizacija card mutacija + eliminacija react-query

## 3 stavke

### 1. `confirmCardReview` u sources-storage.ts (SSoT narušavanje)

**Problem**: `db.cards.update(cardId, { needsReview: undefined })` piše direktno u IDB, zaobilazeći in-memory `cardMap`. Stanje ostaje staro do reload-a.

**Fix**: Umjesto direktnog DB poziva, emitovati event koji `useCards` sluša, ili primiti callback. Najjednostavnije: koristiti isti `onCardLinksCleared` pattern — dodati novi listener tip `onCardReviewConfirmed` koji `useCards` sluša i ažurira cardMap + persist-queue.

| Fajl | Promjena |
|------|----------|
| `sources-storage.ts` | Dodati `_reviewConfirmListeners` set, `onCardReviewConfirmed(fn)` subscribe, `confirmCardReview` poziva listener umjesto direktnog db.cards.update |
| `useCards.ts` | Subscribe na `onCardReviewConfirmed`, ažurirati cardMap + schedulePersist |

### 2. `HealthMonitor.tsx` L122 — `db.cards.update` direktno

**Problem**: Orphan cleanup piše `db.cards.update(id, { categoryId, subcategoryId, chapterId })` direktno u IDB. In-memory cardMap ne zna za promjenu.

**Fix**: Emitovati event bus signal nakon cleanup-a. `useCards` sluša taj event i reloada kartice iz IDB (ili ažurira in-memory).

Alternativa (jednostavnija): Koristiti `eventBus.emit(EVENT_TYPES.CARDS_IMPORTED)` koji već postoji i triggeruje reload u `useCards`.

| Fajl | Promjena |
|------|----------|
| `HealthMonitor.tsx` | Nakon uspješnog cleanup-a, emitovati `eventBus.emit(EVENT_TYPES.CARDS_IMPORTED)` |
| `event-bus.ts` | Dodati `HEALTH_CLEANUP` event type ako `CARDS_IMPORTED` ne postoji |

### 3. Eliminacija `@tanstack/react-query` (~40KB)

**Problem**: react-query se koristi samo na 2 mjesta — `MnemonicModule` (useQuery za loadMnemonicCards) i `TextSelectionTooltip` (invalidateQueries). Cijela biblioteka (~40KB) za 2 poziva.

**Fix**: Zamijeniti sa `useState` + `useEffect` + event-bus pattern koji već postoji:

**MnemonicModule.tsx:**
- `useState<MnemonicCard[]>([])` umjesto `useQuery`
- `useEffect` sa `loadMnemonicCards().then(setCards)` na mount
- `eventBus.subscribe(MNEMONICS_UPDATED)` za refresh (već postoji!)
- `setCards` umjesto `qc.setQueryData`
- Ukloniti `useQueryClient` import

**TextSelectionTooltip.tsx:**
- Ukloniti `useQueryClient` i `qc.invalidateQueries`
- `eventBus.emit(MNEMONICS_UPDATED)` već postoji na L69 — to je dovoljno

**App.tsx:**
- Ukloniti `QueryClientProvider` wrapper
- Ukloniti `QueryClient` import

**Cleanup:**
- Obrisati `src/lib/query-client.ts`
- Ukloniti `@tanstack/react-query` iz `package.json`

## Scope
- 6 fajlova: sources-storage, useCards, HealthMonitor, MnemonicModule, TextSelectionTooltip, App.tsx
- 1 fajl obrisan: query-client.ts
- 1 dependency uklonjena: @tanstack/react-query
- ~40KB smanjenje bundle-a
- Nema promjene ponašanja

