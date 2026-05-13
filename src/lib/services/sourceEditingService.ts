/**
 * Source Editing Service — sole owner of source persistence + planner side-effects
 * for the source-reader flows.
 */
import { saveSource, type Source } from "@/lib/sources-storage";
import { incrementDailyMapped } from "@/lib/planner-storage";
import { autoFormatArticles } from "@/lib/article-autoformat";
import { rebuildSourceFromHtml } from "@/lib/source-reader/source-html-pipeline";

export async function persistSourceHtml(
  source: Source,
  rawHtml: string,
  onSourceUpdated?: (s: Source) => void,
): Promise<Source> {
  const updated = rebuildSourceFromHtml(source, rawHtml);
  await saveSource(updated);
  onSourceUpdated?.(updated);
  return updated;
}

export async function persistAutoFormat(
  source: Source,
  onSourceUpdated?: (s: Source) => void,
): Promise<{ count: number; source: Source | null }> {
  const result = autoFormatArticles(source.htmlContent);
  if (result.count === 0) return { count: 0, source: null };
  const updated = await persistSourceHtml(source, result.html, onSourceUpdated);
  return { count: result.count, source: updated };
}

/** Notify planner + global listeners that N new mappings were committed. */
export function commitMappingCreated(count: number): void {
  if (count <= 0) return;
  incrementDailyMapped(count);
  window.dispatchEvent(new CustomEvent("codex-mapping-created"));
}
