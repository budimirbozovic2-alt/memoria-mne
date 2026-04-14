import { Clock, BookOpen } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";
interface Props {
  due: number;
  learnedSections: number;
  totalSections: number;
  pendingFirstReview: number;
}

export const CoreStats = memo(function CoreStats({ due, learnedSections, totalSections, pendingFirstReview }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Link to="/review">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 glass-card p-5 space-y-2 hover:border-gold/40 transition-colors cursor-pointer"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <Clock className="h-5 w-5 text-primary mb-1" />
          <p className="text-4xl font-bold">{due}</p>
          <p className="text-sm text-muted-foreground">Za ponavljanje</p>
          {pendingFirstReview > 0 && <p className="text-xs text-primary">+ {pendingFirstReview} čeka prvo pon.</p>}
        </div>
      </Link>
      <Link to="/categories">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 glass-card p-5 space-y-2 hover:border-gold/40 transition-colors cursor-pointer"
          style={{ animationDelay: "140ms", animationFillMode: "both" }}>
          <BookOpen className="h-5 w-5 text-success mb-1" />
          <p className="text-4xl font-bold">{learnedSections}</p>
          <p className="text-sm text-muted-foreground">Naučene cjeline</p>
          <p className="text-xs text-muted-foreground">od {totalSections} ukupno</p>
        </div>
      </Link>
    </div>
  );
});
