import { sanitizeHtml } from "@/lib/sanitize";
import React, { useMemo } from "react";
import { SafeHtml } from "@/components/ui/safe-html";

/**
 * Pre-compiled matcher for key-part highlighting.
 *
 * Phase C / P2-1: prior implementation re-compiled `new RegExp(...)` for every
 * key part on every render (O(sections × keyParts) per pass — 50k regex
 * compiles for a 1000×50 card). The matcher collapses all key parts into a
 * single alternation regex, sorted by length desc so longer matches win over
 * prefix-shadowed shorter ones. Reuse one matcher across many sections.
 */
export interface KeyPartsMatcher {
  readonly regex: RegExp;
}

const KEY_PART_MIN_LEN = 3;

export function compileKeyPartsMatcher(keyParts?: string[] | null): KeyPartsMatcher | null {
  if (!keyParts || keyParts.length === 0) return null;
  const valid = keyParts.filter((p): p is string => typeof p === "string" && p.length >= KEY_PART_MIN_LEN);
  if (valid.length === 0) return null;
  // Longest-first prevents short prefixes from shadowing longer matches.
  const sorted = [...valid].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
  );
  return { regex: new RegExp(`(?![^<]*>)(${escaped.join("|")})`, "gi") };
}

/**
 * Highlights key parts in HTML content by wrapping matched text
 * with a <mark> tag using the accent system color.
 * Output is always sanitized for defense-in-depth XSS protection.
 *
 * Accepts either a raw `string[]` (compiles a one-shot matcher) or a pre-built
 * `KeyPartsMatcher` (hoist via `useKeyPartsMatcher` for hot rendering loops).
 */
export function highlightKeyParts(
  html: string,
  keyPartsOrMatcher?: string[] | KeyPartsMatcher | null,
): string {
  if (!keyPartsOrMatcher) return sanitizeHtml(html);
  const matcher: KeyPartsMatcher | null = Array.isArray(keyPartsOrMatcher)
    ? compileKeyPartsMatcher(keyPartsOrMatcher)
    : keyPartsOrMatcher;
  if (!matcher) return sanitizeHtml(html);
  // `String.prototype.replace` resets `lastIndex` on /g regexes, safe to reuse.
  const result = html.replace(matcher.regex, '<mark class="key-part-highlight">$1</mark>');
  return sanitizeHtml(result);
}

/**
 * Memoize a matcher per key-parts identity. Hoist near the parent of a
 * sections.map(...) to amortize the single regex compile across the row.
 */
export function useKeyPartsMatcher(keyParts?: string[] | null): KeyPartsMatcher | null {
  return useMemo(() => compileKeyPartsMatcher(keyParts), [keyParts]);
}

/**
 * Memoized highlighted section component for use inside .map() loops.
 * Phase A / P0-3: render kroz `<SafeHtml trusted>` — `highlightKeyParts`
 * već sanitizuje, drugi prolaz DOMPurify-a bi odbacio `<mark>` klase.
 *
 * Phase C / P2-1: prefer passing a hoisted `matcher` from the parent over
 * raw `keyParts`. Both are supported for incremental migration.
 */
export function HighlightedSection({
  content,
  keyParts,
  matcher,
  className,
}: {
  content: string;
  keyParts?: string[];
  matcher?: KeyPartsMatcher | null;
  className?: string;
}) {
  const localMatcher = useKeyPartsMatcher(matcher !== undefined ? undefined : keyParts);
  const effective = matcher !== undefined ? matcher : localMatcher;
  const html = useMemo(() => highlightKeyParts(content, effective), [content, effective]);
  return React.createElement(SafeHtml, { html, className, trusted: true });
}
