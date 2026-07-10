/**
 * Faza 2 (zettelkasten-centric plan): build an ESSAY card draft from a selection
 * inside a zettelkasten article ("memoriši dio teorije"). Pure — the caller adds
 * the card, links it to the article (`linkedArticleId`), and opens the card
 * editor so the taxonomy (subcategory/chapter) is chosen manually.
 *
 * Unlike the propis→article builder, essays DO hoist the first words into the
 * question (front), with the remaining prose as the answer body — the standard
 * essay shape. Falls back to the full selection when stripping leaves no body.
 */
import { htmlToDoc, type EditorDoc } from "@/lib/editor-v4";
import { deriveTitleAndBody } from "@/lib/selection-split-engine";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

export interface ArticleEssayDraft {
  question: string;
  sections: { title: string; contentDoc: EditorDoc }[];
  /** Prefilled from the article's subject (predmet); sub/chapter chosen manually. */
  categoryId: string;
}

export function buildEssayCardFromArticleSelection(
  payload: SelectionPayload,
  subjectId: string,
): ArticleEssayDraft {
  const { title, contentDoc: body } = deriveTitleAndBody(
    payload.text,
    payload.html,
    payload.contentDoc,
  );

  const hasBody = (body.content.content?.length ?? 0) > 0;
  const contentDoc = hasBody ? body : htmlToDoc(payload.html);

  return {
    question: title,
    sections: [{ title: "", contentDoc }],
    categoryId: subjectId,
  };
}
