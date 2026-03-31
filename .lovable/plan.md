

# Dead Code Cleanup + CardOrgMode TreeNode Fix

## Rezime
Nakon svih dosadašnjih refaktora, ostala su 2 fajla koji su potpuno mrtav kod (niko ih ne importuje) i 1 bug u `CardOrgMode.tsx` gdje `TreeNode` koristi `subcategory: string` umjesto UUID-baziranog modela, što kvari sort po `sortOrder` kad se koriste display nazivi kao ključevi.

---

## 1. Brisanje mrtvog koda (2 fajla)

| Fajl | Razlog |
|------|--------|
| `src/lib/forum-logic.ts` | Niko ga ne importuje nakon brisanja Foruma i CategoryManager cleanup-a |
| `src/hooks/useChapterManagement.ts` | MentalSkeleton ga više ne koristi, niko drugi ga ne importuje |

## 2. CardOrgMode TreeNode bug fix

`CardOrgMode.tsx` je **jedina** preostala komponenta sa `@dnd-kit` — i to je ispravno jer služi za organizaciju kartica unutar CategoryView. Međutim, `TreeNode` interfejs koristi:

```ts
interface TreeNode {
  subcategory: string;  // ← display name, ne UUID
  chapters: { chapter: string; cards: Card[] }[];  // ← display name
}
```

Problem: `buildTree()` na L91 postavlja `subcategory: displayName` (human name), ali onda `handleDragEnd` na L285-289 koristi `dropTarget.subcategory` da postavi `card.subcategoryId` — što znači da se **naziv** upisuje umjesto **UUID-a**.

### Fix:
- `TreeNode` dobija `subcategoryId: string` polje pored `subcategory` (display name)
- `chapters` dobija `chapterId: string` pored `chapter` (display name)
- `handleDragEnd` koristi `subcategoryId` i `chapterId` za `patchCard` umjesto display naziva
- `parseChapterDropId` i `chapterDropId` koriste UUID-ove, ne nazive

## Fajlovi

| Fajl | Promjena | Linije |
|------|----------|--------|
| `src/lib/forum-logic.ts` | **BRISANJE** | -328 |
| `src/hooks/useChapterManagement.ts` | **BRISANJE** | ~-80 |
| `src/components/category/CardOrgMode.tsx` | Fix TreeNode: UUID tracking u DnD | ~25 |

## Guardrails
- `CardOrgMode` DnD ostaje — to je legitimni organizacioni alat
- FSRS: netaknut
- Nema novih zavisnosti, nema schema promjena

## Scope
- 2 fajla obrisana (~400 linija manje)
- 1 fajl fix (~25 linija promjena)

