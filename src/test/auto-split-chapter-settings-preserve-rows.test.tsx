/**
 * Regression: changing the chapter-assign settings (toggle / heading type)
 * while the AutoSplit preview is open must NOT rebuild `rows` from scratch —
 * only the per-article `chapterHeadingText` metadata should refresh. Before
 * this fix, `detected` was recomputed on every setting change, and the
 * effect watching `[detected, linkedCards]` re-ran `buildArticleRows`,
 * silently discarding any manual merge/selection the user made.
 */
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { makeSource } from "./factories";

const mockCards: { current: Array<{ id: string; sourceId?: string }> } = { current: [] };
vi.mock("@/hooks/cards/useCardState", () => ({
  useCardData: () => ({ cards: mockCards.current }),
}));
vi.mock("@/hooks/cards/useActions", () => ({
  useCardOnlyActions: () => ({ bulkAddCards: vi.fn(), updateCard: vi.fn() }),
}));
vi.mock("@/hooks/cards/useCategoryState", () => ({
  useCategoryData: () => ({
    categoryRecords: [
      {
        id: "cat-1",
        name: "Test predmet",
        subcategories: [
          {
            id: "sub-1",
            name: "Test potkategorija",
            chapters: [
              { id: "ch-1", name: "Opšte odredbe" },
              { id: "ch-2", name: "Posebne odredbe" },
            ],
          },
        ],
      },
    ],
  }),
}));

// Real detectArticles — the whole point of this test is that a genuine
// heading-type change produces different chapterHeadingText per call.
vi.mock("@/lib/services/autoSplitImportService", () => ({
  executeImportPlan: vi.fn(),
}));

import { useAutoSplitImport } from "@/hooks/useAutoSplitImport";

const html = `
<p>GLAVA I — Opšte odredbe</p>
<p>Član 1</p>
<p>Prva odredba.</p>
<p>GLAVA II — Posebne odredbe</p>
<p>Član 2</p>
<p>Druga odredba.</p>
`;

const fakeSource = makeSource({
  id: "src-1",
  categoryId: "cat-1",
  title: "Test",
  html,
  createdAt: 0,
  updatedAt: 0,
});

describe("useAutoSplitImport — chapter-assign settings don't wipe manual edits", () => {
  it("preserves a manual deselection when the heading type changes mid-preview", async () => {
    const { makeQueryWrapper } = await import("./helpers/queryWrapper");
    const wrapper = makeQueryWrapper();
    const { result } = renderHook(
      ({ open }: { open: boolean }) => useAutoSplitImport(open, fakeSource),
      { initialProps: { open: true }, wrapper },
    );

    expect(result.current.rows).toHaveLength(2);

    // Manual edit: deselect the second row.
    act(() => { result.current.toggleRow(1); });
    expect(result.current.rows[1].selected).toBe(false);

    // Turn on chapter-assign and pick a heading type — this must only
    // refresh chapterHeadingText, not rebuild rows.
    act(() => { result.current.setChapterAssignEnabled(true); });
    act(() => { result.current.setChapterHeadingType("GLAVA"); });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[1].selected).toBe(false);
    expect(result.current.rows[0].articles[0].chapterHeadingText).toBe("GLAVA I — Opšte odredbe");
    expect(result.current.rows[1].articles[0].chapterHeadingText).toBe("GLAVA II — Posebne odredbe");
  });

  it("preserves a merged group when the heading type changes mid-preview", async () => {
    const { makeQueryWrapper } = await import("./helpers/queryWrapper");
    const wrapper = makeQueryWrapper();
    const { result } = renderHook(
      ({ open }: { open: boolean }) => useAutoSplitImport(open, fakeSource),
      { initialProps: { open: true }, wrapper },
    );

    // Rows start already selected (buildArticleRows defaults new rows to
    // selected), so both are eligible for "Spoji" without toggling first.
    expect(result.current.canMerge).toBe(true);
    act(() => { result.current.openMergeDialog(); });
    act(() => { result.current.setMergeName("Grupa"); });
    act(() => { result.current.confirmMerge(); });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].isGroup).toBe(true);
    expect(result.current.rows[0].articles).toHaveLength(2);

    act(() => { result.current.setChapterAssignEnabled(true); });
    act(() => { result.current.setChapterHeadingType("GLAVA"); });

    // Still one merged group — heading-type change did not rebuild rows.
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].isGroup).toBe(true);
    expect(result.current.rows[0].articles).toHaveLength(2);
    expect(result.current.rows[0].articles[0].chapterHeadingText).toBe("GLAVA I — Opšte odredbe");
    expect(result.current.rows[0].articles[1].chapterHeadingText).toBe("GLAVA II — Posebne odredbe");
  });
});
