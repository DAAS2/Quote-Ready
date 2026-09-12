import { JobCardSkeleton } from "@/components/dashboard/job-card";

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading jobs">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-16 rounded bg-muted qr-bar-fill" />
          <div className="h-3.5 w-40 rounded bg-muted" />
        </div>
        <div className="h-8 w-56 rounded bg-muted" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="qr-anim-rise" style={{ animationDelay: `${i * 80}ms` }}>
          <JobCardSkeleton />
        </div>
      ))}
      <p className="pt-2 text-center font-mono text-[11px] text-muted-foreground">
        Loading workspace…
      </p>
    </div>
  );
}
