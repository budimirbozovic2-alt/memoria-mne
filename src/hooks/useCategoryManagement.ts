import { useCallback } from "react";
import { Card } from "@/lib/spaced-repetition";
import { CardMap, bumpMapVersion, schedulePersist } from "@/lib/persist-queue";

interface UseCategoryManagementParams {
  setCategories: (updater: (prev: string[]) => string[]) => void;
  setSubcategories: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  setCardMapState: React.Dispatch<React.SetStateAction<CardMap>>;
}

export function useCategoryManagement({
  setCategories,
  setSubcategories,
  setCardMapState,
}: UseCategoryManagementParams) {
  const addCategory = useCallback(
    (name: string) => {
      setCategories((prev) => prev.includes(name) ? prev : [...prev, name]);
    },
    [setCategories],
  );

  const renameCategory = useCallback(
    (oldName: string, newName: string) => {
      // Atomically check for duplicate AND rename in one updater to avoid stale-closure race (C1 fix)
      let duplicateDetected = false;
      setCategories(prev => {
        if (prev.includes(newName)) { duplicateDetected = true; return prev; }
        return prev.map(c => c === oldName ? newName : c);
      });
      // We must defer the rest to a microtask so React has flushed the updater synchronously
      // and `duplicateDetected` is set. In React 18 batching, functional updaters run synchronously
      // within the same event handler, so this flag IS reliable here.
      if (duplicateDetected) return;
      const changed: Card[] = [];
      setCardMapState((prev) => {
        const next = { ...prev };
        for (const [id, c] of Object.entries(next)) {
          if (c.category === oldName) {
            const u = { ...c, category: newName, updatedAt: Date.now() };
            next[id] = u;
            changed.push(u);
          }
        }
        return next;
      });
      if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
      bumpMapVersion();
      setSubcategories((prev) => {
        const next = { ...prev };
        if (next[oldName]) { next[newName] = next[oldName]; delete next[oldName]; }
        return next;
      });
    },
    [setCategories, setCardMapState, setSubcategories],
  );

  const deleteCategory = useCallback(
    (name: string) => {
      setCategories((prev) => prev.filter((c) => c !== name));
      const changed: Card[] = [];
      setCardMapState((prev) => {
        const next = { ...prev };
        for (const [id, c] of Object.entries(next)) {
          if (c.category === name) {
            const u = { ...c, category: "Opšte", subcategory: "", updatedAt: Date.now() };
            next[id] = u;
            changed.push(u);
          }
        }
        return next;
      });
      if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
      bumpMapVersion();
      setSubcategories((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    [setCategories, setCardMapState, setSubcategories],
  );

  const addSubcategory = useCallback(
    (category: string, subcategory: string) => {
      setSubcategories((prev) => {
        const list = prev[category] || [];
        if (list.includes(subcategory)) return prev;
        return { ...prev, [category]: [...list, subcategory] };
      });
    },
    [setSubcategories],
  );

  const renameSubcategory = useCallback(
    (category: string, oldName: string, newName: string) => {
      setSubcategories((prev) => {
        const list = prev[category] || [];
        if (list.includes(newName)) return prev;
        return { ...prev, [category]: list.map((s) => (s === oldName ? newName : s)) };
      });
      const changed: Card[] = [];
      setCardMapState((prev) => {
        const next = { ...prev };
        for (const [id, c] of Object.entries(next)) {
          if (c.category === category && c.subcategory === oldName) {
            const u = { ...c, subcategory: newName, updatedAt: Date.now() };
            next[id] = u;
            changed.push(u);
          }
        }
        return next;
      });
      if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
      bumpMapVersion();
    },
    [setSubcategories, setCardMapState],
  );

  const deleteSubcategory = useCallback(
    (category: string, subcategory: string) => {
      setSubcategories((prev) => ({ ...prev, [category]: (prev[category] || []).filter((s) => s !== subcategory) }));
      const changed: Card[] = [];
      setCardMapState((prev) => {
        const next = { ...prev };
        for (const [id, c] of Object.entries(next)) {
          if (c.category === category && c.subcategory === subcategory) {
            const u = { ...c, subcategory: "", updatedAt: Date.now() };
            next[id] = u;
            changed.push(u);
          }
        }
        return next;
      });
      if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
      bumpMapVersion();
    },
    [setSubcategories, setCardMapState],
  );

  const bulkUpdateSubcategory = useCallback((ids: string[], subcategory: string) => {
    const changed: Card[] = [];
    setCardMapState((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (next[id]) {
          const u = { ...next[id], subcategory, updatedAt: Date.now() };
          next[id] = u;
          changed.push(u);
        }
      }
      return next;
    });
    if (changed.length > 0) schedulePersist({ type: "bulk", cards: changed });
    bumpMapVersion();
  }, [setCardMapState]);

  return {
    addCategory,
    renameCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    bulkUpdateSubcategory,
  };
}
