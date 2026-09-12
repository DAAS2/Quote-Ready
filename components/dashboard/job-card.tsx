import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JobTypeBadge, StatusBadge } from "@/components/shared/status-badge";
import { ReadinessMeter } from "@/components/shared/readiness-meter";
import { initials, relativeTime } from "@/lib/utils/format";
import type { JobListItem } from "@/lib/data/types";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import { cn } from "@/lib/utils";

export function JobCard({ job, index = 0 }: { job: JobListItem; index?: number }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
      className="qr-anim-rise group block rounded-lg border bg-card px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/40 hover:shadow-[0_12px_30px_-14px_rgb(37_64_233/0.25)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60"
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          aria-hidden
        >
          {initials(job.customer.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-medium">{job.customer.full_name}</p>
            {job.customer.suburb && (
              <p className="truncate text-xs text-muted-foreground">{job.customer.suburb}</p>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <JobTypeBadge label={JOB_TYPE_LABELS[job.job_type]} className="h-5 px-1.5 text-[11px]" />
            <StatusBadge status={job.status} safetyFlag={job.safety_flag} className="h-5 px-1.5 text-[11px]" />
          </div>
        </div>
        <div className="hidden w-32 shrink-0 sm:block">
          <ReadinessMeter score={job.readiness_score} size="sm" />
        </div>
        <div className="hidden shrink-0 text-right md:block">
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {relativeTime(job.updated_at)}
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      </div>
    </Link>
  );
}

export function JobCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card px-4 py-3.5", className)} aria-hidden>
      <div className="flex items-center gap-3.5">
        <div className="size-9 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3.5 w-44 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
