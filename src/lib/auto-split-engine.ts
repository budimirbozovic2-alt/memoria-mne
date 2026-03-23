/**
 * Auto-Split Engine for Legal Documents
 * Detects articles (Član) with their titles and content,
 * enabling batch essay generation from legal source texts.
 */

export interface DetectedArticle {
  /** e.g. "59" or "10a" */
  articleNum: string;
  /** Title line found above the Član line */
  title: string;
  /** Full essay name: "Čl. 59 Pojam, sadržina..." */
  essayName: string;
  /** HTML content of the article body */
  contentHtml: string;
  /** Plain text snippet for backlink */
  plainSnippet: string;
}

/**
 * Parse source HTML and detect legal articles with titles.
 * Pattern:
 *   [Title line]       ← line immediately above "Član X"
 *   Član X             ← article marker
 *   [Content...]       ← everything until next title/Član or end
 */
export function detectArticles(html: string): DetectedArticle[] {
  // Convert HTML to lines, preserving tags for content extraction
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = Array.from(doc.body.children);

  // Build line-based structure from DOM elements
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

  // Now detect articles: title is the non-empty line before "Član X"
  const articles: DetectedArticle[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].isArticle) continue;

    const articleNum = lines[i].articleNum;

    // Look backwards for title (first non-empty line above)
    let title = "";
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].text && !lines[j].isArticle) {
        // Skip if this line is content of a previous article (check if there's another Član between j and i)
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

    // Collect content: everything after "Član X" until the next title-before-Član or end
    const contentParts: string[] = [];
    const plainParts: string[] = [];
    let nextBoundary = lines.length;

    // Find next article's title line (or next article line)
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].isArticle) {
        // The boundary is the title above this next article (if any), otherwise the article itself
        nextBoundary = j;
        // Check if line before is a title
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

    const contentHtml = contentParts.join("\n");
    const plainSnippet = `Član ${articleNum}\n${plainParts.join("\n")}`;
    const essayName = title
      ? `Čl. ${articleNum} ${title}`
      : `Čl. ${articleNum}`;

    articles.push({
      articleNum,
      title,
      essayName,
      contentHtml,
      plainSnippet,
    });
  }

  return articles;
}
