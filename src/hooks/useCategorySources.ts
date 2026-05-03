import { useEffect, useState } from "react";
import {
  loadSources,
  loadSourcesByCategory,
  onSourcesChanged,
  type Source,
} from "@/lib/sources-storage";

/**
 * SSOT subscription for sources scoped to a single category.
 * Re-fetches automatically when ANY source mutation fires (saveSource/deleteSource/invalidateSourcesCache).
 */
export function useCategorySources(categoryId: string | undefined): Source[] {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    if (!categoryId) { setSources([]); return; }
    let cancelled = false;
    const reload = () => {
      loadSourcesByCategory(categoryId).then(s => { if (!cancelled) setSources(s); });
    };
    reload();
    const off = onSourcesChanged(reload);
    return () => { cancelled = true; off(); };
  }, [categoryId]);

  return sources;
}

/**
 * SSOT subscription for ALL sources (used by GlobalSearch).
 * Backed by the module-level cache in sources-storage.ts.
 */
export function useAllSources(enabled: boolean = true): Source[] {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const reload = () => {
      loadSources().then(s => { if (!cancelled) setSources(s); });
    };
    reload();
    const off = onSourcesChanged(reload);
    return () => { cancelled = true; off(); };
  }, [enabled]);

  return sources;
}
