import { describe, it, expect } from "vitest";
import {
  buildArticleRows, mergeRows, ungroupRow, buildImportPlan, findMatchingChapter,
  findMatchingChapterForRow, collectMissingChapterNames,
  type ArticleRow,
} from "@/lib/auto-split/import-planner";
import type { DetectedArticle } from "@/lib/auto-split-engine";
import type { Card } from "@/lib/spaced-repetition";
import type { Source, ChapterNode } from "@/lib/db-types";
import { makeSource, makeCard } from "./factories";

const art = (num: string, title = "", chapterHeadingText?: string | null): DetectedArticle => ({
  articleNum: num,
  title,
  autoTitle: !title,
  essayName: title ? `Čl. ${num} ${title}` : `Čl. ${num}`,
  contentHtml: `<p>Sadržaj člana ${num}.</p>`,
  plainSnippet: `Član ${num}\nSadržaj člana ${num}.`,
  chapterHeadingText,
});

const fakeSource = (): Source =>
  makeSource({
    id: "src-1",
    title: "Test Zakon",
    categoryId: "cat-1",
    html: "",
    examQuestions: [],
    createdAt: 0,
    updatedAt: 0,
  });

const cardWith = (id: string, question: string, sourceId: string): Card =>
  makeCard({ id, question, sourceId, categoryId: "cat-1", sections: [] });

describe("auto-split import-planner", () => {
  describe("buildArticleRows", () => {
    it("marks articles without existing card as new+selected", () => {
      const rows = buildArticleRows([art("1"), art("2")], []);
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.status === "new" && r.selected)).toBe(true);
    });

    it("matches existing cards by 'čl. N ' prefix and unselects them", () => {
      const cards = [cardWith("c1", "Čl. 1 nešto", "src-1")];
      const rows = buildArticleRows([art("1"), art("2")], cards);
      expect(rows[0].status).toBe("exists");
      expect(rows[0].existingCardId).toBe("c1");
      expect(rows[0].selected).toBe(false);
      expect(rows[1].status).toBe("new");
    });
  });

  describe("mergeRows / ungroupRow", () => {
    it("merges two adjacent rows into a group at the first index", () => {
      const initial = buildArticleRows([art("1"), art("2"), art("3")], []);
      const merged = mergeRows(initial, [0, 1], "Spoj 1+2");
      expect(merged).toHaveLength(2);
      expect(merged[0].isGroup).toBe(true);
      expect(merged[0].articles.map((a) => a.articleNum)).toEqual(["1", "2"]);
      expect(merged[0].essayName).toBe("Spoj 1+2");
      expect(merged[1].articles[0].articleNum).toBe("3");
    });

    it("ignores merge when fewer than 2 indices supplied", () => {
      const initial = buildArticleRows([art("1"), art("2")], []);
      expect(mergeRows(initial, [0], "x")).toHaveLength(2);
    });

    it("ungroup expands a merged row back into singles", () => {
      const initial = buildArticleRows([art("1"), art("2"), art("3")], []);
      const merged = mergeRows(initial, [0, 1], "Spoj");
      const back = ungroupRow(merged, 0);
      expect(back).toHaveLength(3);
      expect(back[0].isGroup).toBe(false);
      expect(back[0].articles[0].articleNum).toBe("1");
      expect(back[1].articles[0].articleNum).toBe("2");
    });
  });

  describe("buildImportPlan", () => {
    it("creates fresh cards for selected new rows", () => {
      const rows = buildArticleRows([art("1"), art("2")], []);
      const plan = buildImportPlan(rows, fakeSource());
      expect(plan.toCreate).toHaveLength(2);
      expect(plan.toUpdate).toHaveLength(0);
      expect(plan.toCreate[0].sourceId).toBe("src-1");
      expect(plan.toCreate[0].textAnchor).toBeTruthy();
    });

    it("emits update patches for existing rows (when selected)", () => {
      const cards = [cardWith("c1", "Čl. 1 nešto", "src-1")];
      let rows = buildArticleRows([art("1")], cards);
      rows = rows.map((r) => ({ ...r, selected: true })) as ArticleRow[];
      const plan = buildImportPlan(rows, fakeSource());
      expect(plan.toCreate).toHaveLength(0);
      expect(plan.toUpdate).toHaveLength(1);
      expect(plan.toUpdate[0].id).toBe("c1");
      expect(plan.toUpdate[0].patch.sourceId).toBe("src-1");
    });

    it("merged group becomes a single card with sourceModules + childCardIds", () => {
      const initial = buildArticleRows([art("1"), art("2")], []);
      const merged = mergeRows(initial, [0, 1], "Grupa");
      const plan = buildImportPlan(merged, fakeSource());
      expect(plan.toCreate).toHaveLength(1);
      const c = plan.toCreate[0];
      expect(c.sourceModules).toHaveLength(2);
      expect(c.childCardIds).toHaveLength(2);
      expect(c.childCardIds).toEqual(c.sourceModules?.map((m) => m.id));
    });

    it("skips deselected rows", () => {
      const rows = buildArticleRows([art("1"), art("2")], []).map((r, i) => ({
        ...r, selected: i === 0,
      }));
      const plan = buildImportPlan(rows, fakeSource());
      expect(plan.toCreate).toHaveLength(1);
    });
  });

  describe("buildImportPlan — optional chapter (glava) assignment", () => {
    const chapters: ChapterNode[] = [
      { id: "ch-1", name: "Opšte odredbe", sortOrder: 0 },
      { id: "ch-2", name: "Posebne odredbe", sortOrder: 1 },
    ];

    it("assigns subcategoryId to all created cards and chapterId when the heading matches an existing chapter", () => {
      const rows = buildArticleRows(
        [art("1", "", "GLAVA I — Opšte odredbe"), art("2", "", "GLAVA II — Posebne odredbe")],
        [],
      );
      const plan = buildImportPlan(rows, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toCreate).toHaveLength(2);
      expect(plan.toCreate[0].subcategoryId).toBe("sub-1");
      expect(plan.toCreate[0].chapterId).toBe("ch-1");
      expect(plan.toCreate[1].chapterId).toBe("ch-2");
    });

    it("leaves chapterId unset when no existing chapter name matches — never auto-creates one", () => {
      const rows = buildArticleRows([art("1", "", "GLAVA IX — Nepostojeća glava")], []);
      const plan = buildImportPlan(rows, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toCreate[0].subcategoryId).toBe("sub-1");
      expect(plan.toCreate[0].chapterId).toBeUndefined();
    });

    it("leaves chapterId unset when the article has no detected heading (null/undefined)", () => {
      const rows = buildArticleRows([art("1")], []);
      const plan = buildImportPlan(rows, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toCreate[0].subcategoryId).toBe("sub-1");
      expect(plan.toCreate[0].chapterId).toBeUndefined();
    });

    it("does not touch subcategoryId/chapterId when no assignment is passed (default, unchanged behavior)", () => {
      const rows = buildArticleRows([art("1", "", "GLAVA I — Opšte odredbe")], []);
      const plan = buildImportPlan(rows, fakeSource());
      // createCard's own default (empty string), never overridden absent an assignment.
      expect(plan.toCreate[0].subcategoryId).toBe("");
      expect(plan.toCreate[0].chapterId).toBeUndefined();
    });

    it("does not retroactively assign chapter/subcategory to existing (update) rows", () => {
      const cards = [cardWith("c1", "Čl. 1 nešto", "src-1")];
      let rows = buildArticleRows([art("1", "", "GLAVA I — Opšte odredbe")], cards);
      rows = rows.map((r) => ({ ...r, selected: true })) as ArticleRow[];
      const plan = buildImportPlan(rows, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toUpdate).toHaveLength(1);
      expect(plan.toUpdate[0].patch).not.toHaveProperty("subcategoryId");
      expect(plan.toUpdate[0].patch).not.toHaveProperty("chapterId");
    });

    it("assigns the chapter when every article in a merged group agrees on it", () => {
      const initial = buildArticleRows(
        [art("1", "", "GLAVA I — Opšte odredbe"), art("2", "", "GLAVA I — Opšte odredbe")],
        [],
      );
      const merged = mergeRows(initial, [0, 1], "Grupa");
      const plan = buildImportPlan(merged, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toCreate[0].chapterId).toBe("ch-1");
    });

    it("leaves chapterId unset (does not silently use the first article) when a merged group spans different chapters", () => {
      const initial = buildArticleRows(
        [art("1", "", "GLAVA I — Opšte odredbe"), art("2", "", "GLAVA II — Posebne odredbe")],
        [],
      );
      const merged = mergeRows(initial, [0, 1], "Grupa");
      const plan = buildImportPlan(merged, fakeSource(), { subcategoryId: "sub-1", chapters });
      expect(plan.toCreate[0].subcategoryId).toBe("sub-1");
      expect(plan.toCreate[0].chapterId).toBeUndefined();
    });
  });

  describe("findMatchingChapter", () => {
    const chapters: ChapterNode[] = [{ id: "ch-1", name: "Opšte odredbe", sortOrder: 0 }];

    it("matches case-insensitively via substring containment", () => {
      expect(findMatchingChapter("glava i — opšte odredbe", chapters).chapter?.id).toBe("ch-1");
      expect(findMatchingChapter("glava i — opšte odredbe", chapters).ambiguous).toBe(false);
    });

    it("returns no chapter (not ambiguous) for null/empty heading text", () => {
      expect(findMatchingChapter(null, chapters)).toEqual({ chapter: undefined, ambiguous: false });
      expect(findMatchingChapter(undefined, chapters)).toEqual({ chapter: undefined, ambiguous: false });
    });

    it("returns no chapter (not ambiguous) when nothing matches", () => {
      expect(findMatchingChapter("GLAVA IX — Nešto sasvim drugo", chapters)).toEqual({
        chapter: undefined, ambiguous: false,
      });
    });

    it("prefers the more specific (longer) name when one chapter name is nested inside another", () => {
      const nested: ChapterNode[] = [
        { id: "ch-broad", name: "Krivična djela", sortOrder: 0 },
        { id: "ch-specific", name: "Krivična djela protiv života", sortOrder: 1 },
      ];
      const result = findMatchingChapter("GLAVA III — Krivična djela protiv života", nested);
      expect(result.chapter?.id).toBe("ch-specific");
      expect(result.ambiguous).toBe(false);
    });

    it("flags ambiguous when two unrelated chapter names both appear in one heading, instead of picking arbitrarily", () => {
      const unrelated: ChapterNode[] = [
        { id: "ch-a", name: "Krivična djela protiv imovine", sortOrder: 0 },
        { id: "ch-b", name: "Krivična djela protiv privrede", sortOrder: 1 },
      ];
      const heading = "GLAVA V — Krivična djela protiv imovine i krivična djela protiv privrede";
      const result = findMatchingChapter(heading, unrelated);
      expect(result.chapter).toBeUndefined();
      expect(result.ambiguous).toBe(true);
    });
  });

  describe("findMatchingChapterForRow", () => {
    const chapters: ChapterNode[] = [
      { id: "ch-1", name: "Opšte odredbe", sortOrder: 0 },
      { id: "ch-2", name: "Posebne odredbe", sortOrder: 1 },
    ];

    it("resolves a single-article row the same as findMatchingChapter", () => {
      const row = { articles: [art("1", "", "GLAVA I — Opšte odredbe")] };
      expect(findMatchingChapterForRow(row, chapters)).toEqual({
        chapter: chapters[0], ambiguous: false,
      });
    });

    it("resolves a merged row when all articles agree", () => {
      const row = {
        articles: [
          art("1", "", "GLAVA I — Opšte odredbe"),
          art("2", "", "GLAVA I — Opšte odredbe"),
        ],
      };
      expect(findMatchingChapterForRow(row, chapters).chapter?.id).toBe("ch-1");
    });

    it("is ambiguous when a merged row's articles resolve to different chapters", () => {
      const row = {
        articles: [
          art("1", "", "GLAVA I — Opšte odredbe"),
          art("2", "", "GLAVA II — Posebne odredbe"),
        ],
      };
      const result = findMatchingChapterForRow(row, chapters);
      expect(result.chapter).toBeUndefined();
      expect(result.ambiguous).toBe(true);
    });

    it("ignores articles with no heading when at least one article resolves", () => {
      const row = {
        articles: [
          art("1", "", "GLAVA I — Opšte odredbe"),
          art("2", "", null),
        ],
      };
      expect(findMatchingChapterForRow(row, chapters).chapter?.id).toBe("ch-1");
    });

    it("returns no chapter when no article in the row matches anything", () => {
      const row = { articles: [art("1", "", "GLAVA IX — Nepostojeća")] };
      expect(findMatchingChapterForRow(row, chapters)).toEqual({
        chapter: undefined, ambiguous: false,
      });
    });
  });

  describe("collectMissingChapterNames", () => {
    const existing: ChapterNode[] = [
      { id: "ch-1", name: "GLAVA 1 - OPŠTE ODREDBE", sortOrder: 0 },
    ];
    const rowFor = (...articles: DetectedArticle[]): ArticleRow => ({
      key: "k", isGroup: false, groupName: "", articles,
      essayName: "e", selected: true, status: "new",
    });

    it("returns headings that have no existing chapter, in first-appearance order", () => {
      const rows = [
        rowFor(art("1", "", "GLAVA 1 - OPŠTE ODREDBE")),
        rowFor(art("2", "", "GLAVA 2 - NADLEŽNOST SUDA")),
        rowFor(art("3", "", "GLAVA 3 - IZUZEĆE")),
      ];
      expect(collectMissingChapterNames(rows, existing)).toEqual([
        "GLAVA 2 - NADLEŽNOST SUDA",
        "GLAVA 3 - IZUZEĆE",
      ]);
    });

    it("de-duplicates repeated headings and skips null headings", () => {
      const rows = [
        rowFor(art("4", "", "GLAVA 2 - NADLEŽNOST SUDA")),
        rowFor(art("5", "", "GLAVA 2 - NADLEŽNOST SUDA")),
        rowFor(art("6", "", null)),
      ];
      expect(collectMissingChapterNames(rows, existing)).toEqual([
        "GLAVA 2 - NADLEŽNOST SUDA",
      ]);
    });

    it("ignores unselected rows", () => {
      const rows = [
        { ...rowFor(art("7", "", "GLAVA 9 - NEŠTO")), selected: false },
      ];
      expect(collectMissingChapterNames(rows, existing)).toEqual([]);
    });

    it("does not propose a heading already covered by an existing chapter name (substring)", () => {
      const rows = [rowFor(art("1", "", "GLAVA 1 - OPŠTE ODREDBE"))];
      expect(collectMissingChapterNames(rows, [
        { id: "ch-1", name: "OPŠTE ODREDBE", sortOrder: 0 },
      ])).toEqual([]);
    });
  });
});
