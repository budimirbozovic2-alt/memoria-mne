import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading2, List, Link2, Code, Map as MapIcon } from "lucide-react";

export interface ZettelEditorHandle {
  insertText: (text: string) => void;
  /** Insert `text` as a standalone block: guarantees blank line before & after, regardless of cursor position. */
  insertBlock: (text: string) => void;
  focus: () => void;
}

interface Props {
  value: string;
  /** Fires synchronously on every input — parent should hold this in a draft state, NOT persist. */
  onChange: (next: string) => void;
  placeholder?: string;
  onInsertMindMap?: () => void;
}

/** Minimal markdown editor with toolbar; supports [[wiki-links]] and ::mindmap[] embeds. */
const ZettelEditor = forwardRef<ZettelEditorHandle, Props>(function ZettelEditor(
  { value, onChange, placeholder, onInsertMindMap },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Caret restoration is racy if done in `requestAnimationFrame` immediately after
   * `onChange`: the textarea's `value` prop is only updated after React commits the
   * parent's state. If we call `setSelectionRange` before that commit, the browser
   * clamps against the *old* value and the caret jumps (often to the end).
   *
   * Solution: stash a pending target keyed by the *expected* `value` snapshot, then
   * apply it from a `useLayoutEffect` that fires once `value` matches. This also
   * makes rapid sequential inserts safe — each one targets its own snapshot.
   */
  const pendingCaretRef = useRef<{
    selStart: number;
    selEnd: number;
    expectedValue: string;
  } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingCaretRef.current;
    if (!pending) return;
    if (value !== pending.expectedValue) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const max = ta.value.length;
    const s = Math.min(pending.selStart, max);
    const e = Math.min(pending.selEnd, max);
    ta.setSelectionRange(s, e);
    pendingCaretRef.current = null;
  }, [value]);

  const scheduleCaret = useCallback((expectedValue: string, selStart: number, selEnd: number = selStart) => {
    pendingCaretRef.current = { selStart, selEnd, expectedValue };
  }, []);

  const wrap = useCallback((before: string, after: string = before, ph = "") => {
    const ta = taRef.current;
    if (!ta) return;
    const rawStart = ta.selectionStart;
    const rawEnd = ta.selectionEnd;
    const start = Math.min(rawStart, rawEnd);
    const end = Math.max(rawStart, rawEnd);
    const selected = value.slice(start, end) || ph;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    const cursorStart = start + before.length;
    scheduleCaret(next, cursorStart, cursorStart + selected.length);
  }, [value, onChange, scheduleCaret]);

  const insertAtLineStart = useCallback((prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    scheduleCaret(next, start + prefix.length);
  }, [value, onChange, scheduleCaret]);

  const insertText = useCallback((text: string) => {
    const ta = taRef.current;
    const rawStart = ta?.selectionStart ?? value.length;
    const rawEnd = ta?.selectionEnd ?? value.length;
    const start = Math.min(rawStart, rawEnd);
    const end = Math.max(rawStart, rawEnd);
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    scheduleCaret(next, start + text.length);
  }, [value, onChange, scheduleCaret]);

  /**
   * Inserts `text` as a standalone block, surrounded by blank lines so it renders
   * as its own paragraph regardless of where the caret is.
   *
   * Caret guarantee: lands on the **first blank writable line directly below the block**
   * (so the user can immediately start typing a new paragraph). At end-of-document
   * this is the new trailing line; in mid-document this is the blank line between
   * the block and pre-existing content. Any prior selection is replaced.
   */
  const insertBlock = useCallback((text: string) => {
    const ta = taRef.current;
    const rawStart = ta?.selectionStart ?? value.length;
    const rawEnd = ta?.selectionEnd ?? value.length;
    const start = Math.min(rawStart, rawEnd);
    const end = Math.max(rawStart, rawEnd);
    const before = value.slice(0, start);
    const after = value.slice(end);

    // Leading newlines: ensure exactly one blank line before the block,
    // unless we're at document start (no padding needed).
    let prefix = "";
    if (before.length > 0) {
      if (before.endsWith("\n\n")) prefix = "";
      else if (before.endsWith("\n")) prefix = "\n";
      else prefix = "\n\n";
    }

    // Trailing newlines: ensure exactly one blank line after the block,
    // unless we're at document end (single \n is enough).
    let suffix = "";
    if (after.length === 0) {
      suffix = "\n";
    } else {
      if (after.startsWith("\n\n")) suffix = "";
      else if (after.startsWith("\n")) suffix = "\n";
      else suffix = "\n\n";
    }

    const insertion = prefix + text + suffix;
    const next = before + insertion + after;
    onChange(next);

    // Caret target: just past the FIRST trailing newline. Visually this is the
    // blank line directly under the block (mid-doc: between block and `after`;
    // end-of-doc: the fresh trailing line). When suffix is empty we landed on
    // an existing paragraph break — caret goes flush against the block.
    const caretOffsetInSuffix = suffix.length === 0 ? 0 : 1;
    const pos = start + prefix.length + text.length + caretOffsetInSuffix;
    scheduleCaret(next, pos);
  }, [value, onChange, scheduleCaret]);

  useImperativeHandle(ref, () => ({
    insertText,
    insertBlock,
    focus: () => taRef.current?.focus(),
  }), [insertText, insertBlock]);


  return (
    <div className="flex flex-col h-full border border-border rounded-md bg-card">
      <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap">
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("**", "**", "tekst")} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("*", "*", "tekst")} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("`", "`", "kod")} aria-label="Code">
          <Code className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertAtLineStart("## ")} aria-label="Heading 2">
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insertAtLineStart("- ")} aria-label="List">
          <List className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => wrap("[[", "]]", "Naslov članka")}
          className="gap-1.5"
          aria-label="Wiki link"
        >
          <Link2 className="h-4 w-4" />
          <span className="text-xs">Wiki-link</span>
        </Button>
        {onInsertMindMap && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onInsertMindMap}
            className="gap-1.5"
            aria-label="Umetni mapu uma"
          >
            <MapIcon className="h-4 w-4" />
            <span className="text-xs">Umetni mapu</span>
          </Button>
        )}
      </div>
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Napišite svoju bilješku u markdownu...\n\nKoristite [[Naslov članka]] za povezivanje, ::mindmap[id] za mapu uma."}
        className="flex-1 resize-none border-0 rounded-none rounded-b-md font-mono text-sm leading-relaxed focus-visible:ring-0"
      />
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border flex justify-between">
        <span>Markdown · `**bold**` · `*italic*` · `## naslov` · `[[Wiki Link]]` · `::mindmap[id]`</span>
        <span>{value.length} znakova</span>
      </div>
    </div>
  );
});

export default ZettelEditor;
