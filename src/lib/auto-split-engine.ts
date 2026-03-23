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
}

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

/**
 * Parse source HTML and detect legal articles with titles.
 *
 * Mode A (Standard): Looks for a title line immediately above "Član X".
 * Mode B (Articles-only): If no title found, generates one from the first
 *   5-7 words of the article's first paragraph.
 */
export function detectArticles(html: string): DetectedArticle[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = Array.from(doc.body.children);

  interface Line {
    text: string;
    html: string;
    isArticle: boolean;
    articleNum: string;
  }

  const articleRegex = /^\s*(?:Č|č)(?:lan|LANAK|L(?:AN|ANAK)?\.?)\s+(\d+[a-z]?)\.?\s*$/i;

  const lines: Line[] = [];
  for (const el of elements) {
    const text = (el.textContent || "").trim();
    const outerHtml = el.outerHTML || "";
    const match = text.match(articleRegex);
    lines.push({
      text,
      html: outerHtml,
      isArticle: !!match,
      articleNum: match ? match[1] : "",
    });
  }

  const articles: DetectedArticle[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].isArticle) continue;

    const articleNum = lines[i].articleNum;

    // ── Look backwards for title (Mode A) ──
    let title = "";
    let autoTitle = false;
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].text && !lines[j].isArticle) {
        let belongsToPrevious = false;
        for (let k = j + 1; k < i; k++) {
          if (lines[k].isArticle) { belongsToPrevious = true; break; }
        }
        if (!belongsToPrevious) {
          title = lines[j].text;
        }
        break;
      }
    }

    // ── Collect content ──
    const contentParts: string[] = [];
    const plainParts: string[] = [];
    let nextBoundary = lines.length;

    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].isArticle) {
        nextBoundary = j;
        for (let k = j - 1; k > i; k--) {
          if (lines[k].text && !lines[k].isArticle) {
            nextBoundary = k;
            break;
          }
        }
        break;
      }
    }

    for (let j = i + 1; j < nextBoundary; j++) {
      if (lines[j].text) {
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
    });
  }

  return articles;
}
