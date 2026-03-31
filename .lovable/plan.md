

# Fix Build Errors — Stabilizacija nakon Pod-faze 2B

## Rezime
27 build grešaka u 9 fajlova. Sve su posljedica nepotpune migracije na UUID sistem i nedostajućih importa. Nema novih biblioteka, nema schema promjena.

---

## 1. Missing React imports

### `src/components/MnemonicModule.tsx` (L3)
- Dodati `useRef, useEffect` u import: `import { useState, useCallback, useMemo, useRef, useEffect } from "react";`

### `src/components/MnemonicWorkshop.tsx` (L2)
- Dodati `useEffect`: `import { useState, useMemo, useCallback, useEffect } from "react";`

---

## 2. MnemonicCard nema `subcategory` polje (ima `subcategoryId`)

### `src/components/MnemonicTest.tsx`
- L37, L53, L196, L355: zamijeni `c.subcategory` → `c.subcategoryId`
- L355: `currentCard.subcategory` → `currentCard.subcategoryId`, sa lookup za prikaz naziva

### `src/components/workshop/WorkshopCardItem.tsx`
- L37, L38, L42: `card.subcategory` → `card.subcategoryId` (L37 fallback `|| card.subcategoryId` je OK ali treba ukloniti nepostojeći `card.subcategory`)

---

## 3. MentalSkeleton `onUpdateChapters` tip mismatch (L27, L110)

**Problem**: Props interfejs definiše `chapter: string` ali `useChapterManagement` šalje `chapterId: string`.

**Fix**: Promijeniti Props interfejs u `MentalSkeleton.tsx` L27:
```ts
onUpdateChapters: (updates: { id: string; chapterId: string; chapterOrder: number }[]) => void;
```

---

## 4. StudyModeFree — `subcategory` prop ne postoji na `TextSelectionTooltip`

### `src/components/learn/StudyModeFree.tsx` (L82, L96)
- Zamijeni `subcategory={card.subcategory}` → `subcategoryId={card.subcategoryId}`

---

## 5. `toast.success` ne postoji u useCardExport

### `src/hooks/useCardExport.ts` (L128, L132, L202, L206)
- Zamijeni `toast.success("...")` sa `toast({ title: "..." })` (jer koristi shadcn toast, ne sonner)

---

## 6. EventBus TypeScript greške — `payload` je `unknown`

### `src/lib/event-bus.ts` (L43-58)
- Cast payload u heartbeat/reply/leaving subscriberima: `(payload: any)` je već u potpisu ali TS ga vidi kao `unknown` jer je generički. Fix: eksplicitno tipizirati subscribe pozive kao `subscribe<{sourceTabId: string}>(...)` ili dodati `as any` cast.

---

## 7. query-client `refetchOnReconnect: "stale"` tip greška

### `src/lib/query-client.ts` (L10)
- Zamijeni `"stale"` sa `false` (ili `true`). Tanstack Query v5 ne prihvata `"stale"` string za `refetchOnReconnect`.

---

## 8. Planner UUID prikaz (bonus — iz korisničkog zahtjeva)

### `src/components/planner/PhaseItem.tsx` (L74-84)
- `p.categories` sadrži UUID-ove. Treba lookup za ime.
- Dodati prop `categoryNames: Record<string, string>` i prikazati `categoryNames[cat] || cat`

### `src/components/planner/OperationsTab.tsx` (L228-236)
- Kategorije pill-ovi prikazuju UUID. Treba isti lookup.
- Izračunati `catNameMap` iz `categoryRecords` (treba dodati `categoryRecords` kao prop ili proslijediti iz `StrategicPlanner` koji već ima pristup)
- Alternativa: prop `categories` promijeniti iz `string[]` u `{id: string, name: string}[]`

### `src/components/StrategicPlanner.tsx`
- Proslijeđuje `categories={categories}` (UUID niz). Treba proslijediti i `categoryRecords` ili `catNameMap` za prikaz.

---

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `src/components/MnemonicModule.tsx` | Dodaj `useRef, useEffect` import |
| `src/components/MnemonicWorkshop.tsx` | Dodaj `useEffect` import |
| `src/components/MnemonicTest.tsx` | `subcategory` → `subcategoryId` (5 mjesta) |
| `src/components/workshop/WorkshopCardItem.tsx` | `subcategory` → `subcategoryId` (3 mjesta) |
| `src/components/MentalSkeleton.tsx` | Props tip: `chapter` → `chapterId` |
| `src/components/learn/StudyModeFree.tsx` | `subcategory` → `subcategoryId` (2 mjesta) |
| `src/hooks/useCardExport.ts` | `toast.success` → `toast({title})` |
| `src/lib/event-bus.ts` | Tipizacija payload-a u subscribe pozivima |
| `src/lib/query-client.ts` | `"stale"` → `false` |
| `src/components/planner/PhaseItem.tsx` | Dodaj catNameMap prop, lookup za prikaz |
| `src/components/planner/OperationsTab.tsx` | Proslijedi catNameMap, lookup u pill-ovima |
| `src/components/StrategicPlanner.tsx` | Proslijedi categoryRecords ili catNameMap |

## Scope
- 12 fajlova, ~60 linija promjena
- Nema novih zavisnosti, nema schema promjena

