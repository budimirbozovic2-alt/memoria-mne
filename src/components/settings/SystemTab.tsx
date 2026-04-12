import { Database } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { TabSkeleton } from "@/components/ui/page-skeleton";

const HealthMonitor = lazy(() => import("@/components/HealthMonitor"));

interface Props {
  onOpenExportImport: () => void;
}

export default function SystemTab({ onOpenExportImport }: Props) {
  return (
    <div className="space-y-5">
      {/* Backup & Restore */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Backup & Restore</h3>
        <p className="text-xs text-muted-foreground">Izvezi ili uvezi kompletnu bazu podataka.</p>
        <Button variant="outline" className="gap-2" onClick={onOpenExportImport}>
          <Database className="h-4 w-4" />
          Export / Import
        </Button>
      </div>

      {/* Health Monitor */}
      <Suspense fallback={<TabSkeleton />}>
        <HealthMonitor />
      </Suspense>
    </div>
  );
}
