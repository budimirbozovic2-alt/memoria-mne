import { useState, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight, ArrowRightLeft, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Card, CARD_TAGS, SectionState } from "@/lib/spaced-repetition";
import { type CategoryRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

interface Props {
  cards: Card[];
  categoryId: string;
  allCategories: CategoryRecord[];
  patchCard: (id: string, fn: (c: Card) => Card) => void;
  toggleTag: (cardId: string, tag: string) => void;
}

function stabilityLabel(s: number): { text: string; color: string } {
  if (s >= 30) return { text: "Stabilno", color: "text-green-500" };
  if (s >= 7) return { text: "Srednje", color: "text-yellow-500" };
  return { text: "Slabo", color: "text-red-500" };
}

export default function CardViewMode({ cards, categoryId, allCategories, patchCard, toggleTag }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveCardId, setMoveCardId] = useState<string | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState("");

  const otherCategories = useMemo(
    () => allCategories.filter(c => c.id !== categoryId),
    [allCategories, categoryId]
  );

  const toggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const openMoveModal = useCallback((cardId: string) => {
    setMoveCardId(cardId);
    setTargetCategoryId("");
    setMoveModalOpen(true);
  }, []);

  const confirmMove = useCallback(() => {
    if (!moveCardId || !targetCategoryId) return;
    patchCard(moveCardId, c => ({ ...c, categoryId: targetCategoryId }));
    setMoveModalOpen(false);
    setMoveCardId(null);
  }, [moveCardId, targetCategoryId, patchCard]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Nema kartica u ovoj kategoriji.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {cards.map(card => {
        const isExpanded = expandedId === card.id;
        const avgStability = card.sections.length > 0
          ? card.sections.reduce((sum, s) => sum + s.stability, 0) / card.sections.length
          : 0;
        const stab = stabilityLabel(avgStability);
        const hasTags = card.tags && card.tags.length > 0;

        return (
          <div key={card.id} className="rounded-lg border bg-card overflow-hidden">
            {/* Card header row */}
            <button
              onClick={() => toggle(card.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="text-sm text-foreground truncate flex-1">{card.question || "(Bez pitanja)"}</span>
              <div className="flex items-center gap-2 shrink-0">
                {hasTags && card.tags!.includes("često-na-ispitu") && (
                  <Star className="h-3.5 w-3.5 text-destructive fill-destructive" />
                )}
                <span className={cn("text-[10px] font-medium", stab.color)}>{stab.text}</span>
                <Badge variant="outline" className="text-[10px]">
                  {card.type === "flash" ? "Flash" : "Esej"}
                </Badge>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                {/* Read-only structural info */}
                <div className="flex items-center gap-2 flex-wrap">
                  {card.subcategory && (
                    <Badge variant="secondary" className="text-[10px] opacity-60">
                      Potkategorija: {card.subcategory}
                    </Badge>
                  )}
                  {card.chapter && (
                    <Badge variant="secondary" className="text-[10px] opacity-60">
                      Glava: {card.chapter}
                    </Badge>
                  )}
                </div>

                {/* Sections */}
                <div className="space-y-2">
                  {card.sections.map((section, idx) => {
                    const secStab = stabilityLabel(section.stability);
                    const stateLabel = section.state === SectionState.New ? "Novo" : section.state === SectionState.Learning ? "Učenje" : section.state === SectionState.Review ? "Ponavljanje" : "Re-učenje";
                    return (
                      <div key={section.id} className="rounded border bg-background p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{section.title || `Sekcija ${idx + 1}`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{stateLabel}</span>
                            <span className={cn("text-[10px] font-medium", secStab.color)}>S: {section.stability.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-foreground/70 prose prose-xs dark:prose-invert max-w-none line-clamp-4" dangerouslySetInnerHTML={{ __html: section.content }} />
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CARD_TAGS.map(tag => {
                    const active = card.tags?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(card.id, tag.id)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                          active ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>

                {/* Move escape hatch */}
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => openMoveModal(card.id)}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Premjesti u drugu kategoriju
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Move modal */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Premjesti karticu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi kategoriju..." />
              </SelectTrigger>
              <SelectContent>
                {otherCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={confirmMove} disabled={!targetCategoryId} className="w-full">
              Premjesti
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
