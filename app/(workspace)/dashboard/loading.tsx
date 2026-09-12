import { JobCardSkeleton } from "@/components/dashboard/job-card";

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading jobs">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-6 w-16 rounded bg-muted" />
          <div className="h-3.5 w-40 rounded bg-muted" />
        </div>
        <div className="h-8 w-56 rounded bg-muted" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
