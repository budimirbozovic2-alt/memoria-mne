/**
 * Heading Promotion Engine
 *
 * Detects pseudo-headings in HTML content (bold paragraphs, ALL CAPS text,
 * legal section patterns like "GLAVA I", "DIO PRVI", etc.) and promotes
 * them to proper HTML heading tags for outline navigation.
 */

// ─── Legal / structural heading patterns ────────────────
// Matches: GLAVA I, DIO PRVI, POGLAVLJE 2, NASLOV III, ODJELJAK 1, ODSJEK A
const LEGAL_SECTION_H1 = /^(DIO|PART)\s+[IVXLCDM\d]+\.?\s*$/i;
const LEGAL_SECTION_H2 = /^(GLAVA|POGLAVLJE|CHAPTER|NASLOV|TITLE)\s+[IVXLCDM\d]+\.?(\s*[-–—:]\s*.+)?$/i;
const LEGAL_SECTION_H3 = /^(ODJELJAK|ODSJEK|SECTION|PODODJELJAK)\s+[A-Z\d]+\.?(\s*[-–—:]\s*.+)?$/i;

// Numbered section patterns: "1.", "1.1.", "I.", "A."
const NUMBERED_SECTION = /^\d+(\.\d+)*\.?\s+\S/;
const ROMAN_SECTION = /^[IVXLCDM]+\.\s+\S/;

/** Check if text is mostly uppercase (>= 70% alpha chars are upper) */
function isMostlyUpperCase(text: string): boolean {
  const alpha = text.replace(/[^a-zA-ZčćžšđČĆŽŠĐ]/g, "");
  if (alpha.length < 2) return false;
  const upper = alpha.replace(/[^A-ZČĆŽŠĐ]/g, "");
  return upper.length / alpha.length >= 0.7;
}

/** Check if a paragraph is a "pure bold" pseudo-heading */
function isPureBold(el: Element): boolean {
  // <p><strong>text</strong></p> or <p><b>text</b></p>
  const children = el.children;
  if (children.length === 0) return false;

  // All child nodes must be bold (strong/b), possibly with nested spans
  const text = el.textContent?.trim() || "";
  if (!text || text.length > 200) return false; // too long for heading
  if (text.endsWith(".") && text.split(".").length > 2) return false; // likely a sentence

  // Check if entire content is wrapped in strong/b
  const clone = el.cloneNode(true) as Element;
  const strongs = clone.querySelectorAll("strong, b");
  if (strongs.length === 0) return false;

  // Get text from strong/b elements
  let boldText = "";
  strongs.forEach(s => { boldText += s.textContent || ""; });
  const boldRatio = boldText.trim().length / text.length;
  return boldRatio >= 0.85;
}

/** Determine heading level for a detected pseudo-heading */
function classifyHeading(text: string, isPureBoldEl: boolean, isUpperCase: boolean): number | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // Legal section patterns get specific levels
  if (LEGAL_SECTION_H1.test(trimmed)) return 1;
  if (LEGAL_SECTION_H2.test(trimmed)) return 2;
  if (LEGAL_SECTION_H3.test(trimmed)) return 3;

  // ALL CAPS + bold → h2
  if (isPureBoldEl && isUpperCase && trimmed.length <= 120) return 2;

  // ALL CAPS only (no bold) → h3
  if (isUpperCase && trimmed.length <= 80) return 3;

  // Bold-only short text → h3
  if (isPureBoldEl && trimmed.length <= 100) return 3;

  return null;
}

/**
 * Promote pseudo-headings to real heading tags in HTML content.
 * Processes paragraphs and detects:
 * - Bold-wrapped text (e.g. <p><strong>Title</strong></p>)
 * - ALL CAPS text
 * - Legal/structural patterns (GLAVA, DIO, POGLAVLJE, etc.)
 *
 * Returns modified HTML with pseudo-headings replaced by <h1>-<h3> tags.
 */
export function promoteHeadings(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paragraphs = doc.querySelectorAll("p");

  let promotedCount = 0;

  paragraphs.forEach(p => {
    // Skip if already inside a heading or if it has complex content (tables, images)
    if (p.closest("h1, h2, h3, h4, h5, h6, table, li")) return;
    if (p.querySelector("img, table")) return;

    const text = p.textContent?.trim() || "";
    if (!text || text.length < 2) return;

    const pureBold = isPureBold(p);
    const upperCase = isMostlyUpperCase(text);

    // Skip if neither bold nor uppercase
    if (!pureBold && !upperCase) return;

    const level = classifyHeading(text, pureBold, upperCase);
    if (!level) return;

    // Create heading element preserving inner HTML
    const heading = doc.createElement(`h${level}`);
    // Use plain text content for clean headings
    heading.textContent = text;
    p.replaceWith(heading);
    promotedCount++;
  });

  return promotedCount > 0 ? doc.body.innerHTML : html;
}

/**
 * Auto-detect source title from the first heading or prominent text.
 * Returns null if no clear title found.
 */
export function detectTitle(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 1. Check for explicit h1
  const h1 = doc.querySelector("h1");
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  // 2. Check first few paragraphs for title-like patterns
  const elements = Array.from(doc.body.children).slice(0, 5);
  for (const el of elements) {
    const text = el.textContent?.trim() || "";
    if (!text || text.length < 3 || text.length > 150) continue;

    // Bold centered text or ALL CAPS at the beginning
    if (isPureBold(el) || isMostlyUpperCase(text)) {
      // Skip gazette/metadata patterns
      if (/služben|glasnik|list|novin|objavljen|br\./i.test(text)) continue;
      if (/^\d+\/\d+/.test(text)) continue;
      return text;
    }
  }

  // 3. Check for common legal title patterns
  const fullText = doc.body.textContent || "";
  const lawMatch = fullText.match(/^[\s\S]{0,500}?(ZAKON\s+O\s+[^\n.]+)/i);
  if (lawMatch) return lawMatch[1].trim();

  const pravilnikMatch = fullText.match(/^[\s\S]{0,500}?(PRAVILNIK\s+O\s+[^\n.]+)/i);
  if (pravilnikMatch) return pravilnikMatch[1].trim();

  const uredbaMatch = fullText.match(/^[\s\S]{0,500}?(UREDBA\s+O\s+[^\n.]+)/i);
  if (uredbaMatch) return uredbaMatch[1].trim();

  return null;
}
