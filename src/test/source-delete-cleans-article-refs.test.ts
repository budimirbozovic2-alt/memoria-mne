// Deleting a Source must not leave dangling zettelkasten references behind:
// article.linkedSourceIds, article.linkedProvisions, and embedded
// legalProvision trace attrs (data-source-id/data-anchor inside contentDoc)
// all point at a source id that no longer exists otherwise.
import { describe, it, expect } from "vitest";
import { putSource, deleteSourceAndUnlinkCards } from "@/lib/db/queries/sources";
import { putArticle, getArticle } from "@/lib/db/queries/knowledge-base";
import { makeSource, makeArticle } from "@/test/factories";

describe("deleteSourceAndUnlinkCards — zettelkasten reference cleanup", () => {
  it("removes the deleted source from linkedSourceIds", async () => {
    const source = makeSource({ categoryId: "cat-cleanup-1" });
    await putSource(source);
    const article = makeArticle({
      subjectId: source.categoryId,
      linkedSourceIds: [source.id, "other-source"],
    });
    await putArticle(article);

    await deleteSourceAndUnlinkCards(source.id);

    const reloaded = await getArticle(article.id);
    expect(reloaded?.linkedSourceIds).toEqual(["other-source"]);
  });

  it("removes linkedProvisions entries pointing at the deleted source, keeps unrelated ones", async () => {
    const source = makeSource({ categoryId: "cat-cleanup-2" });
    await putSource(source);
    const article = makeArticle({
      subjectId: source.categoryId,
      linkedProvisions: [
        { id: "lp-1", sourceId: source.id, anchor: "anchor-1", label: "Član 5", createdAt: Date.now() },
        { id: "lp-2", sourceId: "other-source", anchor: "anchor-2", label: "Član 9", createdAt: Date.now() },
      ],
    });
    await putArticle(article);

    await deleteSourceAndUnlinkCards(source.id);

    const reloaded = await getArticle(article.id);
    expect(reloaded?.linkedProvisions).toHaveLength(1);
    expect(reloaded?.linkedProvisions?.[0].id).toBe("lp-2");
  });

  it("nulls sourceId/anchor on an embedded legalProvision block but keeps its text", async () => {
    const source = makeSource({ categoryId: "cat-cleanup-3" });
    await putSource(source);
    const article = makeArticle({
      subjectId: source.categoryId,
      html: `<div class="legal-provision" data-source-id="${source.id}" data-anchor="test-anchor"><p>Propis tekst ostaje.</p></div>`,
    });
    await putArticle(article);

    await deleteSourceAndUnlinkCards(source.id);

    const reloaded = await getArticle(article.id);
    const node = reloaded?.contentDoc.content.content?.[0];
    expect(node?.type).toBe("legalProvision");
    expect(node?.attrs?.sourceId).toBeFalsy();
    expect(node?.attrs?.anchor).toBeFalsy();
    expect(JSON.stringify(node?.content)).toContain("Propis tekst ostaje.");
  });

  it("leaves articles from a different subject untouched", async () => {
    const source = makeSource({ categoryId: "cat-cleanup-4" });
    await putSource(source);
    const otherSubjectArticle = makeArticle({
      subjectId: "cat-unrelated",
      linkedSourceIds: [source.id],
    });
    await putArticle(otherSubjectArticle);

    await deleteSourceAndUnlinkCards(source.id);

    const reloaded = await getArticle(otherSubjectArticle.id);
    expect(reloaded?.linkedSourceIds).toEqual([source.id]);
  });

  it("does not rewrite an article that never referenced the deleted source", async () => {
    const source = makeSource({ categoryId: "cat-cleanup-5" });
    await putSource(source);
    const untouched = makeArticle({ subjectId: source.categoryId, linkedSourceIds: [] });
    await putArticle(untouched);
    const before = await getArticle(untouched.id);

    await deleteSourceAndUnlinkCards(source.id);

    const after = await getArticle(untouched.id);
    expect(after?.updatedAt).toBe(before?.updatedAt);
  });
});
