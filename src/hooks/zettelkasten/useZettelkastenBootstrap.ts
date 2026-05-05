/**
 * Bootstrap loader for the Zettelkasten subject view.
 *
 * Responsibilities:
 *  - Load all articles for the subject from IDB.
 *  - Ensure an Index article exists (auto-create or promote during migration).
 *  - Merge the (possibly newly created) Index back into the article list.
 *  - Warm the per-subject `backlinkIndex` ONCE — subsequent re-mounts skip the
 *    full O(N × avgLinks) rebuild because incremental upserts via the eventBus
 *    subscription keep the index hot.
 *
 * The dependency array intentionally avoids the full `categoryRec` object so
 * orthogonal mutations (e.g. a subcategory rename) don't trigger reload
 * storms. Only `categoryId`, the subject's name, and a stable join of its
 * subcategory names participate.
 */
import { useEffect, useMemo, useState } from "react";
import {
  loadArticlesBySubject,
  ensureIndexArticle,
  type KnowledgeBaseArticle,
} from "@/lib/zettelkasten-storage";
import { backlinkIndex } from "@/lib/backlink-index";

interface BootstrapInput {
  categoryId: string | undefined;
  subjectName: string | null;
  subcategoryNames: string[];
}

interface BootstrapResult {
  articles: KnowledgeBaseArticle[];
  setArticles: React.Dispatch<React.SetStateAction<KnowledgeBaseArticle[]>>;
  loading: boolean;
  indexArticleId: string | null;
}

export function useZettelkastenBootstrap(
  { categoryId, subjectName, subcategoryNames }: BootstrapInput,
): BootstrapResult & { initialActiveId: string | null } {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialActiveId, setInitialActiveId] = useState<string | null>(null);

  // Stable seed key so subcategory list identity changes don't reboot the view
  // unless their *content* differs.
  const seedNamesKey = useMemo(() => subcategoryNames.join("\u0001"), [subcategoryNames]);

  useEffect(() => {
    if (!categoryId || !subjectName) return;
    let cancelled = false;
    setLoading(true);
    loadArticlesBySubject(categoryId).then(async (list) => {
      if (cancelled) return;
      const idx = await ensureIndexArticle(categoryId, subjectName, subcategoryNames);
      if (cancelled) return;

      const merged = list.some(a => a.id === idx.id)
        ? list.map(a => a.id === idx.id ? idx : a)
        : [idx, ...list];

      setArticles(merged);
      // Idempotent: only the FIRST mount per subject pays the rebuild cost.
      if (!backlinkIndex.hasSubject(categoryId)) {
        backlinkIndex.rebuildFromAll(categoryId, merged);
      }
      setInitialActiveId(prev => prev ?? idx.id);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, subjectName, seedNamesKey]);

  const indexArticleId = useMemo(
    () => articles.find(a => a.isIndex)?.id ?? null,
    [articles],
  );

  return { articles, setArticles, loading, indexArticleId, initialActiveId };
}
