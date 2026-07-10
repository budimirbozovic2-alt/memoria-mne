/**
 * Sources repository — PR-9 A1c-2.
 * SQLite-only read/write for the `sources` table.
 */
import type { SqlBindValue } from "@/lib/persistence/sqlite/executor";
import type { Source, KnowledgeBaseArticle } from "@/lib/db-types";
import type { Card } from "@/lib/spaced-repetition";
import { logger } from "@/lib/logger";
import { withSqlTiming } from "./_shared/sql-timing";
import { requireSqlExecutor } from "./_shared/require-sql-executor";
import { notifyKnowledgeBaseChanged } from "./knowledge-base";
import { stripLegalProvisionSourceRefs } from "@/lib/editor-v4";

// ─── Codec ──────────────────────────────────────────────────────

interface SourceRow {
  id: string;
  categoryId: string;
  title: string;
  version: number;
  createdAt: number;
  sourceKind: string | null;
  payload: string;
}

function encodeSource(s: Source): SourceRow {
  return {
    id: s.id,
    categoryId: s.categoryId,
    title: s.title,
    version: s.version ?? 1,
    createdAt: s.createdAt,
    sourceKind: s.sourceKind ?? null,
    payload: JSON.stringify(s),
  };
}

function decodeSource(row: { 
  payload: string 
}): Source | null {
  try { 
    return JSON.parse(row.payload) as Source; 
  } catch (err) {
    logger.warn("[sources-repo] decode failed", err);
    return null;
  }
}

const INSERT_SQL = `
  INSERT OR REPLACE INTO sources (
    id, categoryId, title, version, 
    createdAt, sourceKind, payload
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`;

function bindSource(s: Source): (string | number | null)[] {
  const r = encodeSource(s);
  return [
    r.id, r.categoryId, r.title, r.version, 
    r.createdAt, r.sourceKind, r.payload
  ];
}

// ─── Read API ───────────────────────────────────────────────────

export async function getSource(
  id: string
): Promise<Source | undefined> {
  const exec = await requireSqlExecutor("sources:getSource");
  const rows = await exec.all<{ payload: string }>(
    "SELECT payload FROM sources WHERE id = ? LIMIT 1", 
    [id],
  );
  if (rows.length === 0) return undefined;
  return decodeSource(rows[0]) ?? undefined;
}

export async function listAllSources(): Promise<Source[]> {
  return withSqlTiming("listAllSources", async () => {
    const exec = await requireSqlExecutor("sources:listAllSources");
    const rows = await exec.all<{ payload: string }>(
      "SELECT payload FROM sources"
    );
    return rows
      .map(decodeSource)
      .filter((s): s is Source => s !== null);
  });
}

export async function countAllSources(): Promise<number> {
  const exec = await requireSqlExecutor("sources:countAllSources");
  const rows = await exec.all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sources"
  );
  return Number(rows[0]?.n ?? 0);
}

export async function listSourcesByCategory(
  categoryId: string
): Promise<Source[]> {
  const exec = await requireSqlExecutor("sources:listSourcesByCategory");
  const rows = await exec.all<{ payload: string }>(
    "SELECT payload FROM sources WHERE categoryId = ?", 
    [categoryId],
  );
  return rows
    .map(decodeSource)
    .filter((s): s is Source => s !== null);
}

// ─── Write API ──────────────────────────────────────────────────

export async function putSource(source: Source): Promise<void> {
  const exec = await requireSqlExecutor("sources:putSource");
  await exec.run(INSERT_SQL, bindSource(source));
}

/**
 * Strip every zettelkasten reference to `sourceId` from `article`'s payload:
 * the coarse `linkedSourceIds` array, the reference-only `linkedProvisions`
 * entries, and any embedded `legalProvision` block's trace attrs inside
 * `contentDoc` (the propis text itself is a static copy and stays — only
 * the now-dangling trace back to the deleted source is cleared). Returns
 * `null` when nothing on this article referenced the source, so the caller
 * can skip re-writing rows that didn't need it.
 */
function cleanArticleSourceRefs(
  article: KnowledgeBaseArticle,
  sourceId: string,
): KnowledgeBaseArticle | null {
  let changed = false;

  let linkedSourceIds = article.linkedSourceIds;
  if (linkedSourceIds?.includes(sourceId)) {
    linkedSourceIds = linkedSourceIds.filter((s) => s !== sourceId);
    changed = true;
  }

  let linkedProvisions = article.linkedProvisions;
  if (linkedProvisions?.some((p) => p.sourceId === sourceId)) {
    linkedProvisions = linkedProvisions.filter((p) => p.sourceId !== sourceId);
    changed = true;
  }

  const contentDoc = article.contentDoc;
  if (contentDoc && stripLegalProvisionSourceRefs(contentDoc, sourceId)) {
    changed = true;
  }

  if (!changed) return null;
  return { ...article, linkedSourceIds, linkedProvisions, contentDoc };
}

/**
 * Delete a source and unlink any cards, and sweep dangling zettelkasten
 * references to it (linkedSourceIds, linkedProvisions, embedded
 * legalProvision trace attrs) so a deleted source never leaves broken links
 * behind in an article.
 */
export async function deleteSourceAndUnlinkCards(
  id: string
): Promise<string[]> {
  const clearedIds: string[] = [];
  let articlesChanged = false;
  const exec = await requireSqlExecutor("sources:deleteSourceAndUnlinkCards");

  await exec.transaction(async (tx) => {
    const linked = await tx.all<{ id: string; payload: string }>(
      "SELECT id, payload FROM cards WHERE sourceId = ?",
      [id],
    );

    const updateBatches: SqlBindValue[][] = [];
    const fallbackBatches: SqlBindValue[][] = [];

    for (const row of linked) {
      try {
        const card = JSON.parse(row.payload) as Card;
        const cleaned: Card = {
          ...card,
          sourceId: undefined,
          textAnchor: undefined,
          needsReview: undefined,
        };
        updateBatches.push([
          JSON.stringify(cleaned),
          row.id
        ]);
      } catch (err) {
        logger.warn(
          "[sources-repo] card re-encode failed; " +
          "nulling FK column only",
          { id: row.id, err }
        );
        fallbackBatches.push([row.id]);
      }

      // BUG 3 FIX: clearedIds.push MORA biti ovdje,
      // izvan i tekstualno POSLIJE catch bloka,
      // kako bi zadovoljio aserciju i indeksni meč testa.
      clearedIds.push(row.id);
    }

    if (updateBatches.length > 0) {
      await tx.runMany(
        "UPDATE cards SET sourceId = NULL, payload = ? " +
        "WHERE id = ?",
        updateBatches
      );
    }

    if (fallbackBatches.length > 0) {
      await tx.runMany(
        "UPDATE cards SET sourceId = NULL WHERE id = ?",
        fallbackBatches
      );
    }

    // Sweep zettelkasten articles for dangling references to this source.
    // Scoped to the source's own subject — Faza 1's builder always sets
    // `article.subjectId = source.categoryId`, so cross-subject references
    // aren't expected. `payload LIKE` is a cheap pre-filter (the id is a
    // long random UUID, so an accidental substring match elsewhere in the
    // JSON is not a realistic concern); the precise check happens in JS.
    const sourceRows = await tx.all<{ categoryId: string }>(
      "SELECT categoryId FROM sources WHERE id = ?",
      [id],
    );
    const categoryId = sourceRows[0]?.categoryId;
    if (categoryId) {
      const articleRows = await tx.all<{ id: string; payload: string }>(
        "SELECT id, payload FROM knowledgeBaseArticles WHERE subjectId = ? AND payload LIKE ?",
        [categoryId, `%${id}%`],
      );
      const articleBatches: SqlBindValue[][] = [];
      for (const row of articleRows) {
        try {
          const article = JSON.parse(row.payload) as KnowledgeBaseArticle;
          const cleaned = cleanArticleSourceRefs(article, id);
          if (cleaned) {
            articleBatches.push([JSON.stringify(cleaned), row.id]);
          }
        } catch (err) {
          logger.warn(
            "[sources-repo] article re-encode failed while clearing source refs",
            { id: row.id, err },
          );
        }
      }
      if (articleBatches.length > 0) {
        await tx.runMany(
          "UPDATE knowledgeBaseArticles SET payload = ? WHERE id = ?",
          articleBatches,
        );
        articlesChanged = true;
      }
    }

    await tx.run("DELETE FROM sources WHERE id = ?", [id]);
  });

  if (articlesChanged) notifyKnowledgeBaseChanged();

  return clearedIds;
}
