/**
 * Persists the Zettelkasten Explorer panel's collapsed state to localStorage
 * across sessions. Extracted from `ZettelkastenView` to keep the view focused
 * on composition rather than UI persistence plumbing.
 */
import { useCallback, useState } from "react";

const EXPLORER_COLLAPSED_KEY = "zettel.explorer.collapsed";

export function useExplorerCollapsed(): {
  collapsed: boolean;
  toggle: () => void;
} {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(EXPLORER_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(EXPLORER_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { collapsed, toggle };
}
