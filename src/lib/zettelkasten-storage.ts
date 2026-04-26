import { db, type KnowledgeBaseArticle } from "./db";

export type { KnowledgeBaseArticle };

export async function loadArticlesBySubject(subjectId: string): Promise<KnowledgeBaseArticle[]> {
  const all = await db.knowledgeBaseArticles.where("subjectId").equals(subjectId).toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getArticle(id: string): Promise<KnowledgeBaseArticle | undefined> {
  return db.knowledgeBaseArticles.get(id);
}

/** Case-insensitive title lookup within a subject. Used to resolve [[wiki-links]]. */
export async function findArticleByTitle(
  subjectId: string,
  title: string
): Promise<KnowledgeBaseArticle | undefined> {
  const normalized = title.trim().toLowerCase();
  const candidates = await db.knowledgeBaseArticles.where("subjectId").equals(subjectId).toArray();
  return candidates.find(a => a.title.trim().toLowerCase() === normalized);
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
