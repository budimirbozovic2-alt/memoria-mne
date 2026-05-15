/**
 * Regression: cleanup-flush must save the OLD article when activeId changes.
 *
 * Before the fix, cleanup used a `flushRef` synced to the latest closure,
 * so navigating A→B flushed B's draft (null) instead of A's edits → silent loss.
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { db } from "@/lib/db";
import { newArticle, saveArticle } from "@/lib/zettelkasten-storage";
import { useArticleDraft } from "@/hooks/zettelkasten/useArticleDraft";

const SUBJECT = "subject-nav";

beforeEach(async () => { await db.knowledgeBaseArticles.clear(); });
afterEach(() => vi.restoreAllMocks());

describe("useArticleDraft — save-on-navigate", () => {
  it("flushes A's edits when activeId changes from A to B", async () => {
    const a = newArticle(SUBJECT, "Alpha");
    const b = newArticle(SUBJECT, "Beta");
    await saveArticle(a);
    await saveArticle(b);

    const setArticles = vi.fn();
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) =>
        useArticleDraft({ activeId: id, categoryId: SUBJECT, setArticles }),
      { initialProps: { id: a.id } },
    );

    act(() => result.current.enterEdit(a));
    act(() => result.current.updateDraft({ content: "edits in A" }));

    // Navigate to B (mimics ZettelExplorerPanel onOpen → setActiveId(b)).
    await act(async () => { rerender({ id: b.id }); });
    // Allow microtasks for the cleanup-triggered async flush to settle.
    await act(async () => { await Promise.resolve(); });

    const persistedA = (await db.knowledgeBaseArticles.get(a.id))!;
    expect(persistedA.content).toBe("edits in A");
  });
});
