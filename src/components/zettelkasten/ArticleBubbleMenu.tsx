import { BubbleMenu } from "@tiptap/react/menus";
import { GraduationCap } from "lucide-react";
import { useCallback } from "react";
import type { Editor } from "@/lib/editor-v4";
import { getEditorSelectionPayload, type SelectionPayload } from "@/lib/source-reader/selection-payload";

interface Props {
  editor: Editor;
  /** Selected text + HTML + V4 AST → new essay card linked to this article. */
  onMemorize: (payload: SelectionPayload) => void;
}

/**
 * Faza 2: TipTap BubbleMenu for the zettelkasten article editor. A single
 * action — "Memoriši (esej)" — turns the current selection into an essay card
 * linked to the active article (the taxonomy is chosen afterwards in CardForm).
 * Blic cards still come from the source autosplit path (§2b of the plan).
 */
export function ArticleBubbleMenu({ editor, onMemorize }: Props) {
  const handleMemorize = useCallback(() => {
    const payload = getEditorSelectionPayload(editor);
    if (payload) onMemorize(payload);
  }, [editor, onMemorize]);

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false;
        const text = editor.state.doc.textBetween(from, to, " ", " ").trim();
        return text.length >= 5;
      }}
      className="flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleMemorize}
        title="Memoriši kao esej karticu"
        aria-label="Memoriši kao esej karticu"
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        <span className="font-medium">Memoriši</span>
      </button>
    </BubbleMenu>
  );
}
