

# Sljedeća faza: Kozmetičko čišćenje prop naziva (category→categoryId)

## Rezime
Jedini preostali sistemski problem nakon svih dosadašnjih refaktora je **kozmetička konfuzija prop naziva**: `onSave`, `onSaveFlash`, `addCard`, `addFlashCard`, `useCardActions` hook i `MetadataSection` koriste `category`, `subcategory`, `chapter` kao nazive parametara/propova, iako su to **UUID vrijednosti**. Ovo zbunjuje programera i može dovesti do budućih bugova.

Funkcionalno sve radi ispravno — UUID-ovi se proslijeđuju korektno. Ali konvencija nije konzistentna sa ostatkom codebase-a koji koristi `categoryId`/`subcategoryId`/`chapterId`.

---

## Promjene po fajlovima

### 1. `src/hooks/useCardActions.ts`
- Preimenovati interno state: `category`→`categoryId`, `subcategory`→`subcategoryId`, `chapter`→`chapterId`
- Preimenovati settere: `setCategory`→`setCategoryId`, `setSubcategory`→`setSubcategoryId`, `setChapter`→`setChapterId`
- Ažurirati `onSave` i `onSaveFlash` tipove u `UseCardActionsProps`: `category: string`→`categoryId: string`, itd.
- Return objekat: nove nazive

### 2. `src/components/CardForm.tsx`
- Props interfejs `onSave`/`onSaveFlash`: parametri preimenovani u `categoryId`, `subcategoryId`, `chapterId`
- JSX: `a.category`→`a.categoryId`, `a.subcategory`→`a.subcategoryId`, `a.chapter`→`a.chapterId`

### 3. `src/components/card-form/MetadataSection.tsx`
- Props interfejs: `category`→`categoryId`, `subcategory`→`subcategoryId`, `chapter`→`chapterId`
- Setteri: `setCategory`→`setCategoryId`, itd.

### 4. `src/hooks/useCardCRUD.ts`
- `addCard` parametri: `category`→`categoryId`, `subcategory`→`subcategoryId`, `chapter`→`chapterId`
- `addFlashCard` parametri: isto

### 5. `src/views/CreatePage.tsx`
- `onSave` lambda: `(q, s, c, sub, ch)` — bez promjene (shorthand), ali tip se automatski usklađuje iz `CardForm`

### 6. `src/views/EditPage.tsx`
- Bez promjena (koristi `onUpdate` koji je već `categoryId`/`subcategoryId`/`chapterId`)

### 7. Potrošači `addCard`/`addFlashCard` van forme
- `src/components/AutoSplitDialog.tsx` — `createCard(...)` pozivi (direktni, ne kroz hook) — bez promjene jer `createCard` u spaced-repetition.ts već koristi `categoryId` parametar
- `src/hooks/useCardImport.ts` — `createCard(...)` — isto, bez promjene

---

## Scope
- 4 fajla, ~60 linija preimenovanja (find-replace)
- Čisto kozmetičko — nema promjene ponašanja
- Nema novih zavisnosti
- FSRS: netaknut

