## Cilj
Standardizovati nazive query parametara koji označavaju **isti pojam** kroz cijelu aplikaciju, uz fallback čitanje starih naziva da postojeći bookmarkovi i otvoreni tabovi nastave da rade.

## Trenutno stanje (rezultat audita)

Tri različita naziva za **categoryId**:
- `?category=` — `/review` (ReviewPage čita, SubjectDashboard šalje) ✅
- `?subject=` — `/settings` (SRSettingsPanel čita, SubjectDashboard šalje) ❌ drugo ime
- `?cat=` — `/learn` (LearnPage čita, SubjectDashboard šalje) ❌ skraćenica

Dva različita naziva za **subcategoryId**:
- `?sub=` — `/learn` ❌ skraćenica
- (nema kanonskog drugdje)

Ostali parametri (`?tab=`, `?mode=`, `?freq=`, `?sort=`, `?type=`) su već konzistentni.

## Standard

| Pojam | Kanonski naziv | Stari nazivi (fallback) |
|---|---|---|
| categoryId | `?category=` | `?cat=`, `?subject=` |
| subcategoryId | `?subcategory=` | `?sub=` |
| chapterId | `?chapter=` | — |
| sourceId | `?source=` | — |
| cardId | `?card=` | — |

`?category=` je već najčešće korišten i semantički najjasniji — biramo ga kao kanonski.

## Implementacija

### 1. Novi helper `src/lib/url-params.ts`
Centralizovan reader sa fallback logikom — jedino mjesto gdje se znaju aliasi:

```ts
import type { URLSearchParams as USP } from "url";

const ALIASES: Record<string, string[]> = {
  category: ["category", "cat", "subject"],
  subcategory: ["subcategory", "sub"],
};

export function getParam(sp: URLSearchParams, key: string): string | null {
  const aliases = ALIASES[key] ?? [key];
  for (const k of aliases) {
    const v = sp.get(k);
    if (v) return v;
  }
  return null;
}

/** Setteri uvijek pišu KANONSKI naziv. */
export function buildQuery(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
```

### 2. Update mjesta koja **čitaju** parametre

- **`src/views/ReviewPage.tsx` (l. 18)**
  ```diff
  - const lockedCategory = searchParams.get("category") || null;
  + const lockedCategory = getParam(searchParams, "category");
  ```

- **`src/components/SRSettingsPanel.tsx` (l. 28)**
  ```diff
  - const subjectId = searchParams.get("subject");
  + const subjectId = getParam(searchParams, "category");
  ```
  (`tab` ostaje `searchParams.get("tab")` — već je standard.)

- **`src/views/LearnPage.tsx` (l. 21–29)**
  ```diff
  - categoryId: params.get("cat"),
  - subcategoryId: params.get("sub"),
  + categoryId: getParam(params, "category"),
  + subcategoryId: getParam(params, "subcategory"),
  ```

### 3. Update mjesta koja **grade linkove**

- **`src/views/SubjectDashboard.tsx`**
  - l. 46–48 (`handleMatrixStart`):
    ```diff
    - if (categoryId) params.set("cat", categoryId);
    + if (categoryId) params.set("category", categoryId);
    ...
    - if (f.subcategoryId) params.set("sub", f.subcategoryId);
    + if (f.subcategoryId) params.set("subcategory", f.subcategoryId);
    ```
  - l. 174:
    ```diff
    - <Link to={`/settings?tab=algorithm&subject=${categoryId}`}>
    + <Link to={`/settings?tab=algorithm&category=${categoryId}`}>
    ```
  - l. 118 (`/review?category=...`) — već kanonski, bez promjene.

### 4. Backward compatibility
`getParam` automatski prepoznaje stare aliase (`cat`, `sub`, `subject`), pa svi postojeći bookmarkovi (`/learn?cat=…&sub=…`, `/settings?subject=…`) nastavljaju da rade bez ikakve dodatne logike. Samo novi linkovi pišu kanonske nazive.

## Fajlovi
- **Novo:** `src/lib/url-params.ts`
- **Izmijenjeno:** `src/views/ReviewPage.tsx`, `src/components/SRSettingsPanel.tsx`, `src/views/LearnPage.tsx`, `src/views/SubjectDashboard.tsx`

## Van opsega
- Promjene route definicija u `App.tsx` (rute ostaju iste, samo se mijenjaju imena query parametara).
- `?tab=`, `?mode=`, `?freq=`, `?sort=`, `?type=` — već su konzistentni i jasni.
- Hash dijelovi URL-a, `state` u `navigate()`, in-memory tab state — nisu URL parametri.
- Memorija (`mem://technical-choices/domain-scoping-integrity`) — fallback ne narušava scoping; samo standardizuje ime parametra.