import { useCallback, MutableRefObject } from "react";
import { Card } from "@/lib/spaced-repetition";
import { CardMap, bumpMapVersion, schedulePersist } from "@/lib/persist-queue";
import { db, idbLoadCategories, idbSaveCategories, type CategoryRecord, type SubcategoryNode, type ChapterNode } from "@/lib/db";
import { invalidateSourcesCache } from "@/lib/sources-storage";
import { toast } from "@/hooks/use-toast";
import { optimisticCategoryUpdate } from "@/lib/category-service";

interface UseCategoryManagementParams {
  setCategoryRecords: React.Dispatch<React.SetStateAction<CategoryRecord[]>>;
  setCardMapState: React.Dispatch<React.SetStateAction<CardMap>>;
  cardMapRef: MutableRefObject<CardMap>;
  getCategoryRecords: () => { id: string; name: string }[];
}

// ─── Helper: ensure a node has proper types ───
function normalizeNode(s: any, i: number): SubcategoryNode {
  if (typeof s === "string") {
    return { id: crypto.randomUUID(), name: s, chapters: [], sortOrder: i };
  }
  return {
    id: s.id || crypto.randomUUID(),
    name: s.name,
    chapters: ((s.chapters || []) as any[]).map((ch: any, ci: number): ChapterNode =>
      typeof ch === "string" ? { id: crypto.randomUUID(), name: ch, sortOrder: ci } : { id: ch.id || crypto.randomUUID(), name: ch.name, sortOrder: ch.sortOrder ?? ci }
    ),
    sortOrder: s.sortOrder ?? i,
  };
}

function getNodes(rec: CategoryRecord): SubcategoryNode[] {
  return ((rec.subcategories || []) as any[]).map(normalizeNode);
}

export function useCategoryManagement({
  setCategoryRecords,
  setCardMapState,
  cardMapRef,
  getCategoryRecords,
}: UseCategoryManagementParams) {
  const addCategory = useCallback(
    (name: string) => {
      const newId = crypto.randomUUID();
      const newRec: CategoryRecord = { id: newId, name, sortOrder: 9999, subcategories: [] };
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.some(r => r.id === newId) ? prev : [...prev, newRec],
        "addCategory"
      );
    },
    [setCategoryRecords],
  );

  const renameCategory = useCallback(
    (categoryId: string, newName: string) => {
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => r.id === categoryId ? { ...r, name: newName } : r),
        "renameCategory"
      );
      invalidateSourcesCache();
    },
    [setCategoryRecords],
  );

  const deleteCategory = useCallback(
    (categoryId: string, purgeCards = false) => {
      const records = getCategoryRecords();
      const remaining = records.filter(r => r.id !== categoryId);
      const fallbackId = remaining.length > 0 ? remaining[0].id : "";
      const now = Date.now();

      setCategoryRecords(prev => prev.filter(r => r.id !== categoryId));

      if (purgeCards) {
        const toDelete: string[] = [];
        const nextRef = { ...cardMapRef.current };
        for (const [id, c] of Object.entries(nextRef)) {
          if (c.categoryId === categoryId) {
            toDelete.push(id);
            delete nextRef[id];
          }
        }
        if (toDelete.length > 0) {
          cardMapRef.current = nextRef;
          setCardMapState(() => nextRef);
          bumpMapVersion();
          (async () => {
            try { await db.cards.bulkDelete(toDelete); } catch (err) {
              console.error("[deleteCategory] card purge failed", err);
            }
          })();
        }
      } else {
        const changed: Card[] = [];
        const nextRef = { ...cardMapRef.current };
        for (const [id, c] of Object.entries(nextRef)) {
          if (c.categoryId === categoryId) {
            const u = { ...c, categoryId: fallbackId, subcategory: "", subcategoryId: "", updatedAt: now };
            nextRef[id] = u;
            changed.push(u);
          }
        }
        if (changed.length > 0) {
          cardMapRef.current = nextRef;
          schedulePersist({ type: "bulk", cards: changed });
          setCardMapState(() => nextRef);
          bumpMapVersion();
        }
      }

      (async () => {
        try {
          if (purgeCards) {
            await db.sources.where("categoryId").equals(categoryId).delete();
          } else {
            await db.sources.where("categoryId").equals(categoryId).modify({ categoryId: fallbackId });
          }
          await db.categories.delete(categoryId);
          invalidateSourcesCache();
        } catch (err) {
          console.error("[deleteCategory] cascade failed", err);
          toast({ title: "Greška pri brisanju kategorije", description: "Pokušajte ponovo.", variant: "destructive" });
        }
      })();
    },
    [setCategoryRecords, setCardMapState, cardMapRef, getCategoryRecords],
  );

  // ═══════════════════════════════════════════════════════
  // Subcategory CRUD
  // ═══════════════════════════════════════════════════════

  const addSubcategory = useCallback(
    (categoryId: string, subcategory: string) => {
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => {
          if (r.id !== categoryId) return r;
          const nodes = getNodes(r);
          if (nodes.some(n => n.name === subcategory)) return { ...r, subcategories: nodes };
          return { ...r, subcategories: [...nodes, { id: crypto.randomUUID(), name: subcategory, chapters: [], sortOrder: nodes.length }] };
        }),
        "addSubcategory"
      );
    },
    [setCategoryRecords],
  );

  const renameSubcategory = useCallback(
    (categoryId: string, oldName: string, newName: string) => {
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => {
          if (r.id !== categoryId) return r;
          const nodes = getNodes(r);
          if (nodes.some(n => n.name === newName)) return { ...r, subcategories: nodes };
          return { ...r, subcategories: nodes.map(n => n.name === oldName ? { ...n, name: newName } : n) };
        }),
        "renameSubcategory"
      );
      // Update cards that reference old name
      const now = Date.now();
      const changed: Card[] = [];
      const nextRef = { ...cardMapRef.current };
      for (const [id, c] of Object.entries(nextRef)) {
        if (c.categoryId === categoryId && c.subcategory === oldName) {
          const u = { ...c, subcategory: newName, updatedAt: now };
          nextRef[id] = u;
          changed.push(u);
        }
      }
      if (changed.length > 0) {
        cardMapRef.current = nextRef;
        schedulePersist({ type: "bulk", cards: changed });
        setCardMapState(() => nextRef);
        bumpMapVersion();
      }
    },
    [setCategoryRecords, setCardMapState, cardMapRef],
  );

  const deleteSubcategory = useCallback(
    (categoryId: string, subcategory: string) => {
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => {
          if (r.id !== categoryId) return r;
          const nodes = getNodes(r);
          return { ...r, subcategories: nodes.filter(n => n.name !== subcategory) };
        }),
        "deleteSubcategory"
      );
      // Non-destructive: move cards to uncategorized
      const now = Date.now();
      const changed: Card[] = [];
      const nextRef = { ...cardMapRef.current };
      for (const [id, c] of Object.entries(nextRef)) {
        if (c.categoryId === categoryId && c.subcategory === subcategory) {
          const u = { ...c, subcategory: "", subcategoryId: "", chapter: "", chapterId: "", updatedAt: now };
          nextRef[id] = u;
          changed.push(u);
        }
      }
      if (changed.length > 0) {
        cardMapRef.current = nextRef;
        schedulePersist({ type: "bulk", cards: changed });
        setCardMapState(() => nextRef);
        bumpMapVersion();
      }
    },
    [setCategoryRecords, setCardMapState, cardMapRef],
  );

  const bulkUpdateSubcategory = useCallback((ids: string[], subcategory: string) => {
    const now = Date.now();
    const changed: Card[] = [];
    const nextRef = { ...cardMapRef.current };
    for (const id of ids) {
      if (nextRef[id]) {
        const u = { ...nextRef[id], subcategory, updatedAt: now };
        nextRef[id] = u;
        changed.push(u);
      }
    }
    if (changed.length > 0) {
      cardMapRef.current = nextRef;
      schedulePersist({ type: "bulk", cards: changed });
      setCardMapState(() => nextRef);
      bumpMapVersion();
    }
  }, [setCardMapState, cardMapRef]);

  // ═══════════════════════════════════════════════════════
  // Chapter CRUD — now uses ChapterNode with UUID
  // ═══════════════════════════════════════════════════════

  const addChapter = useCallback((categoryId: string, subName: string, chapterName: string) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = getNodes(r);
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            if (n.chapters.some(ch => ch.name === chapterName)) return n;
            const newChapter: ChapterNode = { id: crypto.randomUUID(), name: chapterName, sortOrder: n.chapters.length };
            return { ...n, chapters: [...n.chapters, newChapter] };
          }),
        };
      }),
      "addChapter"
    );
  }, [setCategoryRecords]);

  const renameChapter = useCallback((categoryId: string, subName: string, oldChapter: string, newChapter: string) => {
    // Update cards
    const now = Date.now();
    const changed: Card[] = [];
    const nextRef = { ...cardMapRef.current };
    for (const [id, c] of Object.entries(nextRef)) {
      if (c.categoryId === categoryId && c.subcategory === subName && c.chapter === oldChapter) {
        const u = { ...c, chapter: newChapter, updatedAt: now };
        nextRef[id] = u;
        changed.push(u);
      }
    }
    if (changed.length > 0) {
      cardMapRef.current = nextRef;
      schedulePersist({ type: "bulk", cards: changed });
      setCardMapState(() => nextRef);
      bumpMapVersion();
    }
    // Update node
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = getNodes(r);
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            return { ...n, chapters: n.chapters.map(ch => ch.name === oldChapter ? { ...ch, name: newChapter } : ch) };
          }),
        };
      }),
      "renameChapter"
    );
  }, [setCategoryRecords, setCardMapState, cardMapRef]);

  const deleteChapter = useCallback((categoryId: string, subName: string, chapterName: string) => {
    // Non-destructive: move cards to chapter=""
    const now = Date.now();
    const changed: Card[] = [];
    const nextRef = { ...cardMapRef.current };
    for (const [id, c] of Object.entries(nextRef)) {
      if (c.categoryId === categoryId && c.subcategory === subName && c.chapter === chapterName) {
        const u = { ...c, chapter: "", chapterId: "", updatedAt: now };
        nextRef[id] = u;
        changed.push(u);
      }
    }
    if (changed.length > 0) {
      cardMapRef.current = nextRef;
      schedulePersist({ type: "bulk", cards: changed });
      setCardMapState(() => nextRef);
      bumpMapVersion();
    }
    // Update node
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = getNodes(r);
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            return { ...n, chapters: n.chapters.filter(ch => ch.name !== chapterName) };
          }),
        };
      }),
      "deleteChapter"
    );
  }, [setCategoryRecords, setCardMapState, cardMapRef]);

  const reorderSubcategories = useCallback((categoryId: string, ordered: string[]) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = getNodes(r);
        const nodeMap = new Map(nodes.map(n => [n.name, n]));
        const reordered = ordered.map((name, i) => {
          const n = nodeMap.get(name);
          return n ? { ...n, sortOrder: i } : { id: crypto.randomUUID(), name, chapters: [] as ChapterNode[], sortOrder: i };
        });
        return { ...r, subcategories: reordered };
      }),
      "reorderSubcategories"
    );
  }, [setCategoryRecords]);

  const reorderChapters = useCallback((categoryId: string, subName: string, ordered: string[]) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = getNodes(r);
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            // Reorder by name, preserving ChapterNode objects
            const chMap = new Map(n.chapters.map(ch => [ch.name, ch]));
            const reordered = ordered.map((name, i) => {
              const ch = chMap.get(name);
              return ch ? { ...ch, sortOrder: i } : { id: crypto.randomUUID(), name, sortOrder: i };
            });
            return { ...n, chapters: reordered };
          }),
        };
      }),
      "reorderChapters"
    );
  }, [setCategoryRecords]);

  // ── Category reorder ──
  const reorderCategories = useCallback((ordered: string[]) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => {
        const byId = new Map(prev.map(r => [r.id, r]));
        return ordered.map((id, i) => {
          const rec = byId.get(id);
          return rec ? { ...rec, sortOrder: i } : { id, name: id, sortOrder: i, subcategories: [] };
        });
      },
      "reorderCategories"
    );
  }, [setCategoryRecords]);

  return {
    addCategory,
    renameCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    bulkUpdateSubcategory,
    addChapter,
    renameChapter,
    deleteChapter,
    reorderSubcategories,
    reorderChapters,
    reorderCategories,
  };
}
