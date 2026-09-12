import Link from "next/link";
import {
  CircleCheck,
  Inbox,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { JobCard } from "@/components/dashboard/job-card";
import { EmptyJobs } from "@/components/dashboard/empty-jobs";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import { initials, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { JobListItem } from "@/lib/data/types";

type StatusKey = "all" | "needs_information" | "inspection_recommended" | "ready_for_estimate";

export function JobsWorkspace({
  jobs,
  status,
  q,
}: {
  jobs: JobListItem[];
  status: StatusKey;
  q: string;
}) {
  const counts: Record<StatusKey, number> = {
    all: jobs.length,
    needs_information: jobs.filter((j) => j.status === "needs_information").length,
    inspection_recommended: jobs.filter((j) => j.status === "inspection_recommended").length,
    ready_for_estimate: jobs.filter((j) => j.status === "ready_for_estimate").length,
  };
  const safetyCount = jobs.filter((j) => j.safety_flag).length;

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? jobs.filter((j) =>
        [
          j.customer.full_name,
          j.suburb ?? "",
          JOB_TYPE_LABELS[j.job_type],
        ].join(" ").toLowerCase().includes(needle),
      )
    : jobs;
  const visible = status === "all" ? filtered : filtered.filter((j) => j.status === status);

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {jobs.length} enquir{jobs.length === 1 ? "y" : "ies"}
            {safetyCount > 0 && (
              <span className="text-safety"> · {safetyCount} need{safetyCount === 1 ? "s" : ""} safety attention</span>
            )}
          </p>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          href="/dashboard"
          label="All jobs"
          count={counts.all}
          icon={Inbox}
          tone="text-foreground"
          bar="bg-primary/70"
          active={status === "all" && !needle}
        />
        <Kpi
          href="/dashboard?status=needs_information"
          label="Needs info"
          count={counts.needs_information}
          icon={TriangleAlert}
          tone="text-warning"
          bar="bg-warning"
          active={status === "needs_information"}
        />
        <Kpi
          href="/dashboard?status=inspection_recommended"
          label="Inspection"
          count={counts.inspection_recommended}
          icon={Wrench}
          tone="text-inspect"
          bar="bg-inspect"
          active={status === "inspection_recommended"}
        />
        <Kpi
          href="/dashboard?status=ready_for_estimate"
          label="Ready"
          count={counts.ready_for_estimate}
          icon={CircleCheck}
          tone="text-success"
          bar="bg-success"
          active={status === "ready_for_estimate"}
        />
      </div>

      {/* ── toolbar: search ── */}
      <form action="/dashboard" method="get" className="relative max-w-sm">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search customer, suburb, job type…"
          className="pl-8"
          aria-label="Search jobs"
        />
      </form>

      {/* ── list ── */}
      {visible.length === 0 ? (
        <EmptyJobs filtered={Boolean(needle) || status !== "all"} />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Job type</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Readiness</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Updated</th>
                  <th scope="col" className="w-8" />
                </tr>
              </thead>
              <tbody>
                {visible.map((job, i) => (
                  <JobRow key={job.id} job={job} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {visible.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */

function Kpi({
  href,
  label,
  count,
  icon: Icon,
  tone,
  bar,
  active,
}: {
  href: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  bar: string;
  active: boolean;
}) {
  const total = Math.max(count, 1);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card px-4 py-3 transition-all duration-200 hover:border-primary/35 hover:shadow-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60",
        active && "border-primary/50 ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone)} aria-hidden />
      </div>
      <p className={cn("mt-1.5 font-mono text-2xl font-semibold tabular-nums", tone)}>{count}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", bar)}
          style={{ width: `${(count / total) * 100}%` }}
        />
      </div>
    </Link>
  );
}

/* ── desktop table row ────────────────────────────────────────────────────── */

function JobRow({ job, index }: { job: JobListItem; index: number }) {
  return (
    <tr
      className="group relative border-b transition-colors last:border-0 hover:bg-accent/40"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <td className="px-4 py-3">
        <a
          href={`/jobs/${job.id}`}
          className="flex items-center gap-3 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary" aria-hidden>
            {initials(job.customer.full_name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{job.customer.full_name}</span>
            {job.customer.suburb && (
              <span className="block truncate text-[11px] text-muted-foreground">{job.customer.suburb}</span>
            )}
          </span>
        </a>
      </td>
      <td className="px-4 py-3 text-[13px] text-muted-foreground">{JOB_TYPE_LABELS[job.job_type]}</td>
      <td className="px-4 py-3">
        <StatusCell job={job} />
      </td>
      <td className="px-4 py-3">
        <ReadinessCell score={job.readiness_score} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {relativeTime(job.updated_at)}
      </td>
      <td className="px-2 py-3 text-right">
        <svg viewBox="0 0 24 24" className="size-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </td>
    </tr>
  );
}

function StatusCell({ job }: { job: JobListItem }) {
  return <StatusBadge status={job.status} safetyFlag={job.safety_flag} />;
}

function ReadinessCell({ score }: { score: number | null }) {
  return (
    <div className="flex w-32 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        {typeof score === "number" && (
          <div
            className={cn(
              "qr-bar-fill h-full rounded-full",
              typeof score === "number"
                ? score >= 70
                  ? "bg-success"
                  : score >= 40
                    ? "bg-inspect"
                    : "bg-warning"
                : "bg-muted-foreground/40",
            )}
            style={{ width: `${score}%` }}
          />
        )}
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {typeof score === "number" ? `${score}%` : "—"}
      </span>
    </div>
  );
}
