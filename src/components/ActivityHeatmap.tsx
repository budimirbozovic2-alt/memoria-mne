import { useMemo } from "react";
import { ReviewLogEntry } from "@/lib/storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  reviewLog: ReviewLogEntry[];
}

function getDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

const INTENSITY_CLASSES = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-400",
];

export default function ActivityHeatmap({ reviewLog }: Props) {
  const { grid, months } = useMemo(() => {
    const DAYS = 91; // ~13 weeks
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Count reviews per day
    const counts: Record<string, number> = {};
    reviewLog.forEach((e) => {
      const key = getDayKey(e.timestamp);
      counts[key] = (counts[key] || 0) + 1;
    });

    // Find max for intensity
    const maxCount = Math.max(1, ...Object.values(counts));

    // Build grid: columns = weeks, rows = days (0=Mon, 6=Sun)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - DAYS + 1);

    // Adjust to start on Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const cells: { key: string; count: number; intensity: number; date: Date }[] = [];
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    let col = 0;
    while (cursor <= now) {
      const weekStart = new Date(cursor);
      for (let row = 0; row < 7; row++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + row);
        const key = getDayKey(d.getTime());
        const count = counts[key] || 0;
        const intensity = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));

        if (d.getMonth() !== lastMonth) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];
          months.push({ label: monthNames[d.getMonth()], col });
          lastMonth = d.getMonth();
        }

        cells.push({ key, count, intensity, date: new Date(d) });
      }
      cursor.setDate(cursor.getDate() + 7);
      col++;
    }

    // Organize into grid [row][col]
    const totalWeeks = col;
    const grid: typeof cells[number][][] = Array.from({ length: 7 }, () => []);
    cells.forEach((cell, i) => {
      const row = i % 7;
      grid[row].push(cell);
    });

    return { grid, months };
  }, [reviewLog]);

  const dayLabels = ["P", "U", "S", "Č", "P", "S", "N"];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Aktivnost</h3>

      {/* Month labels */}
      <div className="flex gap-[3px] ml-6 text-[10px] text-muted-foreground">
        {grid[0] && grid[0].map((cell, colIdx) => {
          const m = months.find((m) => m.col === colIdx);
          return (
            <div key={colIdx} className="w-[13px] text-center">
              {m ? m.label : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground w-5">
          {dayLabels.map((l, i) => (
            <div key={i} className="h-[13px] flex items-center justify-end pr-0.5">{i % 2 === 0 ? l : ""}</div>
          ))}
        </div>

        {/* Grid */}
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-[3px]">
            {grid[0] && grid[0].map((_, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {grid.map((row, rowIdx) => {
                  const cell = row[colIdx];
                  if (!cell) return <div key={rowIdx} className="w-[13px] h-[13px]" />;
                  return (
                    <Tooltip key={rowIdx}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-[13px] h-[13px] rounded-sm ${INTENSITY_CLASSES[cell.intensity]} transition-colors`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {cell.count} ponavljanja — {formatDate(cell.key)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
        <span>Manje</span>
        {INTENSITY_CLASSES.map((cls, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-sm ${cls}`} />
        ))}
        <span>Više</span>
      </div>
    </div>
  );
}
