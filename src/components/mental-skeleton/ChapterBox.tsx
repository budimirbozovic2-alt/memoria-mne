import { ChevronDown, BookOpen } from "lucide-react";
import React, { useMemo } from "react";
import { Card, SectionState } from "@/lib/spaced-repetition";
import { getCardMasteryLevel, getMasteryColor } from "@/lib/mastery";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import SkeletonCardTile from "./SkeletonCardTile";
import { UNASSIGNED_CHAPTER } from "./types";

interface ChapterBoxProps {
  chapter: string;
  displayName?: string;
  cards: Card[];
  isOpen: boolean;
  onToggle: () => void;
  onCardClick: (card: Card) => void;
}

function ChapterBoxInner({ chapter, displayName: displayNameProp, cards, isOpen, onToggle, onCardClick }: ChapterBoxProps) {
  const isUnassigned = chapter === UNASSIGNED_CHAPTER;
  const displayName = isUnassigned ? "Nekategorisane" : (displayNameProp || chapter);
  const sortedCards = useMemo(() =>
    [...cards].sort((a, b) => (a.chapterOrder ?? 0) - (b.chapterOrder ?? 0)),
    [cards]
  );

  const levelCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    cards.forEach(c => counts[getCardMasteryLevel(c)]++);
    return counts;
  }, [cards]);

  const sectionStats = useMemo(() => {
    let total = 0, learned = 0, due = 0, avgStability = 0;
    cards.forEach(c => {
      c.sections.forEach(s => {
        total++;
        if (s.state === SectionState.Review || s.state === SectionState.Relearning) learned++;
        if (s.nextReview && s.nextReview <= Date.now()) due++;
        avgStability += s.stability;
      });
    });
    avgStability = total > 0 ? Math.round((avgStability / total) * 10) / 10 : 0;
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
    return { total, learned, due, avgStability, pct };
  }, [cards]);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-xl border bg-card transition-all duration-200">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
          <CollapsibleTrigger className="flex items-center gap-3 flex-1 min-w-0">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "" : "-rotate-90"}`} />
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="ml-2 text-xs text-muted-foreground">{cards.length}</span>
            </div>
          </CollapsibleTrigger>
          {cards.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{sectionStats.pct}%</span>
                  <div className="flex h-2 w-24 rounded-full overflow-hidden bg-secondary">
                    {levelCounts.map((count, lvl) => {
                      if (count === 0) return null;
                      return (
                        <div key={lvl} style={{ width: `${(count / cards.length) * 100}%`, backgroundColor: getMasteryColor(lvl) }} />
                      );
                    })}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs space-y-1 max-w-52">
                <p className="font-medium">{displayName}</p>
                <p>{sectionStats.learned}/{sectionStats.total} sekcija savladano ({sectionStats.pct}%)</p>
                {sectionStats.due > 0 && <p className="text-warning">{sectionStats.due} sekcija čeka ponavljanje</p>}
                <p>Prosječna stabilnost: {sectionStats.avgStability} dana</p>
                <p>{cards.length} kartica</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <CollapsibleContent>
          <div className="pl-4 pr-2 py-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {sortedCards.map(card => (
                <SkeletonCardTile
                  key={card.id}
                  card={card}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
            {cards.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nema kartica u ovoj glavi</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const ChapterBox = React.memo(ChapterBoxInner);

export default ChapterBox;
