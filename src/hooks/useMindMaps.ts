import { useEffect, useMemo, useState } from "react";
import {
  loadMindMaps,
  getMindMap,
  onMindMapsChanged,
} from "@/lib/mindmap-storage";
import type { MindMapDoc } from "@/lib/db";

/**
 * SSOT subscription for ALL mind maps. Backed by module-level cache + listeners
 * in mindmap-storage.ts.
 */
export function useMindMaps(enabled: boolean = true): { mindMaps: MindMapDoc[]; ready: boolean } {
  const [mindMaps, setMindMaps] = useState<MindMapDoc[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const reload = () => {
      loadMindMaps().then(all => {
        if (cancelled) return;
        setMindMaps(all);
        setReady(true);
      });
    };
    reload();
    const off = onMindMapsChanged(reload);
    return () => { cancelled = true; off(); };
  }, [enabled]);

  return { mindMaps, ready };
}

/**
 * Derived view: mind maps filtered by `categoryId`.
 * Re-renders only when underlying list changes (listener-driven).
 */
export function useMindMapsByCategory(categoryId?: string): { mindMaps: MindMapDoc[]; ready: boolean } {
  const { mindMaps, ready } = useMindMaps();
  const filtered = useMemo(
    () => (categoryId ? mindMaps.filter(d => d.categoryId === categoryId) : mindMaps),
    [mindMaps, categoryId],
  );
  return { mindMaps: filtered, ready };
}

/**
 * Single mind map by id, kept fresh via listener subscription.
 * Returns `undefined` while loading, `null` when not found.
 */
export function useMindMap(id: string | undefined): MindMapDoc | null | undefined {
  const [doc, setDoc] = useState<MindMapDoc | null | undefined>(undefined);

  useEffect(() => {
    if (!id) { setDoc(null); return; }
    let cancelled = false;
    const reload = () => {
      getMindMap(id).then(d => { if (!cancelled) setDoc(d ?? null); });
    };
    reload();
    const off = onMindMapsChanged(reload);
    return () => { cancelled = true; off(); };
  }, [id]);

  return doc;
}
