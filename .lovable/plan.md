## Audit kompletnog koda — izvori grešaka i suboptimizacije

Skenirano: 439 fajlova / 53k linija. Test suite: 392/396 prolazi (4 pre-existing fail-a u Zettelkasten + backup schema). Ispod su nalazi grupisani po **prioritetu** i, gdje je primjenjivo, sa **alternativnim pristupom** koji uklanja izvor problema umjesto da ga maskira.

---

### 🔴 P0 — Korijenski problemi koje treba riješiti

**1. Body pointer-events guard tretira simptom, ne uzrok.**
`src/lib/body-pointer-events-guard.ts` rješava posljedicu Radix Dialog leak-a. Korijen je obično:
- Sinhrono `setState`/navigacija unutar `onClick` koji zatvara Dialog → Radix animacija prekinuta → `pointer-events: none` ostane na `<body>`.
- `Dialog` koji renderuje toast ili drugi `Dialog` u svom `onOpenChange` callback-u → race oko fokusa.

**Alternativa:** Audit svih `Dialog` close handlera (Smart-Split, DocxImporter, useCardImport flow) — odgoditi state mutacije u `setTimeout(…, 0)` ili `requestAnimationFrame` poslije `setOpen(false)`. Tada guard postaje samo "belt-and-suspenders" osiguranje, a ne kritična zavisnost.

**2. `lint --max-warnings=123` u `package.json`.**
Lint cap od 123 upozorenja maskira realan tehnički dug. Memory navodi "Zero-any policy", ali u produkciji prolazi 123 warning-a — od toga: 18× `as unknown as` casts (najgori: `SRSettingsPanel.tsx` 6 castova u jednom fajlu, `MindMapNode.tsx`, `import-transaction.ts`).

**Alternativa:** Postupno spuštati cap (npr. -10/sedmica) i konvertovati cast-ove u prave generičke utility tipove (npr. `RecordOf<T>` za `shallowEqual`).

**3. `dangerouslySetInnerHTML` bez vidljive inline sanitizacije na 4 lokacije:**
- `src/components/zettelkasten/ZettelPreview.tsx:195` — `__html: html`
- `src/components/zettelkasten/SourceSidePanel.tsx:62` — `__html: html || '...'`
- `src/components/LinkToExistingCardModal.tsx:87` — `__html: previewHtml`
- `src/components/source-reader/SourceContent.tsx:117` — `__html: safeHtml`

Memory (`global-sanitization-v6`) tvrdi da je sanitizacija multi-layer, ali ovdje **nije eksplicitno** u render-u. Ako upstream pipeline ikad ispusti sanitizaciju (regression), XSS je otvoren.

**Alternativa:** Uvesti `<SafeHtml html={…} />` wrapper koji **uvijek** poziva `sanitizeHtml()` interno — eliminiše mogućnost da render-time DOMPurify pozivi nedostaju.

---

### 🟠 P1 — Stabilnost i resource leakovi

**4. `setInterval` raspršen po 8+ fajlova bez centralne diagnostike.**
`event-bus.ts` (5s heartbeat zauvijek), `usePersistingState`, `useNotificationScheduler` (60s), `usePomodoroEngine`, `useTestEngine`, `useSpeedReaderEngine`, `BlockingModal`, `ZenMode`, `db-schema.ts unblockIntervalId`, `log-retention`. Većina ima cleanup, ali nema globalnog visibility-a.

**Alternativa:** Mali `lib/timers.ts` registry koji loguje aktivne intervale — `HealthMonitor` bi pokazivao "5 active intervals" i pomogao bi uhvatiti leak.

**5. BroadcastChannel u Electron single-window app-u je dead code.**
`event-bus.ts` cijeli heartbeat/tab-discovery sistem (oko 100 linija) je smislen za browser tabove. Memory `desktop-only` potvrđuje da je app **isključivo Electron**. Heartbeat svakih 5s, `activeTabs` Map koji se nikad ne puni — čisti overhead.

**Alternativa:** Iza `if (window.electronAPI) return;` skipovati heartbeat. Zadržati local-bus za in-process eventove. Štedi battery i CPU.

**6. `tree MutationObserver { childList: true, subtree: true }` na `<body>` u pointer-events-guard.**
Iako je rAF coalesced, callback se okida na **svaku** DOM promjenu u app-u (uključujući svaki React commit). Filter je trivijalan ali poziv je čest.

**Alternativa:** Targeted observer **samo** kada je makar jedan overlay otvoren — install/teardown observera kroz `onAnimationStart` `data-state="open"` event. Off-state = nula obzervera.

**7. Swallowed errors (`catch {}`)** u `useCardImport.ts:142,150`, `zip-service.ts` (4 mjesta), `store/useSourceReaderStore.ts` (2 mjesta), `subject-settings.ts`, `app-settings.ts`. Ako import tiho zafejla, korisnik vidi success toast a podaci nisu spremljeni.

**Alternativa:** Minimum: `catch (e) { console.warn("[ctx]", e); }`. Idealno: tipovan `Result<T,E>` pattern u kritičnim putanjama (import, persist, restore).

**8. 113 direktnih `localStorage` poziva** kroz 10+ fajlova, svaki sa svojim try/catch-em. Duplikacija + nekonzistentno error handling.

**Alternativa:** Postojeći `src/lib/storage.ts` (već postoji u top hit-ovima) treba postati jedini API; ESLint pravilo `no-restricted-globals` za `localStorage` izvan tog fajla.

---

### 🟡 P2 — Arhitekturne suboptimizacije

**9. Najveći fajl: `SmartSplitSummaryDialog.tsx` (601 linija)** + `MindMapNode.tsx` (390) + `WorkshopCardItem.tsx` (428). Krše Orchestrator pattern (memory: "delegates logic to custom hooks, keeps UI components dumb").

**Alternativa:** Izdvojiti business logiku u `hooks/smart-split/use*.ts`; UI komponenta ispod 250 linija.

**10. `SRSettingsPanel.tsx` — 7 `useEffect`-a, 6 `as unknown as Record<string, unknown>` cast-ova.**
Manual sync ref-ova (`localRef.current = local; appRef.current = app; …`) je copy-paste pattern. Sklon zaboravljanju jednog ref-a pri dodavanju polja.

**Alternativa:** Custom hook `useLatestRef(value)` ili konsolidovati u jedan `settingsStateRef` objekat.

**11. Routing/UX nesklad:** `App.tsx:93` ima rutu `/subject/:categoryId/mnemonics`, ali memory `subject-cards-hub-v2` kaže "Mnemonics removed". Vjerovatno mrtav route-handler ili nesinhronizovana memorija.

**Alternativa:** Verifikovati da li je ruta još navigovana iz UI-a. Ako ne — obrisati. Ako jeste — ažurirati memoriju.

**12. 122 `console.*` poziva u izvornom kodu** ulaze u produkcioni Electron build (Vite default). Curi PII i interna stanja u DevTools console-u.

**Alternativa:** Vite plugin `vite-plugin-remove-console` u prod buildu, ili centralizovani `logger.ts` koji se `tree-shake`-uje u prod modu.

**13. JSON serijalizacija u hot path-u — 47 poziva** kroz `lib/contexts/hooks`. Svaki `JSON.stringify(card)` na large card objektima je sync blokirajuć.

**Alternativa:** Za diff/equality koristiti `lodash.isequal` ili shallow-equal; rezervisati `JSON.stringify` samo za persist boundary.

**14. Pre-existing failing tests (4):**
- `backup-schema.test.ts:55` — Zod `passthrough()` ne čuva nepoznata polja kako test očekuje. Backup round-trip može gubiti custom polja.
- `zettelkasten-wiki-link-integration.test.ts:206,261,300` — `backlinkIndex.getVersion()` ne vraća version bump. Backlink invalidacija je možda non-deterministička → backlinks mogu biti stale u UI-u.

**Alternativa:** Ova dva su **prava bug-a** koja zahtijevaju zaseban fix; nije kozmetika u testu.

---

### 🟢 P3 — Polish

- `useCardImport.ts:150` poziva `localStorage.removeItem("sr-review-session")` direktno umjesto kroz storage layer.
- `App.tsx:53` — `useEffect(() => installBodyPointerEventsGuard(), [])` ispravno vraća dispose, ali bez StrictMode komentara — buduće održavanje može omaškom razdvojiti install/dispose.
- `event-bus.ts` koristi `globalThis.__codexEventBus` singleton kroz HMR. Prefiksiranje pomoću `Symbol.for("codex.eventbus")` bi spriječilo koliziju s drugim modulima koji koriste isti pattern.

---

### Preporučeni redoslijed napada

1. **Sedmica 1 (P0):** Auditovati Dialog close handlere → ukloniti pointer-events leak na izvoru → guard postaje opcionalan; uvesti `<SafeHtml>` wrapper.
2. **Sedmica 2 (P1):** Popraviti 4 failing testa (backlink versioning + backup passthrough); eliminisati BroadcastChannel u Electron; centralizovati `localStorage` access.
3. **Sedmica 3 (P2):** Dekomponovati 3 najveća fajla; lint cap → 50; ukloniti console iz prod build-a.

---

### Pitanja prije akcije

1. **Po kojoj P0 stavci da krenem prvo?** (Preporuka: #1 — root-cause Dialog leak, najveći utisak za korisnika.)
2. Ili da otvorim **3 odvojena task-a** za P0 (#1, #2, #3) i pustim te da biraš redoslijed?
