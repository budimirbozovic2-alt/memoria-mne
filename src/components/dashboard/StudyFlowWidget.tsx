import { ClipboardList, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useUIContext } from "@/contexts/AppContext";

export interface StudyFlowData {
  focusSubject: string;
  dailyMapped: number;
  dailyQuota: number;
  learnPct: number;
  reviewPct: number;
  ratioLabel: string;
  overallPct: number;
}

export function StudyFlowWidget({ data }: { data: StudyFlowData }) {
  const { setView } = useUIContext();
  const progressPct = data.dailyQuota > 0 ? Math.min(100, Math.round((data.dailyMapped / data.dailyQuota) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Plan za danas</h3>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Fokus</p>
        <p className="text-sm font-semibold truncate">{data.focusSubject}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data.dailyMapped}/{data.dailyQuota} sekcija</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Omjer: {data.learnPct}% učenje · {data.reviewPct}% ponavljanje</span>
      </div>
      <p className="text-xs text-muted-foreground/70">{data.ratioLabel}</p>

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5"
        onClick={() => setView("learn")}
      >
        Nastavi učenje <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
