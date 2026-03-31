

# Dijagnostika: Glave se ne čuvaju + FSRS validacija

## Pronađeni uzrok — StructureManagerDialog šalje NAZIVE umjesto UUID-ova

Ovo je **identičan anti-pattern** kao prethodni category-by-name bug. `StructureManagerDialog.tsx` proslijeđuje **string nazive** u callback funkcije koje očekuju **UUID-ove**.

### Primjer problema (addChapter):
```text
StructureManagerDialog L102:
  onAddChapter(categoryId, subName, name)     ← subName = "Građansko pravo" (NAME)

useCategoryManagement L224:
  if (n.id !== subcategoryId) return n;        ← subcategoryId = "Građansko pravo" ≠ UUID
  → NIKADA ne matchuje → glava se NIKAD ne doda
```

### Svih 7 pogođenih poziva u StructureManagerDialog.tsx:

| Linija | Poziv | Šalje | Treba |
|--------|-------|-------|-------|
| L66 | `onRenameSubcategory(catId, oldName, newName)` | name, name | subId (UUID), newName |
| L81 | `onDeleteSubcategory(catId, deleteConfirm.sub)` | name | subId (UUID) |
| L94 | `onReorderSubcategories(catId, reordered.map(s => s.name))` | name[] | id[] (UUID[]) |
| L102 | `onAddChapter(catId, subName, name)` | subName | subId (UUID) |
| L110 | `onRenameChapter(catId, subName, oldCh, newName)` | subName, chName | subId, chId |
| L120 | `onReorderChapters(catId, subName, reordered.map(ch => ch.name))` | subName, chName[] | subId, chId[] |
| L83 | `onDeleteChapter(catId, deleteConfirm.sub, deleteConfirm.ch)` | subName, chName | subId, chId |

### Interfejs je također pogrešan:
Prop tipovi na L21-27 kažu `subName: string` — treba `subcategoryId: string`, `chapterId: string`.

---

## Plan popravke

### Fajl 1: `src/components/category/StructureManagerDialog.tsx`

**A) Ažuriraj interface** (L14-28):
- `onRenameSubcategory: (catId, subcategoryId, newName) => void`
- `onDeleteSubcategory: (catId, subcategoryId) => void`
- `onReorderSubcategories: (catId, orderedIds: string[]) => void`
- `onAddChapter: (catId, subcategoryId, chapterName) => void`
- `onRenameChapter: (catId, subcategoryId, chapterId, newName) => void`
- `onDeleteChapter: (catId, subcategoryId, chapterId) => void`
- `onReorderChapters: (catId, subcategoryId, orderedIds: string[]) => void`

**B) Ažuriraj lokalni state** — `editingSub`, `addingChapterFor`, `deleteConfirm` trebaju čuvati `node.id` umjesto `node.name` za identifikaciju. Display name se čita iz `node.name`.

**C) Ažuriraj sve callback pozive** — proslijedi `node.id` / `ch.id` umjesto `.name`:
- L66: `onRenameSubcategory(categoryId, node.id, newName)`
- L81: `onDeleteSubcategory(categoryId, node.id)`
- L94: `onReorderSubcategories(categoryId, reordered.map(s => s.id))`
- L102: `onAddChapter(categoryId, node.id, name)`
- L110: `onRenameChapter(categoryId, node.id, ch.id, newName)`
- L120: `onReorderChapters(categoryId, node.id, reordered.map(ch => ch.id))`
- L83: `onDeleteChapter(categoryId, subNode.id, chNode.id)`

### Fajl 2: `src/views/CategoryView.tsx` — bez promjena
Već proslijeđuje `addChapter`, `renameChapter` itd. direktno iz `useCardActions` → `useCategoryManagement`, koji očekuju UUID-ove. Problem je isključivo u StructureManagerDialog.

---

## FSRS Validacija

FSRS algoritam ne zahtijeva popravku koda. Problem "prazne konsolidacije" je očekivan jer:
1. Baza je tek migrirana — karticama nedostaju FSRS scheduling podaci
2. `spaced-repetition.ts` matematika je netaknuta kroz sve refaktore
3. Nakon kreiranja nove kartice i ocjenjivanja sa "Teško/Again", FSRS će zakazati ponavljanje — ovo se može testirati ručno nakon primjene fix-a iznad

---

## Scope
- **1 fajl**: `StructureManagerDialog.tsx` (~40 linija promjena)
- Nema novih zavisnosti
- Nema schema promjena
- FSRS: netaknut

