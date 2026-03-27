/**
 * SVG Primitive Library for Roman Forum Monuments
 * Reusable building blocks that change appearance based on MaterialTier.
 */
import type { MaterialTier } from "@/lib/forum-logic";

// ─── Tier Color Palette ──────────────────────────────────

export const TIER_FILLS: Record<MaterialTier, { primary: string; secondary: string; accent: string; stroke: string }> = {
  wood:   { primary: "hsl(30, 50%, 35%)",  secondary: "hsl(30, 40%, 45%)",  accent: "hsl(30, 60%, 25%)",  stroke: "hsl(30, 30%, 20%)" },
  brick:  { primary: "hsl(15, 60%, 40%)",  secondary: "hsl(15, 50%, 50%)",  accent: "hsl(15, 70%, 30%)",  stroke: "hsl(15, 40%, 25%)" },
  stone:  { primary: "hsl(0, 0%, 50%)",    secondary: "hsl(0, 0%, 60%)",    accent: "hsl(0, 0%, 40%)",    stroke: "hsl(0, 0%, 30%)" },
  marble: { primary: "hsl(210, 15%, 85%)", secondary: "hsl(210, 20%, 92%)", accent: "hsl(210, 10%, 75%)", stroke: "hsl(210, 10%, 60%)" },
  gold:   { primary: "hsl(45, 80%, 55%)",  secondary: "hsl(45, 90%, 70%)",  accent: "hsl(45, 70%, 40%)",  stroke: "hsl(35, 60%, 30%)" },
};

interface PrimitiveProps {
  tier: MaterialTier;
  x?: number;
  y?: number;
}

// ─── Column Primitives ───────────────────────────────────

export function Column({ tier, x = 0, y = 0 }: PrimitiveProps & { height?: number }) {
  const c = TIER_FILLS[tier];
  // Evolving column styles per tier
  switch (tier) {
    case "wood":
      // Simple timber post
      return (
        <g transform={`translate(${x},${y})`}>
          <rect x={-3} y={-60} width={6} height={60} fill={c.primary} stroke={c.stroke} strokeWidth={0.5} />
          <rect x={-4} y={-62} width={8} height={3} fill={c.secondary} rx={0.5} />
        </g>
      );
    case "brick":
      // Tapered brick pillar
      return (
        <g transform={`translate(${x},${y})`}>
          <polygon points="-5,0 5,0 4,-60 -4,-60" fill={c.primary} stroke={c.stroke} strokeWidth={0.5} />
          {[0, -12, -24, -36, -48].map(py => (
            <line key={py} x1={-5} y1={py} x2={5} y2={py} stroke={c.stroke} strokeWidth={0.3} opacity={0.5} />
          ))}
          <rect x={-5} y={-62} width={10} height={3} fill={c.secondary} rx={0.5} />
        </g>
      );
    case "stone":
      // Fluted Doric
      return (
        <g transform={`translate(${x},${y})`}>
          <rect x={-5} y={-60} width={10} height={60} fill={c.primary} stroke={c.stroke} strokeWidth={0.5} rx={1} />
          {[-1, 1, 3, -3].map(fx => (
            <line key={fx} x1={fx} y1={0} x2={fx} y2={-60} stroke={c.accent} strokeWidth={0.3} opacity={0.4} />
          ))}
          <rect x={-7} y={-63} width={14} height={4} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={0.5} />
          <rect x={-6} y={0} width={12} height={3} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={0.5} />
        </g>
      );
    case "marble":
      // Ionic with volutes
      return (
        <g transform={`translate(${x},${y})`}>
          <rect x={-5} y={-58} width={10} height={58} fill={c.primary} stroke={c.stroke} strokeWidth={0.5} rx={1} />
          {[-2, 0, 2].map(fx => (
            <line key={fx} x1={fx} y1={0} x2={fx} y2={-58} stroke={c.accent} strokeWidth={0.3} opacity={0.3} />
          ))}
          {/* Ionic capital with volutes */}
          <rect x={-8} y={-63} width={16} height={5} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={1} />
          <circle cx={-7} cy={-61} r={2.5} fill="none" stroke={c.stroke} strokeWidth={0.5} />
          <circle cx={7} cy={-61} r={2.5} fill="none" stroke={c.stroke} strokeWidth={0.5} />
          <rect x={-6} y={0} width={12} height={4} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={1} />
        </g>
      );
    case "gold":
      // Corinthian with acanthus leaves
      return (
        <g transform={`translate(${x},${y})`}>
          <rect x={-5} y={-56} width={10} height={56} fill={c.primary} stroke={c.stroke} strokeWidth={0.5} rx={1} />
          {[-2, 0, 2].map(fx => (
            <line key={fx} x1={fx} y1={0} x2={fx} y2={-56} stroke={c.accent} strokeWidth={0.4} opacity={0.4} />
          ))}
          {/* Corinthian capital */}
          <rect x={-9} y={-64} width={18} height={8} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={1} />
          {/* Acanthus leaf details */}
          <path d="M-7,-58 Q-6,-62 -4,-60 Q-3,-58 -2,-62 Q0,-56 2,-62 Q3,-58 4,-60 Q6,-62 7,-58" fill="none" stroke={c.accent} strokeWidth={0.6} />
          <path d="M-5,-56 Q-3,-60 0,-57 Q3,-60 5,-56" fill="none" stroke={c.accent} strokeWidth={0.5} />
          <rect x={-7} y={0} width={14} height={5} fill={c.secondary} stroke={c.stroke} strokeWidth={0.4} rx={1} />
        </g>
      );
  }
}

// ─── Roof Primitives ─────────────────────────────────────

export function TriangularRoof({ tier, x = 0, y = 0, width = 80 }: PrimitiveProps & { width?: number }) {
  const c = TIER_FILLS[tier];
  const hw = width / 2;
  const peakH = tier === "gold" ? 22 : tier === "marble" ? 20 : 16;

  return (
    <g transform={`translate(${x},${y})`}>
      <polygon
        points={`${-hw},0 0,${-peakH} ${hw},0`}
        fill={c.secondary}
        stroke={c.stroke}
        strokeWidth={0.6}
      />
      {/* Tympanum detail for marble+ */}
      {(tier === "marble" || tier === "gold") && (
        <circle cx={0} cy={-peakH / 2 - 1} r={peakH / 5} fill="none" stroke={c.stroke} strokeWidth={0.4} />
      )}
      {/* Gold acroteria */}
      {tier === "gold" && (
        <>
          <polygon points={`0,${-peakH} -2,${-peakH - 5} 2,${-peakH - 5}`} fill={c.primary} stroke={c.stroke} strokeWidth={0.3} />
          <polygon points={`${-hw},0 ${-hw - 2},-4 ${-hw + 2},-2`} fill={c.primary} stroke={c.stroke} strokeWidth={0.3} />
          <polygon points={`${hw},0 ${hw + 2},-4 ${hw - 2},-2`} fill={c.primary} stroke={c.stroke} strokeWidth={0.3} />
        </>
      )}
      {/* Cornice line */}
      <line x1={-hw} y1={0} x2={hw} y2={0} stroke={c.stroke} strokeWidth={0.8} />
    </g>
  );
}

export function DomeRoof({ tier, x = 0, y = 0, width = 40 }: PrimitiveProps & { width?: number }) {
  const c = TIER_FILLS[tier];
  const hw = width / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d={`M${-hw},0 Q${-hw},${-hw} 0,${-hw} Q${hw},${-hw} ${hw},0 Z`}
        fill={c.secondary}
        stroke={c.stroke}
        strokeWidth={0.6}
      />
      {tier === "gold" && <circle cx={0} cy={-hw - 3} r={2} fill={c.primary} stroke={c.stroke} strokeWidth={0.3} />}
    </g>
  );
}

// ─── Base Primitives ─────────────────────────────────────

export function Base({ tier, x = 0, y = 0, width = 90 }: PrimitiveProps & { width?: number }) {
  const c = TIER_FILLS[tier];
  const hw = width / 2;
  const steps = tier === "wood" ? 1 : tier === "brick" ? 2 : tier === "stone" ? 3 : 4;

  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: steps }).map((_, i) => {
        const sw = hw + (steps - i) * 4;
        const sy = i * 3;
        return (
          <rect
            key={i}
            x={-sw}
            y={sy}
            width={sw * 2}
            height={3}
            fill={i === 0 ? c.secondary : c.primary}
            stroke={c.stroke}
            strokeWidth={0.4}
            rx={tier === "wood" ? 0 : 0.5}
          />
        );
      })}
    </g>
  );
}

// ─── Arch Primitive ──────────────────────────────────────

export function Arch({ tier, x = 0, y = 0, width = 20, height = 30 }: PrimitiveProps & { width?: number; height?: number }) {
  const c = TIER_FILLS[tier];
  const hw = width / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d={`M${-hw},0 L${-hw},${-height + hw} A${hw},${hw} 0 0,1 ${hw},${-height + hw} L${hw},0`}
        fill="none"
        stroke={c.stroke}
        strokeWidth={0.8}
      />
      {tier === "gold" && (
        <circle cx={0} cy={-height + hw} r={1.5} fill={c.primary} stroke={c.stroke} strokeWidth={0.3} />
      )}
    </g>
  );
}

// ─── Wall Primitive ──────────────────────────────────────

export function Wall({ tier, x = 0, y = 0, width = 60, height = 50 }: PrimitiveProps & { width?: number; height?: number }) {
  const c = TIER_FILLS[tier];
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={-height} width={width} height={height} fill={c.primary} stroke={c.stroke} strokeWidth={0.5} />
      {/* Texture patterns */}
      {tier === "brick" && (
        <>
          {Array.from({ length: Math.floor(height / 6) }).map((_, row) => (
            <g key={row}>
              <line x1={0} y1={-row * 6} x2={width} y2={-row * 6} stroke={c.stroke} strokeWidth={0.2} opacity={0.4} />
              {Array.from({ length: Math.floor(width / 10) }).map((_, col) => (
                <line key={col} x1={(col + 1) * 10 + (row % 2 ? 5 : 0)} y1={-row * 6} x2={(col + 1) * 10 + (row % 2 ? 5 : 0)} y2={-row * 6 - 6} stroke={c.stroke} strokeWidth={0.2} opacity={0.3} />
              ))}
            </g>
          ))}
        </>
      )}
      {tier === "stone" && (
        <>
          {Array.from({ length: Math.floor(height / 8) }).map((_, row) => (
            <line key={row} x1={0} y1={-row * 8} x2={width} y2={-row * 8} stroke={c.stroke} strokeWidth={0.3} opacity={0.3} />
          ))}
        </>
      )}
      {(tier === "marble" || tier === "gold") && (
        <rect x={1} y={-height + 1} width={width - 2} height={height - 2} fill="none" stroke={c.accent} strokeWidth={0.3} opacity={0.3} rx={0.5} />
      )}
    </g>
  );
}
