import { RotateCcw } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  dueCount: number;
  hasCards: boolean;
}

export const QuickActions = memo(function QuickActions({ dueCount, hasCards }: Props) {
  if (!hasCards) return null;

  if (dueCount === 0) {
    // Globalno učenje uklonjeno — aktivno prisjećanje je isključivo
    // subject-centric (pokreće se iz dashboard-a predmeta). Ovdje samo status.
    return (
      <div className="animate-fade-up" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
        <p className="text-xs text-muted-foreground text-center px-1">
          Nema dospjelih kartica za review. Uči po predmetu iz njegovog dashboard-a.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
      <Button asChild className="w-full gap-2">
        <Link to="/review">
          <RotateCcw className="h-4 w-4" strokeWidth={1.6} />
          Ponovi dospjele
          <span className="tabular opacity-80">({dueCount})</span>
        </Link>
      </Button>
    </div>
  );
});
