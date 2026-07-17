/**
 * Auto-Split Engine for Legal Documents
 * Detects articles (Član) with their titles and content,
 * enabling batch essay generation from legal source texts.
 *
 * Supports two scanning modes:
 *   A) Standard: Title + Član + Content
 *   B) Articles-only: When no title exists, auto-generates from first words
 */

export interface DetectedArticle {
  /** e.g. "59" or "10a" */
  articleNum: string;
  /** Title line found above the Član line (or auto-generated) */
  title: string;
  /** Whether the title was auto-generated from content */
  autoTitle: boolean;
  /** Full essay name: "Čl. 59 Pojam, sadržina..." */
  essayName: string;
  /** HTML content of the article body */
  contentHtml: string;
  /** Plain text snippet for backlink */
  plainSnippet: string;
  /**
   * Full text of the nearest preceding structural heading of the caller-chosen
   * type (see `ChapterHeadingType`), e.g. "GLAVA III — Krivična djela protiv
   * života". Only populated when `detectArticles` is called with a
   * `chapterHeadingType`; `null` when no such heading precedes this article.
   */
  chapterHeadingText?: string | null;
}

/**
 * Which structural marker to treat as the "chapter" boundary for optional
 * glava-assignment during propis auto-split. The user picks this per import
 * since different laws use different terminology for the same conceptual
 * level (some use "Glava", others "Poglavlje", etc.) — no single default
 * would be correct for every document.
 */
export type ChapterHeadingType = "DIO" | "GLAVA" | "POGLAVLJE" | "ODJELJAK";

// Optional ordinal prefix before the chapter keyword. Some laws number the
// marker *before* the keyword ("1. GLAVA - OSNOVNE ODREDBE", "10a. GLAVA …")
// instead of after it ("GLAVA I — …"). Both forms must be recognised, so the
// keyword is allowed to be preceded by an arabic ordinal like "1." / "10a.".
const ORDINAL_PREFIX = String.raw`(?:\d+[a-z]?\.?\s*)?`;
const CHAPTER_HEADING_REGEX: Record<ChapterHeadingType, RegExp> = {
  DIO: new RegExp(String.raw`^\s*${ORDINAL_PREFIX}DIO\b`, "i"),
  GLAVA: new RegExp(String.raw`^\s*${ORDINAL_PREFIX}GLAVA\b`, "i"),
  POGLAVLJE: new RegExp(String.raw`^\s*${ORDINAL_PREFIX}POGLAVLJE\b`, "i"),
  ODJELJAK: new RegExp(String.raw`^\s*${ORDINAL_PREFIX}ODJELJAK\b`, "i"),
};

/** Extract first N words from text for auto-title */
function firstWords(text: string, n = 6): string {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  const slice = words.slice(0, n).join(" ");
  return words.length > n ? slice + "..." : slice;
}

const STRUCTURAL_KEYWORDS = /^\s*(DIO|GLAVA|POGLAVLJE|ODJELJAK|CZĘŚĆ|TYTUŁ)\b/i;

/** Detect structural legal headings that should be excluded from card body */
function isStructuralLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-ZČĆŽŠĐ]/.test(trimmed)) return true;
  if (STRUCTURAL_KEYWORDS.test(trimmed)) return true;
  return false;
}

/** Wrapper tags/classes whose children must be flattened before boundary
 * detection — otherwise a multi-paragraph wrap merges "Član X" and its
 * content into one text blob that never matches the boundary regex, and the
 * whole article silently disappears from detection. */
function isFlattenableWrapper(el: Element): boolean {
  if (el.tagName === "BLOCKQUOTE") return true;
  if (el.tagName === "DIV" && el.classList.contains("legal-provision")) return true;
  return false;
}

interface FlattenedElement {
  el: Element;
  /** The wrapper element this line was pulled out of, or `null` for a
   * genuine top-level sibling. Identity (not a boolean) matters: a line is
   * only safe to treat as an independent title candidate for a *different*
   * article when it is the FIRST line extracted from its wrapper — a later
   * sibling from the same wrapper is part of a multi-paragraph group that
   * must stay together, see `isFirstInWrapperGroup` below. */
  wrapper: Element | null;
}

/**
 * Recursively expand wrapper elements into their block children so a
 * "Član X" marker nested inside one (e.g. a `legal-provision` div spanning
 * a whole article, or a blockquote with several paragraphs) is still seen
 * as its own line. Wrappers with no element children (raw text only) are
 * kept as-is — there is nothing to flatten into.
 */
function flattenElements(elements: Element[], wrapper: Element | null = null): FlattenedElement[] {
  const out: FlattenedElement[] = [];
  for (const el of elements) {
    if (isFlattenableWrapper(el) && el.children.length > 0) {
      out.push(...flattenElements(Array.from(el.children), el));
    } else {
      out.push({ el, wrapper });
    }
  }
  return out;
}

/**
 * Parse source HTML and detect legal articles with titles.
 *
 * Mode A (Standard): Looks for a title line immediately above "Član X".
 * Mode B (Articles-only): If no title found, generates one from the first
 *   5-7 words of the article's first paragraph.
 */
export function detectArticles(
  html: string,
  chapterHeadingType?: ChapterHeadingType,
): DetectedArticle[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = flattenElements(Array.from(doc.body.children));

  interface Line {
    text: string;
    html: string;
    isArticle: boolean;
    articleNum: string;
    isHeading: boolean;
    wrapper: Element | null;
  }

  const articleRegex = /^\s*(?:Č|č)(?:lan|LANAK|L(?:AN|ANAK)?\.?)\s+(\d+[a-z]?)\.?\s*$/i;
  const headingTags = new Set(["H1", "H2", "H3"]);

  const lines: Line[] = [];
  for (const { el, wrapper } of elements) {
    const text = (el.textContent || "").trim();
    const outerHtml = el.outerHTML || "";
    // Skip heading elements — they are structural, not articles
    const isHeading = headingTags.has(el.tagName);
    const match = isHeading ? null : text.match(articleRegex);
    lines.push({
      text,
      html: outerHtml,
      isArticle: !!match,
      articleNum: match ? match[1] : "",
      isHeading,
      wrapper,
    });
  }

  /**
   * True when `lines[idx]` is safe to treat as an independent title
   * candidate: either it never came from a wrapper, or it is the FIRST line
   * pulled from its wrapper. A later sibling from the same wrapper is part
   * of a multi-paragraph group that must stay with that group, not be
   * "stolen" as some other article's title.
   */
  function isFirstInWrapperGroup(idx: number): boolean {
    const w = lines[idx].wrapper;
    if (!w) return true;
    return idx === 0 || lines[idx - 1].wrapper !== w;
  }

  // For each line, the nearest preceding (or current) structural heading of
  // the chosen type — e.g. every line from "GLAVA III — ..." onward maps to
  // that same text until the next "GLAVA" line replaces it. A single forward
  // sweep keeps this in sync with `lines` regardless of article boundaries.
  let chapterHeadingAtLine: (string | null)[] | null = null;
  if (chapterHeadingType) {
    const regex = CHAPTER_HEADING_REGEX[chapterHeadingType];
    let current: string | null = null;
    chapterHeadingAtLine = lines.map((line) => {
      if (regex.test(line.text)) current = line.text;
      return current;
    });
  }

  const articles: DetectedArticle[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].isArticle) continue;

    const articleNum = lines[i].articleNum;

    // ── Look backwards for title (Mode A) ──
    let title = "";
    let autoTitle = false;
    if (i > 0) {
      const candidate = lines[i - 1];
      if (candidate.text && !candidate.isArticle && isFirstInWrapperGroup(i - 1)) {
        // Only treat as title if:
        // 1. It's directly above (no other article between)
        // 2. It looks like a heading (short, ≤80 chars) not a content paragraph
        let belongsToPrevArticle = false;
        for (let k = i - 2; k >= 0; k--) {
          if (lines[k].isArticle) {
            // Check if this candidate is the ONLY content of the previous article
            let contentCount = 0;
            for (let m = k + 1; m < i; m++) {
              if (lines[m].text && !lines[m].isArticle) contentCount++;
            }
            // If the previous article would lose its only content, don't steal it
            if (contentCount <= 1) belongsToPrevArticle = true;
            break;
          }
        }
        if (!belongsToPrevArticle && candidate.text.length <= 80) {
          title = candidate.text;
        }
      }
    }

    // ── Collect content ──
    const contentParts: string[] = [];
    const plainParts: string[] = [];
    let nextBoundary = lines.length;

    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].isArticle) {
        nextBoundary = j;
        // Only reserve the line before next article as its title
        // if there are multiple content lines between articles
        const contentLinesBetween: number[] = [];
        for (let k = i + 1; k < j; k++) {
          if (lines[k].text && !lines[k].isArticle && !lines[k].isHeading) {
            contentLinesBetween.push(k);
          }
        }
        // If there are ≥2 content lines and the last one looks like a title
        // (the next article will pick it up via backward scan), exclude it —
        // but only when that line is safe to stand alone as a title (see
        // `isFirstInWrapperGroup`). Flattening a legal-provision/blockquote
        // wrap can make its last paragraph *look* like the last of several
        // "content lines" before the next article, but stealing it would
        // silently move a sentence from this article's content into the
        // next article's title.
        if (contentLinesBetween.length >= 2) {
          const lastContentIdx = contentLinesBetween[contentLinesBetween.length - 1];
          if (isFirstInWrapperGroup(lastContentIdx)) {
            nextBoundary = lastContentIdx;
          }
        }
        break;
      }
    }

    for (let j = i + 1; j < nextBoundary; j++) {
      if (lines[j].text && !lines[j].isHeading && !isStructuralLine(lines[j].text)) {
        contentParts.push(lines[j].html);
        plainParts.push(lines[j].text);
      }
    }

    // ── Mode B: Auto-generate title from first words ──
    if (!title && plainParts.length > 0) {
      title = firstWords(plainParts[0], 6);
      autoTitle = true;
    }

    const contentHtml = contentParts.join("\n");
    const plainSnippet = `Član ${articleNum}\n${plainParts.join("\n")}`;
    const essayName = title
      ? `Čl. ${articleNum} ${title}`
      : `Čl. ${articleNum}`;

    articles.push({
      articleNum,
      title,
      autoTitle,
      essayName,
      contentHtml,
      plainSnippet,
      chapterHeadingText: chapterHeadingAtLine ? chapterHeadingAtLine[i] : undefined,
    });
  }

  return articles;
}
