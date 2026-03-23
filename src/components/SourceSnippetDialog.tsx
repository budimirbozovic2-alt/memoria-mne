import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/lib/spaced-repetition";
import { highlightKeyParts } from "@/lib/highlight-key-parts";
import { useEffect, useState } from "react";
import { getSource, type Source } from "@/lib/sources-storage";

interface Props {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SourceSnippetDialog({ card, open, onOpenChange }: Props) {
  const [source, setSource] = useState<Source | null>(null);

  useEffect(() => {
    if (!open || !card.sourceId) return;
    getSource(card.sourceId).then(s => setSource(s ?? null));
  }, [open, card.sourceId]);

  if (!card.sourceId || !card.originalSourceSnippet) return null;

  const essayHtml = card.sections.map(s => s.content).join("<hr/>");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Poređenje sa izvorom
            {source && (
              <Badge variant="outline" className="text-[10px]">{source.label} v{source.version}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left: user's essay */}
          <div className="flex flex-col min-h-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Moj esej (formatiran)
            </h4>
            <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-4 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:text-foreground/90">
              <p className="font-medium text-foreground mb-3">{card.question}</p>
              <div dangerouslySetInnerHTML={{ __html: highlightKeyParts(essayHtml, card.keyParts) }} />
            </div>
          </div>

          {/* Right: original source snippet */}
          <div className="flex flex-col min-h-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Originalni tekst izvora
            </h4>
            <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {card.originalSourceSnippet}
              </p>
            </div>
          </div>
        </div>

        {card.needsReview && (
          <div className="mt-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-xs text-warning flex items-center gap-2">
            <span>⚠️</span>
            <span>Izvor je ažuriran — provjerite da li je vaš esej još uvijek u skladu sa novim tekstom.</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
