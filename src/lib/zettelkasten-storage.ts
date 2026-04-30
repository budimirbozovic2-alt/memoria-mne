import { db, type KnowledgeBaseArticle } from "./db";

export type { KnowledgeBaseArticle };

export async function loadArticlesBySubject(subjectId: string): Promise<KnowledgeBaseArticle[]> {
  const all = await db.knowledgeBaseArticles.where("subjectId").equals(subjectId).toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getArticle(id: string): Promise<KnowledgeBaseArticle | undefined> {
  return db.knowledgeBaseArticles.get(id);
}

/** Case-insensitive title lookup within a subject. Used to resolve [[wiki-links]].
 *  Fast path: uses the [subjectId+title] compound index for an exact (trimmed) match.
 *  Slow path: falls back to a filtered, short-circuiting scan for case-insensitive match. */
export async function findArticleByTitle(
  subjectId: string,
  title: string
): Promise<KnowledgeBaseArticle | undefined> {
  const trimmed = title.trim();
  if (!trimmed) return undefined;

  // Fast path — O(log N) compound index hit for exact case match.
  const exact = await db.knowledgeBaseArticles
    .where("[subjectId+title]")
    .equals([subjectId, trimmed])
    .first();
  if (exact) return exact;

  // Slow path — short-circuits on the first case-insensitive match,
  // avoiding loading the entire subject's articles into memory.
  const normalized = trimmed.toLowerCase();
  return db.knowledgeBaseArticles
    .where("subjectId")
    .equals(subjectId)
    .filter(a => a.title.trim().toLowerCase() === normalized)
    .first();
}

export async function saveArticle(article: KnowledgeBaseArticle): Promise<void> {
  await db.knowledgeBaseArticles.put({ ...article, updatedAt: Date.now() });
}

export async function deleteArticle(id: string): Promise<void> {
  await db.knowledgeBaseArticles.delete(id);
}

export function newArticle(
  subjectId: string,
  title: string,
  rootSubcategoryId?: string
): KnowledgeBaseArticle {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    subjectId,
    title: title.trim() || "Bez naslova",
    content: "",
    linkedSourceIds: [],
    rootSubcategoryId,
    createdAt: now,
    updatedAt: now,
  };
}
