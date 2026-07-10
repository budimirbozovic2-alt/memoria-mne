import type { JSONContent } from "@tiptap/core";
import type { EditorDoc } from "./types";

/**
 * Null out `sourceId`/`anchor` on every `legalProvision` node in `doc` whose
 * `sourceId` matches `sourceId` — used when the referenced Source is deleted.
 * The propis text itself is a static "copy with trace" and stays untouched;
 * only the now-invalid trace back to the deleted source is cleared, so the
 * article no longer offers a "Provjeri uz izvor" action that leads nowhere.
 *
 * Mutates `doc` in place (call sites already hold a fresh decode of the row
 * they're about to re-encode) and returns whether anything changed, so the
 * caller can skip re-writing rows that didn't reference this source.
 */
export function stripLegalProvisionSourceRefs(doc: EditorDoc, sourceId: string): boolean {
  return stripNode(doc.content, sourceId);
}

function stripNode(node: JSONContent, sourceId: string): boolean {
  let changed = false;
  if (node.type === "legalProvision" && node.attrs?.sourceId === sourceId) {
    node.attrs.sourceId = null;
    node.attrs.anchor = null;
    changed = true;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (stripNode(child, sourceId)) changed = true;
    }
  }
  return changed;
}
