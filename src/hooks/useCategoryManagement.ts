import { useCallback, MutableRefObject } from "react";
import { Card } from "@/lib/spaced-repetition";
import { CardMap, bumpMapVersion, schedulePersist } from "@/lib/persist-queue";
import { db, idbLoadCategories, idbSaveCategories, type CategoryRecord, type SubcategoryNode } from "@/lib/db";
import { invalidateSourcesCache } from "@/lib/sources-storage";
import { toast } from "@/hooks/use-toast";

interface UseCategoryManagementParams {
  setCategoryRecords: React.Dispatch<React.SetStateAction<CategoryRecord[]>>;
  setCardMapState: React.Dispatch<React.SetStateAction<CardMap>>;
  cardMapRef: MutableRefObject<CardMap>;
  getCategoryRecords: () => { id: string; name: string }[];
}

// ─── Optimistic update with rollback ───
async function optimisticCategoryUpdate(
  setCategoryRecords: React.Dispatch<React.SetStateAction<CategoryRecord[]>>,
  updater: (prev: CategoryRecord[]) => CategoryRecord[],
  label: string
) {
  let rollbackSnapshot: CategoryRecord[] | null = null;
  setCategoryRecords(prev => {
    rollbackSnapshot = prev;
    return updater(prev);
  });
  try {
    const current = await idbLoadCategories();
    const updated = updater(current);
    await idbSaveCategories(updated);
  } catch (e) {
    console.error(`[${label}] IDB persist failed, rolling back`, e);
    if (rollbackSnapshot) setCategoryRecords(rollbackSnapshot);
    toast({ title: "Greška", description: "Promjena nije sačuvana.", variant: "destructive" });
  }
}

// ─── Helper: read SubcategoryNode[] from IDB for a category ───
async function getNodes(catId: string): Promise<SubcategoryNode[]> {
  const rec = await db.categories.get(catId);
  if (!rec) return [];
  return (rec.subcategories || []).map((s: any) =>
    typeof s === "string" ? { name: s, chapters: [], sortOrder: 0 } : s
  );
}

async function saveNodes(catId: string, nodes: SubcategoryNode[]): Promise<void> {
  await db.categories.update(catId, { subcategories: nodes });
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

      // Remove from categoryRecords
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
            const u = { ...c, categoryId: fallbackId, subcategory: "", updatedAt: now };
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
          const nodes = (r.subcategories || []) as SubcategoryNode[];
          if (nodes.some(n => n.name === subcategory)) return r;
          return { ...r, subcategories: [...nodes, { name: subcategory, chapters: [], sortOrder: nodes.length }] };
        }),
        "addSubcategory"
      );
    },
    [setCategoryRecords],
  );

  const renameSubcategory = useCallback(
    (categoryId: string, oldName: string, newName: string) => {
      // Update categoryRecords with rollback
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => {
          if (r.id !== categoryId) return r;
          const nodes = (r.subcategories || []) as SubcategoryNode[];
          if (nodes.some(n => n.name === newName)) return r;
          return { ...r, subcategories: nodes.map(n => n.name === oldName ? { ...n, name: newName } : n) };
        }),
        "renameSubcategory"
      );
      // Update cards
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
      // Update categoryRecords with rollback
      optimisticCategoryUpdate(
        setCategoryRecords,
        prev => prev.map(r => {
          if (r.id !== categoryId) return r;
          const nodes = (r.subcategories || []) as SubcategoryNode[];
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
          const u = { ...c, subcategory: "", chapter: "", updatedAt: now };
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
  // Chapter CRUD — now updates in-memory state immediately
  // ═══════════════════════════════════════════════════════

  const addChapter = useCallback((categoryId: string, subName: string, chapterName: string) => {
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = (r.subcategories || []) as SubcategoryNode[];
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName || n.chapters.includes(chapterName)) return n;
            return { ...n, chapters: [...n.chapters, chapterName] };
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
    // Update node with rollback
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = (r.subcategories || []) as SubcategoryNode[];
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            return { ...n, chapters: n.chapters.map(ch => ch === oldChapter ? newChapter : ch) };
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
        const u = { ...c, chapter: "", updatedAt: now };
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
    // Update node with rollback
    optimisticCategoryUpdate(
      setCategoryRecords,
      prev => prev.map(r => {
        if (r.id !== categoryId) return r;
        const nodes = (r.subcategories || []) as SubcategoryNode[];
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            return { ...n, chapters: n.chapters.filter(ch => ch !== chapterName) };
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
        const nodes = (r.subcategories || []) as SubcategoryNode[];
        const nodeMap = new Map(nodes.map(n => [n.name, n]));
        const reordered = ordered.map((name, i) => {
          const n = nodeMap.get(name);
          return n ? { ...n, sortOrder: i } : { name, chapters: [] as string[], sortOrder: i };
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
        const nodes = (r.subcategories || []) as SubcategoryNode[];
        return {
          ...r,
          subcategories: nodes.map(n => {
            if (n.name !== subName) return n;
            return { ...n, chapters: ordered };
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
