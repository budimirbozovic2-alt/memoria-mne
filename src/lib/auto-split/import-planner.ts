/**
 * Auto-Split Import Planner — pure domain logic.
 *
 * Takes detected articles + linked cards, returns user-mutable rows; turns
 * approved rows into an `ImportPlan` (cards to create + patches to apply).
 * No React, no DB, no toasts — fully unit-testable.
 */
import { sanitizeHtml } from "@/lib/sanitize";
import { htmlToDoc } from "@/lib/editor-v4";
import type { EditorDoc } from "@/lib/editor-v4/types";
import { createCard, type Card, type SourceModule } from "@/lib/spaced-repetition";
import { createTextAnchor, type Source } from "@/domains/sources/sources-storage";
import type { DetectedArticle } from "@/lib/auto-split-engine";
import type { ChapterNode } from "@/lib/db-types";

type ArticleStatus = "new" | "exists";

export interface ArticleRow {
  key: string;
  isGroup: boolean;
  groupName: string;
  articles: DetectedArticle[];
  essayName: string;
  selected: boolean;
  status: ArticleStatus;
  existingCardId?: string;
}

export interface CardUpdatePatch {
  question: string;
  sections: { title: string; contentDoc: EditorDoc }[];
  sourceId: string;
  textAnchor: string;
  originalSourceSnippet: string;
  childCardIds?: string[];
  sourceModules?: SourceModule[];
}

export interface ImportPlan {
  toCreate: Card[];
  toUpdate: Array<{ id: string; patch: CardUpdatePatch }>;
}

/**
 * Optional glava (chapter) auto-assignment for propis auto-split — see
 * `docs` chat: user picks ONE target subcategory + which structural marker
 * (DIO/GLAVA/POGLAVLJE/ODJELJAK) counts as the chapter boundary for this
 * import. Only EXISTING chapters (by name) are matched; nothing is
 * auto-created. Applies to newly created cards only — never retroactively
 * to matched "exists" rows, so already-organized cards are not moved.
 */
export interface ChapterAssignment {
  subcategoryId: string;
  chapters: readonly ChapterNode[];
}

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Result of matching a chapter-heading string against existing chapter
 * names. `ambiguous` is true when the match could not be resolved with
 * confidence — the caller should surface this to the user instead of
 * silently guessing (or silently assigning nothing, which looks identical
 * to "no chapter mentioned at all" and hides the real problem).
 */
export interface ChapterMatchResult {
  chapter: ChapterNode | undefined;
  ambiguous: boolean;
}

const NO_MATCH: ChapterMatchResult = { chapter: undefined, ambiguous: false };
const AMBIGUOUS_MATCH: ChapterMatchResult = { chapter: undefined, ambiguous: true };

/**
 * Match a detected chapter-heading line against existing chapter names —
 * substring containment (case-insensitive) so it works whether the user
 * named the chapter with or without the "GLAVA III" prefix.
 *
 * Two or more chapter names can match the same heading in two different
 * ways: (a) nested names, e.g. "Krivična djela" and "Krivična djela protiv
 * života" — here the longer, more specific name is unambiguously the right
 * one; (b) two unrelated chapter names that both happen to appear in one
 * composite heading — here there is genuinely no correct single answer, so
 * this returns `ambiguous: true` rather than picking whichever happens to
 * come first in `chapters`.
 */
export function findMatchingChapter(
  headingText: string | null | undefined,
  chapters: readonly ChapterNode[],
): ChapterMatchResult {
  if (!headingText) return NO_MATCH;
  const normalizedHeading = normalizeForMatch(headingText);
  const matches = chapters.filter((ch) => {
    const name = normalizeForMatch(ch.name);
    return name.length > 0 && normalizedHeading.includes(name);
  });

  if (matches.length === 0) return NO_MATCH;
  if (matches.length === 1) return { chapter: matches[0], ambiguous: false };

  const byLongestName = [...matches].sort((a, b) => b.name.length - a.name.length);
  const longest = byLongestName[0];
  const longestNormalized = normalizeForMatch(longest.name);
  const allNestedInLongest = byLongestName.every(
    (ch) => longestNormalized.includes(normalizeForMatch(ch.name)),
  );
  return allNestedInLongest ? { chapter: longest, ambiguous: false } : AMBIGUOUS_MATCH;
}

/**
 * Resolve chapter assignment for a whole row, including merged/grouped rows
 * spanning several detected articles. A group is only assigned a chapter
 * when every one of its articles agrees on the same chapter — a
 * cross-chapter merge (articles from different glave combined into one
 * card) is surfaced as ambiguous instead of silently using the first
 * article's chapter for the whole card.
 */
export function findMatchingChapterForRow(
  row: Pick<ArticleRow, "articles">,
  chapters: readonly ChapterNode[],
): ChapterMatchResult {
  const perArticle = row.articles.map((art) => findMatchingChapter(art.chapterHeadingText, chapters));
  if (perArticle.some((r) => r.ambiguous)) return AMBIGUOUS_MATCH;

  const resolved = perArticle.map((r) => r.chapter).filter((c): c is ChapterNode => !!c);
  if (resolved.length === 0) return NO_MATCH;

  const distinctIds = new Set(resolved.map((c) => c.id));
  if (distinctIds.size > 1) return AMBIGUOUS_MATCH;
  return { chapter: resolved[0], ambiguous: false };
}

/**
 * Distinct chapter-heading texts among the SELECTED rows that do NOT already
 * match an existing chapter — the input to the optional "create missing glave"
 * step run just before import. Order follows first appearance so newly created
 * chapters keep document order. A heading that matches an existing chapter
 * (even ambiguously) is skipped: we never duplicate or overwrite, and an
 * ambiguous heading is left for the user to resolve manually.
 */
export function collectMissingChapterNames(
  rows: ReadonlyArray<ArticleRow>,
  chapters: readonly ChapterNode[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    if (!row.selected) continue;
    for (const art of row.articles) {
      const heading = art.chapterHeadingText?.trim();
      if (!heading || seen.has(heading)) continue;
      seen.add(heading);
      const { chapter, ambiguous } = findMatchingChapter(heading, chapters);
      if (!chapter && !ambiguous) out.push(heading);
    }
  }
  return out;
}

function applyChapterAssignment(
  card: Card,
  row: ArticleRow,
  assignment: ChapterAssignment | undefined,
): void {
  if (!assignment) return;
  card.subcategoryId = assignment.subcategoryId;
  const { chapter } = findMatchingChapterForRow(row, assignment.chapters);
  if (chapter) card.chapterId = chapter.id;
}

export function buildArticleRows(
  detected: ReadonlyArray<DetectedArticle>,
  linkedCards: ReadonlyArray<Card>,
): ArticleRow[] {
  return detected.map((art) => {
    const existing = linkedCards.find((c) => {
      const q = c.question.toLowerCase();
      return q.includes(`čl. ${art.articleNum} `) || q.includes(`član ${art.articleNum}`);
    });
    return {
      key: `art-${art.articleNum}`,
      isGroup: false,
      groupName: "",
      articles: [art],
      essayName: art.essayName,
      selected: !existing,
      status: (existing ? "exists" : "new") as ArticleStatus,
      existingCardId: existing?.id,
    };
  });
}

export function mergeRows(
  rows: ReadonlyArray<ArticleRow>,
  indices: ReadonlyArray<number>,
  groupName: string,
): ArticleRow[] {
  if (indices.length < 2) return [...rows];
  const sortedIdx = [...indices].sort((a, b) => a - b);
  const selected = sortedIdx.map((i) => rows[i]).filter(Boolean);
  if (selected.length < 2) return [...rows];
  const allArticles = selected.flatMap((r) => r.articles);
  const merged: ArticleRow = {
    key: `group-${Date.now()}-${sortedIdx[0]}`,
    isGroup: true,
    groupName,
    articles: allArticles,
    essayName: groupName,
    selected: true,
    status: "new",
  };
  const remaining = rows.filter((_, i) => !sortedIdx.includes(i));
  const insertAt = Math.min(sortedIdx[0], remaining.length);
  return [...remaining.slice(0, insertAt), merged, ...remaining.slice(insertAt)];
}

export function ungroupRow(rows: ReadonlyArray<ArticleRow>, idx: number): ArticleRow[] {
  const row = rows[idx];
  if (!row?.isGroup) return [...rows];
  const singles: ArticleRow[] = row.articles.map((art) => ({
    key: `art-${art.articleNum}`,
    isGroup: false,
    groupName: "",
    articles: [art],
    essayName: art.essayName,
    selected: true,
    status: "new",
  }));
  return [...rows.slice(0, idx), ...singles, ...rows.slice(idx + 1)];
}

export function buildImportPlan(
  rows: ReadonlyArray<ArticleRow>,
  source: Source,
  chapterAssignment?: ChapterAssignment,
): ImportPlan {
  const toImport = rows.filter((r) => r.selected);
  const toCreate: Card[] = [];
  const toUpdate: ImportPlan["toUpdate"] = [];
  const category = source.categoryId;

  for (const row of toImport) {
    if (row.isGroup) {
      const sections = row.articles.map((art) => {
        const html = sanitizeHtml(art.contentHtml);
        return {
          title: `Član ${art.articleNum}${art.title ? ` — ${art.title}` : ""}`,
          contentDoc: htmlToDoc(html),
        };
      });
      const sourceModules: SourceModule[] = row.articles.map((art, index) => ({
        id: crypto.randomUUID(),
        order: index,
        articleNum: art.articleNum,
        title: `Član ${art.articleNum}${art.title ? ` — ${art.title}` : ""}`,
        question: art.essayName,
        textAnchor: createTextAnchor(art.plainSnippet),
        originalSourceSnippet: art.plainSnippet,
      }));
      const combinedSnippet = row.articles.map((a) => a.plainSnippet).join("\n\n");
      const card = createCard(row.essayName, sections, category);
      card.updatedAt = Date.now();
      card.sourceId = source.id;
      card.textAnchor = createTextAnchor(combinedSnippet);
      card.originalSourceSnippet = combinedSnippet;
      card.childCardIds = sourceModules.map((m) => m.id);
      card.sourceModules = sourceModules;
      applyChapterAssignment(card, row, chapterAssignment);
      toCreate.push(card);
    } else {
      const art = row.articles[0];
      const sectionHtml = sanitizeHtml(art.contentHtml);
      const sections = [{ title: "Odgovor", contentDoc: htmlToDoc(sectionHtml) }];
      const anchor = createTextAnchor(art.plainSnippet);
      if (row.status === "exists" && row.existingCardId) {
        toUpdate.push({
          id: row.existingCardId,
          patch: {
            question: art.essayName,
            sections,
            sourceId: source.id,
            textAnchor: anchor,
            originalSourceSnippet: art.plainSnippet,
            childCardIds: undefined,
            sourceModules: undefined,
          },
        });
      } else {
        const card = createCard(art.essayName, sections, category);
        card.updatedAt = Date.now();
        card.sourceId = source.id;
        card.textAnchor = anchor;
        card.originalSourceSnippet = art.plainSnippet;
        applyChapterAssignment(card, row, chapterAssignment);
        toCreate.push(card);
      }
    }
  }

  return { toCreate, toUpdate };
}
