import { GraduationCap, RotateCcw } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";
interface Props {
  dueCount: number;
  hasCards: boolean;
}

export const QuickActions = memo(function QuickActions({ dueCount, hasCards }: Props) {
  if (!hasCards) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-center gap-3 flex-wrap"
      style={{ animationDelay: "40ms", animationFillMode: "both" }}>
      <Link to="/learn"
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
        <GraduationCap className="h-4 w-4" />
        Nastavi učenje
      </Link>
      {dueCount > 0 && (
        <Link to="/review"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card text-sm font-medium hover:bg-secondary transition-colors">
          <RotateCcw className="h-4 w-4 text-warning" />
          Ponovi dospjele ({dueCount})
        </Link>
      )}
    </div>
  );
});
