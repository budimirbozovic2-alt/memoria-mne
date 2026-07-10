/**
 * Faza 1 (zettelkasten-centric plan): build a NEW zettelkasten article from a
 * source selection, wrapping the excerpt in a `legalProvision` ("propis") block
 * with copy-with-trace attributes (`sourceId` + `anchor`).
 *
 * Pure — no persistence. The caller (`useSourceMapping.handleExtractToArticle`)
 * saves via `saveArticle` and shows the toast. Blic cards still come from the
 * source autosplit path (§2b of the plan); this brings the propis into the
 * zettelkasten as context alongside theory.
 */
import type { KnowledgeBaseArticle } from "@/lib/db-types";
import { htmlToDoc, type EditorDoc, type JSONContent } from "@/lib/editor-v4";
import { newArticle } from "@/domains/zettelkasten/zettelkasten-storage";
import { createTextAnchor, type Source } from "@/domains/sources/sources-storage";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

/** Article title from the excerpt's first words (statutory text stays in the block). */
function deriveArticleTitle(text: string): string {
  const plain = text.replace(/\s+/g, " ").trim();
  const words = plain.split(" ").slice(0, 8).join(" ");
  return (words || "Propis").slice(0, 80);
}

export function buildPropisArticleFromSelection(
  payload: SelectionPayload,
  source: Pick<Source, "id" | "categoryId">,
): KnowledgeBaseArticle {
  const title = deriveArticleTitle(payload.text);

  // Keep the FULL statutory text inside the propis block (unlike essays, we do
  // NOT hoist the first words into the title). Re-parse from HTML so the block
  // content is always valid block-level nodes. `block+` needs ≥1 child.
  const bodyNodes = htmlToDoc(payload.html).content.content ?? [];
  const provisionContent: JSONContent[] =
    bodyNodes.length > 0
      ? bodyNodes
      : [
          {
            type: "paragraph",
            content: payload.text ? [{ type: "text", text: payload.text }] : [],
          },
        ];

  const article = newArticle(source.categoryId, title);
  const contentDoc: EditorDoc = {
    version: 4,
    content: {
      type: "doc",
      content: [
        {
          type: "legalProvision",
          attrs: { sourceId: source.id, anchor: createTextAnchor(payload.text) },
          content: provisionContent,
        },
      ],
    },
  };

  return { ...article, contentDoc, linkedSourceIds: [source.id] };
}
