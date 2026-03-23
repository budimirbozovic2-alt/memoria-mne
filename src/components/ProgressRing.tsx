import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  /** 0-100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  colorClass?: string;
}

export default function ProgressRing({
  percent,
  size = 90,
  strokeWidth = 7,
  label,
  sublabel,
  colorClass = "text-primary",
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={colorClass}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{Math.round(percent)}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-center leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground text-center">{sublabel}</p>}
    </div>
  );
}
