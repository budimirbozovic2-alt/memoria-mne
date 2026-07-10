import { useMemo, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KnowledgeBaseArticle } from "@/lib/db-types";
import { afterDialogClose } from "@/lib/dialog-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectLabel: string;
  selectedText: string;
  articles: KnowledgeBaseArticle[];
  onLink: (articleId: string) => void;
}

/**
 * "Poveži sa postojećim člankom" — picker for the reference-only propis↔article
 * link (see `LinkedProvision`). Only existing articles are offered; creating a
 * new one stays a separate, unchanged action ("Izvuci u novi članak").
 */
export default function LinkToExistingArticleModal({
  open, onOpenChange, subjectLabel, selectedText, articles, onLink,
}: Props) {
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...articles].sort((a, b) => a.title.localeCompare(b.title)),
    [articles],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((a) => a.title.toLowerCase().includes(q));
  }, [sorted, search]);

  const handleSelect = useCallback((articleId: string) => {
    onOpenChange(false);
    setSearch("");
    afterDialogClose(() => onLink(articleId));
  }, [onLink, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(""); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Poveži sa postojećim člankom</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži članke..."
              className="pl-9"
              autoFocus
            />
          </div>

          {selectedText && (
            <div className="rounded-md border bg-muted/50 p-2.5 max-h-24 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1">Označeni tekst:</p>
              <p className="text-xs line-clamp-4">{selectedText}</p>
            </div>
          )}

          <ScrollArea className="h-[300px]">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-12">
                {sorted.length === 0
                  ? `Nema članaka u predmetu "${subjectLabel}"`
                  : "Nema rezultata za pretragu"}
              </div>
            ) : (
              <div className="space-y-1 pr-3">
                {filtered.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate min-w-0 flex-1">{article.title}</p>
                    <Button size="sm" variant="secondary" onClick={() => handleSelect(article.id)}>
                      Poveži
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            {sorted.length} članaka u predmetu "{subjectLabel}"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
