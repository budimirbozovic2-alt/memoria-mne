import { Skeleton } from "@/components/ui/skeleton";

/** Full-page skeleton shown while lazy-loaded routes are loading */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header area */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Compact skeleton for lazy-loaded tabs within a page */
export function TabSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-fade-in">
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[140px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
