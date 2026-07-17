import { describe, it, expect } from "vitest";
import { htmlToDoc } from "@/lib/editor-v4";
import { buildPropisArticleFromSelection } from "@/lib/source-reader/build-propis-article";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

function makePayload(text: string, html: string): SelectionPayload {
  return { text, html, contentDoc: htmlToDoc(html) };
}

const source = { id: "src-1", categoryId: "cat-1" };

describe("buildPropisArticleFromSelection (Faza 1)", () => {
  it("files the article under the source's subject and links the source", () => {
    const payload = makePayload(
      "Član 5. Svrha ovog zakona je zaštita prava.",
      "<p>Član 5. Svrha ovog zakona je zaštita prava.</p>",
    );
    const article = buildPropisArticleFromSelection(payload, source);
    expect(article.subjectId).toBe("cat-1");
    expect(article.linkedSourceIds).toEqual(["src-1"]);
    expect(article.title.length).toBeGreaterThan(0);
  });

  it("wraps the excerpt in a legalProvision block with copy-with-trace attrs", () => {
    const payload = makePayload(
      "Član 5. Svrha ovog zakona je zaštita prava.",
      "<p>Član 5. Svrha ovog zakona je zaštita prava.</p>",
    );
    const article = buildPropisArticleFromSelection(payload, source);
    const first = article.contentDoc.content.content?.[0];
    expect(first?.type).toBe("legalProvision");
    expect(first?.attrs?.sourceId).toBe("src-1");
    expect(first?.attrs?.anchor).toBeTruthy();
    expect(JSON.stringify(article.contentDoc)).toContain("Svrha ovog zakona");
  });

  it("keeps the block+ invariant with a paragraph fallback for a tiny excerpt", () => {
    const payload = makePayload("Kratko", "<p>Kratko</p>");
    const article = buildPropisArticleFromSelection(payload, source);
    const first = article.contentDoc.content.content?.[0];
    expect(first?.type).toBe("legalProvision");
    expect(first?.content?.length ?? 0).toBeGreaterThan(0);
  });
});
