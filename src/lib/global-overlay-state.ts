/**
 * Lightweight module-level flags for "is a global overlay currently open?".
 *
 * Used by window-level keydown listeners (LocalSpeedReader, ReviewCard, …)
 * to bail out early when a top-level overlay (GlobalSearch, …) is active,
 * so stray Escape/Arrow/Space events don't mis-trigger background nav.
 *
 * Why module-level (not React context): keydown handlers are registered in
 * `useEffect` with stable deps and would otherwise capture stale boolean
 * values. A mutable ref-like flag avoids re-subscribing on every toggle.
 */

let _searchOpen = false;

export function setGlobalSearchOpen(open: boolean): void {
  _searchOpen = open;
}

export function isGlobalSearchOpen(): boolean {
  return _searchOpen;
}

/**
 * Returns true when the keydown event originated from an editable element
 * (input, textarea, [contenteditable]) and should be ignored by global
 * shortcut handlers.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target.isContentEditable) return true;
  // Defensive: walk up in case the event is dispatched on a child of CE root
  if (target.closest('[contenteditable="true"]')) return true;
  return false;
}

/**
 * Composite guard: ignore the event if any global overlay is open OR if the
 * target is an editable surface.
 */
export function shouldIgnoreGlobalKey(e: KeyboardEvent): boolean {
  return isGlobalSearchOpen() || isEditableTarget(e.target);
}
