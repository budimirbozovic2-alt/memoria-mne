

# Sljedeće stavke iz deep audita

## Pregled urađenog
- ✅ K4: db.ts reload race condition
- ✅ K2: dupli ready timer
- ✅ K5: localStorage → IDB za backup timestamp
- ✅ db.ts razdvojen na 3 modula
- ✅ MindMapCanvas dekompozicija
- ✅ Diamond handle + textarea fix

## Preostale stavke po prioritetu

### 1. event-bus.ts: `setInterval` bez cleanup-a (RIZIK)

`src/lib/event-bus.ts` L71 — `setInterval` za heartbeat nikada nema `clearInterval`. Ako se eventBus reinicijalizira (HMR, reimport), timeri se gomilaju. Ovo je memory/CPU leak u developmentu, a potencijalno i u produkciji pri dugotrajnim sesijama.

**Fix**: Dodati `destroy()` metodu na eventBus koja čisti interval. Alternativno, sačuvati intervalId i dodati guard da se ne kreira dupli.

| Fajl | Promjena |
|------|----------|
| `src/lib/event-bus.ts` | Sačuvati `setInterval` return u varijablu, dodati `clearInterval` u `destroy()` metodu, dodati guard protiv duplih intervala |

---

### 2. Notification check — `setInterval` svaki minut čita settings (NEEFIKASNO)

`src/contexts/AppContext.tsx` L380-396 — svaki minut poziva `loadAppSettings()` koji parsira localStorage. Dovoljno je pročitati `reminderHour` i `reminderMinute` jednom pri mount-u, i jednom kad se settings promijene.

**Fix**: Čitati settings u `useRef` pri mount-u i refreshati samo kad se vrati na tab (visibilitychange).

| Fajl | Promjena |
|------|----------|
| `src/contexts/AppContext.tsx` L377-396 | Keširati settings u ref, dodati visibilitychange listener za refresh |

---

### 3. Veliki fajlovi — CardOrgMode (503), SRSettingsPanel (505), CardViewMode (500)

Tri komponente prelaze 500 linija. Svaka se može razdvojiti na logičke pod-komponente:

- **SRSettingsPanel.tsx** (505 linija) — razdvojiti na tab-ove: `FSRSTab`, `ScheduleTab`, `DisplayTab`
- **CardOrgMode.tsx** (503 linija) — izdvojiti drag-and-drop logiku u `useCardOrgDnd` hook
- **CardViewMode.tsx** (500 linija) — izdvojiti filter/sort logiku u `useCardFilters` hook

Ovo je refaktoring nižeg prioriteta — funkcionalno je sve ispravno.

| Fajl | Promjena |
|------|----------|
| `src/components/SRSettingsPanel.tsx` | Razdvojiti na 3 tab komponente |
| `src/components/category/CardOrgMode.tsx` | Izdvojiti DnD hook |
| `src/components/category/CardViewMode.tsx` | Izdvojiti filter/sort hook |

---

### 4. `useCardContext()` backward-compat — spread 4 konteksta (PERFORMANCE)

`AppContext.tsx` L153-159 — `useCardContext()` pravi novi merged objekat pri svakom renderu bilo kojeg od 4 konteksta. Komponente koje koriste `useCardContext` se re-renderuju kad se promijeni **bilo šta** — čime se poništava dekompozicija na granularne kontekste.

**Fix**: Pronaći sve pozive `useCardContext()` i zamijeniti ih granularnim hookovima (`useCardData`, `useCategoryData`, `useReviewData`, `useCardActions`). Zatim deprecirati `useCardContext`.

| Fajl | Promjena |
|------|----------|
| Svaki potrošač `useCardContext` | Zamijeniti sa granularnim hookom |

---

## Preporuka za implementaciju

Predlažem da krenemo sa stavkama **1 i 2** (event-bus leak i notification optimizacija) jer su najrizičnije i najbrže za popraviti (~30 linija ukupno). Stavke 3 i 4 su veći refaktorinzi koji se mogu uraditi postepeno.

