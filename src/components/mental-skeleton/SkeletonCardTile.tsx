import React from "react";
import { Card } from "@/lib/spaced-repetition";
import { getCardMasteryLevel, getMasteryColor, MASTERY_LEVELS } from "@/components/KnowledgeMap";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface SkeletonCardTileProps {
  card: Card;
  onClick: () => void;
}

function SkeletonCardTileInner({ card, onClick }: SkeletonCardTileProps) {
  const level = getCardMasteryLevel(card);
  const bgColor = getMasteryColor(level);
  const hasErrors = (card.errorLog?.length || 0) > 0;
  const shortTitle = card.question.length > 18 ? card.question.slice(0, 16) + "…" : card.question;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          <button
            onClick={onClick}
            className="w-full h-full min-h-[2.75rem] px-2 py-1.5 rounded-lg text-[10px] font-medium leading-tight transition-all hover:scale-105 hover:shadow-md flex items-center"
            style={{ backgroundColor: bgColor, color: "#fff" }}
          >
            <span className="truncate flex-1 text-left">{shortTitle}</span>
          </button>
          {hasErrors && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border border-background" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <p className="font-medium text-xs">{card.question}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {MASTERY_LEVELS[level].label} — Stabilnost: {(card.sections.reduce((s, sec) => s + sec.stability, 0) / card.sections.length).toFixed(1)}d
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

const SkeletonCardTile = React.memo(SkeletonCardTileInner, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.sections === next.card.sections &&
    prev.card.errorLog === next.card.errorLog &&
    prev.card.question === next.card.question
  );
});

export default SkeletonCardTile;
