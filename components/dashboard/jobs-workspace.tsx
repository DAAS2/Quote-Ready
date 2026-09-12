"use client";

import { useDeferredValue, useMemo, useState } from "react";
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

const FILTERS: Array<{ key: StatusKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "needs_information", label: "Needs info" },
  { key: "inspection_recommended", label: "Inspection" },
  { key: "ready_for_estimate", label: "Ready" },
];

export function JobsWorkspace({ jobs }: { jobs: JobListItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("all");
  const deferredQuery = useDeferredValue(query);

  const counts: Record<StatusKey, number> = {
    all: jobs.length,
    needs_information: jobs.filter((j) => j.status === "needs_information").length,
    inspection_recommended: jobs.filter((j) => j.status === "inspection_recommended").length,
    ready_for_estimate: jobs.filter((j) => j.status === "ready_for_estimate").length,
  };
  const safetyCount = jobs.filter((j) => j.safety_flag).length;

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? jobs.filter((j) =>
          [j.customer.full_name, j.suburb ?? "", JOB_TYPE_LABELS[j.job_type]]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : jobs;
    return status === "all" ? filtered : filtered.filter((j) => j.status === status);
  }, [jobs, deferredQuery, status]);

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
          label="All jobs"
          count={counts.all}
          icon={Inbox}
          tone="text-foreground"
          bar="bg-primary/70"
          active={status === "all"}
          onClick={() => setStatus("all")}
        />
        <Kpi
          label="Needs info"
          count={counts.needs_information}
          icon={TriangleAlert}
          tone="text-warning"
          bar="bg-warning"
          active={status === "needs_information"}
          onClick={() => setStatus("needs_information")}
        />
        <Kpi
          label="Inspection"
          count={counts.inspection_recommended}
          icon={Wrench}
          tone="text-inspect"
          bar="bg-inspect"
          active={status === "inspection_recommended"}
          onClick={() => setStatus("inspection_recommended")}
        />
        <Kpi
          label="Ready"
          count={counts.ready_for_estimate}
          icon={CircleCheck}
          tone="text-success"
          bar="bg-success"
          active={status === "ready_for_estimate"}
          onClick={() => setStatus("ready_for_estimate")}
        />
      </div>

      {/* ── toolbar: instant search + filters ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, suburb, job type…"
            className="pl-8"
            aria-label="Search jobs"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              aria-pressed={status === f.key}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60",
                status === f.key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="font-mono text-[11px] tabular-nums opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── list ── */}
      {visible.length === 0 ? (
        <EmptyJobs filtered={Boolean(deferredQuery.trim()) || status !== "all"} />
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
                {visible.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {visible.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */

function Kpi({
  label,
  count,
  icon: Icon,
  tone,
  bar,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  bar: string;
  active: boolean;
  onClick: () => void;
}) {
  const total = Math.max(count, 1);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card px-4 py-3 text-left transition-all duration-200 hover:border-primary/35 hover:shadow-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60",
        active && "border-primary/50 ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4 transition-transform duration-200 group-hover:scale-110", tone)} aria-hidden />
      </div>
      <p className={cn("mt-1.5 font-mono text-2xl font-semibold tabular-nums", tone)}>{count}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all duration-500", bar)} style={{ width: `${(count / total) * 100}%` }} />
      </div>
    </button>
  );
}

/* ── desktop table row ────────────────────────────────────────────────────── */

function JobRow({ job }: { job: JobListItem }) {
  return (
    <tr className="group relative border-b transition-colors last:border-0 hover:bg-accent/40">
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
        <StatusBadge status={job.status} safetyFlag={job.safety_flag} />
      </td>
      <td className="px-4 py-3">
        <div className="flex w-32 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            {typeof job.readiness_score === "number" && (
              <div
                className={cn(
                  "qr-bar-fill h-full rounded-full",
                  job.readiness_score >= 70 ? "bg-success" : job.readiness_score >= 40 ? "bg-inspect" : "bg-warning",
                )}
                style={{ width: `${job.readiness_score}%` }}
              />
            )}
          </div>
          <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {typeof job.readiness_score === "number" ? `${job.readiness_score}%` : "—"}
          </span>
        </div>
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