import { describe, it, expect } from "vitest";
import { isLegacyCard, countLegacyCards } from "@/lib/cards/legacy-card";

describe("isLegacyCard (Faza 4)", () => {
  it("flags an essay without a linked article as legacy", () => {
    expect(isLegacyCard({ type: "essay", linkedArticleId: undefined })).toBe(true);
  });

  it("does not flag an essay linked to an article", () => {
    expect(isLegacyCard({ type: "essay", linkedArticleId: "art-1" })).toBe(false);
  });

  it("does not flag blic/flash cards (valid source path per §2b)", () => {
    expect(isLegacyCard({ type: "flash", linkedArticleId: undefined })).toBe(false);
    expect(isLegacyCard({ type: "flash", linkedArticleId: "art-1" })).toBe(false);
  });

  it("counts only legacy essays in a mixed set", () => {
    const cards = [
      { type: "essay" as const, linkedArticleId: undefined },
      { type: "essay" as const, linkedArticleId: "art-1" },
      { type: "flash" as const, linkedArticleId: undefined },
      { type: "essay" as const, linkedArticleId: undefined },
    ];
    expect(countLegacyCards(cards)).toBe(2);
  });
});
