/**
 * Verifies the dirty-check matrix and the "fresh-read before save" behaviour
 * that protects against clobbering concurrent wiki-link auto-create writes.
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { db } from "@/lib/db";
import { newArticle, saveArticle } from "@/lib/zettelkasten-storage";
import { useArticleDraft } from "@/hooks/zettelkasten/useArticleDraft";

const SUBJECT = "subject-draft";

beforeEach(async () => {
  await db.knowledgeBaseArticles.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("useArticleDraft", () => {
  it("flush is a no-op when draft equals fresh persisted article", async () => {
    const article = newArticle(SUBJECT, "Alpha");
    await saveArticle(article);

    const setArticles = vi.fn();
    const { result } = renderHook(() =>
      useArticleDraft({ activeId: article.id, categoryId: SUBJECT, setArticles }),
    );

    act(() => result.current.enterEdit(article));
    const before = (await db.knowledgeBaseArticles.get(article.id))!;
    await act(async () => { await result.current.flush(); });
    const after = (await db.knowledgeBaseArticles.get(article.id))!;
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(setArticles).not.toHaveBeenCalled();
  });

  it("flush detects dirty title/content/tags/aliases and persists once", async () => {
    const article = newArticle(SUBJECT, "Beta");
    await saveArticle(article);

    const setArticles = vi.fn();
    const { result } = renderHook(() =>
      useArticleDraft({ activeId: article.id, categoryId: SUBJECT, setArticles }),
    );
    act(() => result.current.enterEdit(article));
    act(() => result.current.updateDraft({
      title: "Beta v2",
      content: "new body",
      tags: ["t1"],
      aliases: ["BETA case"],
    }));

    await act(async () => { await result.current.flush(); });
    const persisted = (await db.knowledgeBaseArticles.get(article.id))!;
    expect(persisted.title).toBe("Beta v2");
    expect(persisted.content).toBe("new body");
    expect(persisted.tags).toEqual(["t1"]);
    expect(persisted.aliases).toEqual(["beta case"]); // normalized lowercase
    expect(setArticles).toHaveBeenCalledTimes(1);
  });

  it("flush merges into FRESH persisted article (concurrent linkedSourceIds preserved)", async () => {
    const article = newArticle(SUBJECT, "Gamma");
    await saveArticle(article);

    const setArticles = vi.fn();
    const { result } = renderHook(() =>
      useArticleDraft({ activeId: article.id, categoryId: SUBJECT, setArticles }),
    );
    act(() => result.current.enterEdit(article));
    act(() => result.current.updateDraft({ content: "user-typed body" }));

    // Simulate a concurrent write that happened mid-edit (e.g. wiki-link auto-create).
    const concurrent = (await db.knowledgeBaseArticles.get(article.id))!;
    await db.knowledgeBaseArticles.put({
      ...concurrent,
      isIndex: true, // any field outside the draft surface
      updatedAt: Date.now(),
    });

    await act(async () => { await result.current.flush(); });
    const persisted = (await db.knowledgeBaseArticles.get(article.id))!;
    expect(persisted.content).toBe("user-typed body");
    expect(persisted.isIndex).toBe(true); // concurrent field NOT clobbered
  });
});
