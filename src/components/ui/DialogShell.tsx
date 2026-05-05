import { ReactNode, useId } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  backdropClassName?: string;
  panelClassName?: string;
  align?: "center" | "top";
  closeOnBackdrop?: boolean;
  zClassName?: string;
}

/**
 * Accessible dialog shell built on Radix `@radix-ui/react-dialog`.
 *
 * Radix provides focus-trap, ESC-to-close, focus-restore, body inertness,
 * aria-modal — replacing the previous custom implementation. Positioning is
 * a flex backdrop (matches the old Modal layout exactly), so consumers' panel
 * classes (`max-w-lg mx-4 ...`) keep working without absolute coordinates.
 */
export default function DialogShell({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  backdropClassName,
  panelClassName,
  align = "center",
  closeOnBackdrop = true,
  zClassName = "z-modal-elevated",
}: DialogShellProps) {
  const autoId = useId();
  const labelId = labelledBy ?? `dialog-title-${autoId}`;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      modal
    >
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "fixed inset-0 flex p-4",
                  align === "center" ? "items-center justify-center" : "items-start justify-center pt-[15vh]",
                  zClassName,
                  backdropClassName,
                )}
              >
                <DialogPrimitive.Content
                  aria-labelledby={labelId}
                  aria-describedby={describedBy}
                  onPointerDownOutside={(e) => { if (!closeOnBackdrop) e.preventDefault(); }}
                  onInteractOutside={(e) => { if (!closeOnBackdrop) e.preventDefault(); }}
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: align === "top" ? -10 : 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: align === "top" ? -10 : 8 }}
                    transition={{ duration: 0.18 }}
                    className={cn("outline-none", panelClassName)}
                  >
                    {!labelledBy && (
                      <DialogPrimitive.Title id={labelId} className="sr-only">Dijalog</DialogPrimitive.Title>
                    )}
                    {children}
                  </motion.div>
                </DialogPrimitive.Content>
              </motion.div>
            </DialogPrimitive.Overlay>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
