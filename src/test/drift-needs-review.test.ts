import { describe, it, expect } from "vitest";
import { cardRepository } from "@/lib/repositories";
import { getTestSqliteTable, seedTestSqliteTable } from "@/test/sqlite-harness";

function seedCard(id: string, linkedArticleId: string | null): void {
  seedTestSqliteTable("cards", [
    {
      id,
      categoryId: "cat-1",
      subcategoryId: null,
      chapterId: null,
      type: "essay",
      createdAt: 1,
      updatedAt: 1,
      sourceId: null,
      linkedArticleId,
      payload: JSON.stringify({ id, categoryId: "cat-1", type: "essay" }),
    },
  ]);
}

function payloadById(id: string): Record<string, unknown> {
  const row = getTestSqliteTable("cards").find((r) => r.id === id);
  return row ? (JSON.parse(String(row.payload)) as Record<string, unknown>) : {};
}

describe("cardRepository.markNeedsReviewByArticle (Faza 3 drift)", () => {
  it("flags only cards linked to the given article", async () => {
    seedCard("c1", "art-1");
    seedCard("c2", "art-1");
    seedCard("c3", "art-2");

    const touched = await cardRepository.markNeedsReviewByArticle("art-1");
    expect(touched).toBe(2);

    expect(payloadById("c1").needsReview).toBe(true);
    expect(payloadById("c2").needsReview).toBe(true);
    expect(payloadById("c3").needsReview).toBeUndefined();
  });

  it("is a no-op (returns 0) when no cards are linked to the article", async () => {
    seedCard("c1", "art-1");
    const touched = await cardRepository.markNeedsReviewByArticle("art-unknown");
    expect(touched).toBe(0);
    expect(payloadById("c1").needsReview).toBeUndefined();
  });
});
