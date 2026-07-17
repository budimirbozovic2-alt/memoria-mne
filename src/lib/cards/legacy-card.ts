import type { Card } from "@/lib/spaced-repetition";

/**
 * Faza 4 (zettelkasten-centric plan): a card is "legacy" — i.e. it lives outside
 * the zettelkasten — when it is an ESSAY that is not linked to any article.
 *
 * In the target model new essays originate from a zettelkasten article
 * (`linkedArticleId`). Blic/flash cards created from the source autosplit are the
 * intended path for pure propisi (§2b) and are therefore NOT legacy, even without
 * a `linkedArticleId`.
 */
export function isLegacyCard(card: Pick<Card, "type" | "linkedArticleId">): boolean {
  return card.type === "essay" && !card.linkedArticleId;
}

export function countLegacyCards(
  cards: readonly Pick<Card, "type" | "linkedArticleId">[],
): number {
  let n = 0;
  for (const c of cards) if (isLegacyCard(c)) n++;
  return n;
}
