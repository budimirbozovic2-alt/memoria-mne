import { forwardRef, type HTMLAttributes, createElement } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

type Tag = "div" | "span" | "section" | "article" | "p";

interface Props extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "children"> {
  html: string;
  /** Element tag (default 'div'). */
  as?: Tag;
  /**
   * Skip render-time sanitization. ONLY for content already sanitized in the
   * same tick (e.g. highlight wrappers like `highlightKeyParts`). Default
   * `false` — every render passes through DOMPurify (defense-in-depth).
   */
  trusted?: boolean;
}

/**
 * `<SafeHtml>` — uniformni wrapper koji garantuje render-time XSS odbranu.
 *
 * Pravilo: SVAKI `dangerouslySetInnerHTML` ide kroz ovu komponentu, osim
 * highlight-aware path-eva (gdje highlight wrapper već sanitizuje + ubacuje
 * `<mark>` tagove koje ne smijemo dvaput čistiti jer DOMPurify može odbiti
 * neke klase).
 */
export const SafeHtml = forwardRef<HTMLElement, Props>(
  ({ html, as = "div", trusted = false, ...rest }, ref) => {
    const safe = trusted ? html : sanitizeHtml(html);
    return createElement(as, {
      ref,
      ...rest,
      dangerouslySetInnerHTML: { __html: safe },
    });
  },
);
SafeHtml.displayName = "SafeHtml";
