import { useEffect, useRef } from "react";

/**
 * Returns a function that yields a fresh `AbortController` per call, and
 * aborts the most recently issued one on unmount. Use for fetch/audio/dexie
 * scenarios where actual cancellation (not just state-suppress) matters.
 *
 *   const newAbort = useAbortOnUnmount();
 *   useEffect(() => {
 *     const ctrl = newAbort();
 *     fetch(url, { signal: ctrl.signal })...
 *     return () => ctrl.abort();
 *   }, [url]);
 */
export function useAbortOnUnmount(): () => AbortController {
  const ref = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      ref.current?.abort();
      ref.current = null;
    };
  }, []);
  return () => {
    ref.current?.abort();
    const ctrl = new AbortController();
    ref.current = ctrl;
    return ctrl;
  };
}
