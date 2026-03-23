import { useState, useMemo, useCallback } from "react";
import { default as Wand2 } from "lucide-react/dist/esm/icons/wand-2";
import { default as Check } from "lucide-react/dist/esm/icons/check";
import { default as RefreshCw } from "lucide-react/dist/esm/icons/refresh-cw";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { detectArticles, type DetectedArticle } from "@/lib/auto-split-engine";
import { createTextAnchor, type Source } from "@/lib/sources-storage";
import { sanitizeHtml } from "@/lib/sanitize";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/spaced-repetition";

interface Props {
  open: boolean;
  onClose: () => void;
  source: Source;
}

type ArticleStatus = "new" | "exists" | "update";

interface ArticleRow extends DetectedArticle {
  selected: boolean;
  status: ArticleStatus;
  existingCardId?: string;
}

export default function AutoSplitDialog({ open, onClose, source }: Props) {
  const { addCard, cards, updateCard } = useAppContext();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Detect articles on open
  const detected = useMemo(() => {
    if (!open) return [];
    return detectArticles(source.htmlContent);
  }, [open, source.htmlContent]);

  // Match existing cards to detect duplicates
  const linkedCards = useMemo(
    () => cards.filter((c: Card) => c.sourceId === source.id),
    [cards, source.id]
  );

  const initialRows = useMemo((): ArticleRow[] => {
    return detected.map((art) => {
      // Check if an essay with this article number already exists
      const existing = linkedCards.find((c: Card) => {
        const q = c.question.toLowerCase();
        return q.includes(`čl. ${art.articleNum}`) || q.includes(`član ${art.articleNum}`);
      });

      const status: ArticleStatus = existing ? "exists" : "new";
      return {
        ...art,
        selected: status === "new", // auto-select only new ones
        status,
        existingCardId: existing?.id,
      };
    });
  }, [detected, linkedCards]);

  const [rows, setRows] = useState<ArticleRow[]>([]);

  // Reset rows when dialog opens with new data
  useMemo(() => {
    setRows(initialRows);
    setDone(false);
    setProgress(0);
    setImporting(false);
  }, [initialRows]);

  const toggleRow = useCallback((idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const toggleAll = useCallback(() => {
    setRows((prev) => {
      const allSelected = prev.every((r) => r.selected);
      return prev.map((r) => ({ ...r, selected: !allSelected }));
    });
  }, []);

  const selectedCount = rows.filter((r) => r.selected).length;
  const newCount = rows.filter((r) => r.status === "new").length;
  const existsCount = rows.filter((r) => r.status === "exists").length;

  const handleImport = useCallback(async () => {
    const toImport = rows.filter((r) => r.selected);
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress(0);
    let count = 0;

    const category = source.label || "Opšte";

    for (let i = 0; i < toImport.length; i++) {
      const art = toImport[i];
      const anchor = createTextAnchor(art.plainSnippet);
      const sections = [{ title: "Odgovor", content: sanitizeHtml(art.contentHtml) }];

      if (art.status === "exists" && art.existingCardId) {
        // Update existing card
        updateCard(art.existingCardId, {
          question: art.essayName,
          sections,
        });
      } else {
        // Create new card
        addCard(
          art.essayName,
          sections,
          category,
          undefined,
          undefined,
          {
            sourceId: source.id,
            textAnchor: anchor,
            originalSourceSnippet: art.plainSnippet,
          }
        );
      }
      count++;
      setProgress(Math.round(((i + 1) / toImport.length) * 100));

      // Yield to UI every 10 items
      if (i % 10 === 9) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setImportedCount(count);
    setImporting(false);
    setDone(true);

    toast({
      title: `Generisano ${count} eseja`,
      description: `Iz izvora "${source.label}"`,
    });
  }, [rows, source, addCard, updateCard]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="h-5 w-5 text-primary" />
            Auto-generisanje eseja
          </DialogTitle>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Pronađeno <strong className="text-foreground">{detected.length}</strong> članova</span>
          <span>•</span>
          <Badge variant="outline" className="text-[10px] gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            {newCount} novih
          </Badge>
          {existsCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              {existsCount} postojećih
            </Badge>
          )}
        </div>

        {/* Progress bar during import */}
        {importing && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}% — generisanje u toku...</p>
          </div>
        )}

        {/* Done message */}
        {done && (
          <div className="flex items-center gap-2 rounded-lg border bg-green-500/10 border-green-500/30 px-4 py-3">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Uspješno generisano {importedCount} eseja!</span>
          </div>
        )}

        {/* Article list */}
        {!done && !importing && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {rows.every((r) => r.selected) ? "Odselektuj sve" : "Selektuj sve"}
              </button>
              <span className="text-xs text-muted-foreground">{selectedCount} odabrano</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1 max-h-[400px]">
              {rows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nisu pronađeni članci u formatu "Član X" u ovom izvoru.
                </div>
              )}
              {rows.map((row, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    row.selected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRow(i)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.essayName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {row.plainSnippet.slice(0, 120)}...
                    </p>
                  </div>
                  {row.status === "exists" && (
                    <Badge variant="secondary" className="text-[10px] gap-1 flex-shrink-0">
                      <RefreshCw className="h-3 w-3" />
                      Ažuriraj
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {done ? (
            <Button onClick={onClose} className="flex-1">Zatvori</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={importing}>
                Otkaži
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1 gap-2"
                disabled={importing || selectedCount === 0}
              >
                <Wand2 className="h-4 w-4" />
                Generiši {selectedCount} eseja
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
