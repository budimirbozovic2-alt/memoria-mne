import React from "react";

interface ScoreBadgeProps {
  score: number;
}

const ScoreBadge = React.memo(function ScoreBadge({ score }: ScoreBadgeProps) {
  const color = score >= 70 ? "text-success bg-success/10" : score >= 40 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${color}`}>{score}%</span>;
});

interface RetentionBadgeProps {
  retention: number;
}

const RetentionBadge = React.memo(function RetentionBadge({ retention }: RetentionBadgeProps) {
  if (retention === 0) return null;
  const color = retention >= 90 ? "text-success" : retention >= 70 ? "text-warning" : "text-destructive";
  const strokeColor = retention >= 90 ? "hsl(var(--success))" : retention >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const circumference = 2 * Math.PI * 7;
  const offset = circumference - (retention / 100) * circumference;
  return (
    <span className={`text-[11px] font-medium flex items-center gap-1 ${color}`} title={`Vjerovatnoća prisjećanja: ${retention}%`}>
      <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
        <circle cx="9" cy="9" r="7" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
        <circle cx="9" cy="9" r="7" fill="none" stroke={strokeColor} strokeWidth="2"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 9 9)" className="transition-all duration-500" />
      </svg>
      {retention}%
    </span>
  );
});

interface SectionBarProps {
  score: number;
}

const SectionBar = React.memo(function SectionBar({ score }: SectionBarProps) {
  const color = score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : score > 0 ? "bg-destructive" : "bg-muted-foreground/30";
  return (
    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(score, 5)}%` }} />
    </div>
  );
});

export { ScoreBadge, RetentionBadge, SectionBar };
