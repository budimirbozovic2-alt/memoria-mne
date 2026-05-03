import BulkImportDialog from "./BulkImportDialog";
import type { Card } from "@/lib/spaced-repetition";

/**
 * Modular indirection for the "Masovni uvoz blic pitanja" flow.
 *
 * Currently delegates to the legacy `BulkImportDialog`. In the next iteration
 * this component will be replaced by a multi-step Wizard (analogous to the
 * Source Wizard). Consumers (e.g. `CardCreateMenu`) MUST import this trigger
 * — never `BulkImportDialog` directly — so the swap stays a 1-line change.
 */
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string;
  addFlashCard: (question: string, answer: string, category: string, subcategory?: string) => Card;
}

export default function MassFlashImportTrigger(props: Props) {
  return <BulkImportDialog {...props} />;
}
