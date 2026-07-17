/**
 * Build a reference-only link from a source selection to an EXISTING
 * zettelkasten article — no copy of the excerpt text is stored, only a
 * `sourceId` + `anchor` (same opaque `createTextAnchor` pattern as card↔source
 * links) plus a short display label derived from the selection.
 *
 * Complements `build-propis-article.ts` (which extracts a selection into a
 * NEW article as an embedded `legalProvision` block). This builder targets
 * an article the user already picked, and never touches `contentDoc`.
 */
import type { LinkedProvision } from "@/lib/db-types";
import { createTextAnchor } from "@/domains/sources/sources-storage";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

function deriveLabel(text: string): string {
  const plain = text.replace(/\s+/g, " ").trim();
  const words = plain.split(" ").slice(0, 8).join(" ");
  return (words || "Propis").slice(0, 80);
}

export function buildLinkedProvision(
  payload: Pick<SelectionPayload, "text">,
  sourceId: string,
): LinkedProvision {
  return {
    id: crypto.randomUUID(),
    sourceId,
    anchor: createTextAnchor(payload.text),
    label: deriveLabel(payload.text),
    createdAt: Date.now(),
  };
}
