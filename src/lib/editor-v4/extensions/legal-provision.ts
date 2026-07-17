import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    legalProvision: {
      wrapInLegalProvision: () => ReturnType;
      liftLegalProvision: () => ReturnType;
      toggleLegalProvision: () => ReturnType;
    };
  }
}

/**
 * `legalProvision` — block wrapper for statutory text excerpts ("propis").
 *
 * DOM shape: `<div class="legal-provision">…</div>`. Visually distinct from
 * surrounding theory prose. Exposed in both the source editor (SourceBubbleMenu,
 * skripta only) and the zettelkasten article editor (EditorV4, `embedKind="article"`),
 * where it marks the regulation half of a "propis + teorija" note.
 *
 * Copy-with-trace (zettelkasten-centric plan, Faza 0): a propis block carries an
 * optional `sourceId` + `anchor` pointing back to the source excerpt it was copied
 * from. The text stays a static copy; the trace enables a later "verify against
 * source" step. `anchor` mirrors the card↔source `textAnchor` (an opaque string
 * produced by `createTextAnchor`). Both default to null so pre-existing blocks
 * (and theory prose) parse unchanged.
 */
export const LegalProvision = Node.create({
  name: "legalProvision",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-source-id"),
        renderHTML: (attributes) =>
          attributes.sourceId ? { "data-source-id": attributes.sourceId } : {},
      },
      anchor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-anchor"),
        renderHTML: (attributes) =>
          attributes.anchor ? { "data-anchor": attributes.anchor } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.legal-provision",
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "legal-provision" }),
      0,
    ];
  },

  addCommands() {
    return {
      wrapInLegalProvision:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),

      liftLegalProvision:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      toggleLegalProvision:
        () =>
        ({ commands, state }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === this.name) {
              return commands.lift(this.name);
            }
          }
          return commands.wrapIn(this.name);
        },
    };
  },
});
