import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface ArchNodeProps {
  name: string;
  cardCount: number;
  levels: number[];
  avgStability: number;
  index: number;
  onClick: () => void;
}

/** Get mastery color by level index */
function getMasteryColor(level: number): string {
  const colors = [
    "hsl(220, 13%, 69%)",   // 0 New
    "hsl(0, 72%, 51%)",     // 1 Critical
    "hsl(25, 95%, 53%)",    // 2 Hard
    "hsl(45, 93%, 47%)",    // 3 Uncertain
    "hsl(142, 60%, 50%)",   // 4 Stable
    "hsl(142, 60%, 30%)",   // 5 Mastered
  ];
  return colors[level] ?? colors[0];
}

export const ArchNode = memo(function ArchNode({
  name,
  cardCount,
  levels,
  avgStability,
  index,
  onClick,
}: ArchNodeProps) {
  const totalMastered = levels[4] + levels[5];
  const allMastered = totalMastered === cardCount && cardCount > 0;
  const hasCracks = avgStability > 0 && avgStability < 10;
  const hasIvy = avgStability > 0 && avgStability < 5;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={onClick}
      className={`
        group relative overflow-hidden text-left
        forum-tablet
        ${allMastered
          ? "!border-gold/40 shadow-[0_0_16px_-4px_hsl(var(--gold)/0.2)]"
          : hasIvy
            ? "!border-green-800/30"
            : ""
        }
        hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200
      `}
    >
      {/* Atmospheric lighting tint */}
      <div
        className="absolute inset-0 pointer-events-none rounded transition-colors duration-1000"
        style={{ background: "var(--atmo-tint, transparent)" }}
        aria-hidden
      />

      {/* Chiseled edge highlight (top) */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" aria-hidden />

      {/* Crack texture for low stability */}
      {hasCracks && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M25 0 L28 25 L22 40 L30 60 L20 85 L26 100" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <path d="M75 0 L72 20 L78 45 L68 70 L74 100" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.4" />
        </svg>
      )}

      {/* Ivy growth for neglected nodes */}
      {hasIvy && (
        <div className="absolute inset-0 pointer-events-none rounded" aria-hidden>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-green-950/15 to-transparent rounded-b" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="font-display text-sm text-foreground truncate max-w-[200px] tracking-wide">
            {name}
          </h4>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <p className="text-[11px] text-muted-foreground mb-3 tabular-nums">
          {cardCount} kartica
          {avgStability > 0 && <span className="ml-2">S̄ {avgStability.toFixed(0)}d</span>}
        </p>

        {/* Mastery bar — styled as carved stone channel */}
        <div className="relative h-2 w-full rounded-sm overflow-hidden"
          style={{ background: "hsl(var(--muted) / 0.5)", boxShadow: "inset 0 1px 2px hsl(0 0% 0% / 0.15)" }}
        >
          <div className="flex h-full">
            {levels.map((count, lvl) =>
              count > 0 ? (
                <div
                  key={lvl}
                  style={{
                    width: `${(count / cardCount) * 100}%`,
                    backgroundColor: getMasteryColor(lvl),
                  }}
                />
              ) : null,
            )}
          </div>
        </div>
      </div>

      {/* Gold laurel glow for fully mastered */}
      {allMastered && (
        <>
          <div className="absolute inset-0 pointer-events-none rounded ring-1 ring-gold/20" aria-hidden />
          <div className="absolute -top-8 -left-8 -right-8 h-16 pointer-events-none rounded-full bg-gold/5 blur-2xl" aria-hidden />
        </>
      )}
    </motion.button>
  );
});
