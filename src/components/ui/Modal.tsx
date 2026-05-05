import { useEffect, useRef, useId, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of element labelling the dialog (for aria-labelledby). If omitted, an auto id is generated. */
  labelledBy?: string;
  describedBy?: string;
  /** Backdrop classes (background + alignment). */
  backdropClassName?: string;
  /** Panel classes (card visuals). */
  panelClassName?: string;
  /** Optional ref to focus on open instead of the panel itself. */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Vertical alignment of the panel inside the viewport. */
  align?: "center" | "top";
  /** Close when clicking the backdrop. Default true. */
  closeOnBackdrop?: boolean;
  /** z-index utility class. Defaults to z-modal-elevated. */
  zClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable accessible modal shell:
 * - Portals to document.body
 * - role="dialog" + aria-modal="true"
 * - Escape closes
 * - Tab/Shift+Tab focus trap
 * - Restores focus to previously focused element on close
 * - No imposed visuals: pass `backdropClassName` / `panelClassName` to keep look intact.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  backdropClassName,
  panelClassName,
  initialFocusRef,
  align = "center",
  closeOnBackdrop = true,
  zClassName = "z-modal-elevated",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const autoId = useId();
  const labelId = labelledBy ?? `modal-title-${autoId}`;

  // Capture focus on open, restore on close/unmount
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panelRef.current)?.focus();
      }
    }, 30);
    return () => {
      window.clearTimeout(t);
      const prev = previouslyFocused.current;
      if (prev && document.contains(prev)) {
        try { prev.focus(); } catch { /* ignore */ }
      }
    };
  }, [open, initialFocusRef]);

  // Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter(n => !n.hasAttribute("disabled") && n.offsetParent !== null);
        if (nodes.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 flex p-4",
            align === "center" ? "items-center justify-center" : "items-start justify-center pt-[15vh]",
            zClassName,
            backdropClassName
          )}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: align === "top" ? -10 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: align === "top" ? -10 : 8 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className={cn("outline-none", panelClassName)}
          >
            {/* Hidden fallback label so aria-labelledby always resolves */}
            {!labelledBy && (
              <span id={labelId} className="sr-only">Dijalog</span>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
