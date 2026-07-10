import { describe, it, expect } from "vitest";
import { htmlToDoc } from "@/lib/editor-v4";
import { buildEssayCardFromArticleSelection } from "@/lib/source-reader/build-essay-from-article";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

function makePayload(text: string, html: string): SelectionPayload {
  return { text, html, contentDoc: htmlToDoc(html) };
}

describe("buildEssayCardFromArticleSelection (Faza 2)", () => {
  it("prefills categoryId from the article subject", () => {
    const payload = makePayload(
      "Načelo savjesnosti i poštenja obavezuje strane u obligacionim odnosima.",
      "<p>Načelo savjesnosti i poštenja obavezuje strane u obligacionim odnosima.</p>",
    );
    const draft = buildEssayCardFromArticleSelection(payload, "cat-9");
    expect(draft.categoryId).toBe("cat-9");
  });

  it("hoists the first words into the question and keeps the body as content", () => {
    const payload = makePayload(
      "Načelo savjesnosti i poštenja obavezuje strane u obligacionim odnosima na uzajamno povjerenje.",
      "<p>Načelo savjesnosti i poštenja obavezuje strane u obligacionim odnosima na uzajamno povjerenje.</p>",
    );
    const draft = buildEssayCardFromArticleSelection(payload, "cat-9");
    expect(draft.question.length).toBeGreaterThan(0);
    expect(draft.sections).toHaveLength(1);
    // Body retains prose beyond the hoisted title words.
    expect(JSON.stringify(draft.sections[0].contentDoc)).toContain("povjerenje");
  });

  it("falls back to the full selection when the body would be empty", () => {
    const payload = makePayload("Kauza", "<p>Kauza</p>");
    const draft = buildEssayCardFromArticleSelection(payload, "cat-9");
    expect(draft.question.length).toBeGreaterThan(0);
    expect((draft.sections[0].contentDoc.content.content?.length ?? 0)).toBeGreaterThan(0);
  });
});
