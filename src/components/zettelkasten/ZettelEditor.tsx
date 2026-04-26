import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading2, List, Link2, Code } from "lucide-react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

/** Minimal markdown editor with toolbar; supports [[wiki-links]] insertion. */
export default function ZettelEditor({ value, onChange, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [local, setLocal] = useState(value);

  // Sync incoming value if parent resets it (e.g., switching articles)
  useEffect(() => { setLocal(value); }, [value]);

  // Debounced upward propagation
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 400);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  const wrap = useCallback((before: string, after: string = before, placeholder = "") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = local.slice(start, end) || placeholder;
    const next = local.slice(0, start) + before + selected + after + local.slice(end);
    setLocal(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorStart = start + before.length;
      ta.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  }, [local]);

  const insertAtLineStart = useCallback((prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = local.lastIndexOf("\n", start - 1) + 1;
    const next = local.slice(0, lineStart) + prefix + local.slice(lineStart);
    setLocal(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }, [local]);

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
      </div>
      <Textarea
        ref={taRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder ?? "Napišite svoju bilješku u markdownu...\n\nKoristite [[Naslov članka]] za povezivanje."}
        className="flex-1 resize-none border-0 rounded-none rounded-b-md font-mono text-sm leading-relaxed focus-visible:ring-0"
      />
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border flex justify-between">
        <span>Markdown · `**bold**` · `*italic*` · `## naslov` · `[[Wiki Link]]`</span>
        <span>{local.length} znakova</span>
      </div>
    </div>
  );
}
