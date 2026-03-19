import React from "react";
import { Button } from "@/components/ui/button";
import { GRADE_LABELS, GRADE_DESCRIPTIONS, GRADE_COLORS } from "./types";

interface Props {
  onGrade: (grade: number) => void;
  hint?: string;
}

const GradeButtons = React.memo(function GradeButtons({ onGrade, hint }: Props) {
  return (
    <div>
      {hint && <p className="text-xs text-muted-foreground mb-2 text-center">{hint}</p>}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((g) => (
          <Button key={g} onClick={() => onGrade(g)} className={`${GRADE_COLORS[g]} border-0 flex-col h-auto py-2`} variant="outline">
            <span className="font-bold">{g} — {GRADE_LABELS[g]}</span>
            <span className="text-[10px] opacity-75 font-normal">{GRADE_DESCRIPTIONS[g]}</span>
          </Button>
        ))}
      </div>
    </div>
  );
});

export default GradeButtons;
