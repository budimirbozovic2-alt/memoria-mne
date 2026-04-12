import { useState, useCallback, useRef } from "react";

interface UseCardListDndParams {
  filtered: { id: string }[];
  onReorder?: (orderedIds: string[]) => void;
}

export function useCardListDnd({ filtered, onReorder }: UseCardListDndParams) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...filtered];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onReorder?.(reordered.map(c => c.id));
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, filtered, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    if (dragIndex === null) return;
    e.preventDefault();
    const EDGE_ZONE = 80;
    const SCROLL_SPEED = 12;
    const y = e.clientY;
    const vh = window.innerHeight;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    if (y < EDGE_ZONE) {
      const intensity = 1 - y / EDGE_ZONE;
      scrollRafRef.current = requestAnimationFrame(() => { window.scrollBy(0, -SCROLL_SPEED * intensity); });
    } else if (y > vh - EDGE_ZONE) {
      const intensity = 1 - (vh - y) / EDGE_ZONE;
      scrollRafRef.current = requestAnimationFrame(() => { window.scrollBy(0, SCROLL_SPEED * intensity); });
    }
  }, [dragIndex]);

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleContainerDragOver,
  };
}
