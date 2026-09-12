import type { Metadata } from "next";
import Link from "next/link";
import { ensureSeeded, store } from "@/lib/data/jobs";
import { JobCard } from "@/components/dashboard/job-card";
import { EmptyJobs } from "@/components/dashboard/empty-jobs";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All jobs" },
  { key: "needs_information", label: "Needs info" },
  { key: "inspection_recommended", label: "Inspection" },
  { key: "ready_for_estimate", label: "Ready" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const filter = (await searchParams).filter as string | undefined;
  const active = FILTERS.some((f) => f.key === filter) ? filter : "all";
  const filtered =
    active === "all"
      ? jobs
      : jobs.filter((j) =>
          active === "ready_for_estimate"
            ? j.status === "ready_for_estimate"
            : j.status === active,
        );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {jobs.length} enquir{jobs.length === 1 ? "y" : "ies"} ·{" "}
            {jobs.filter((j) => j.safety_flag).length} with safety attention
          </p>
        </div>
        <nav aria-label="Status filters" className="flex rounded-md border bg-card p-0.5 text-sm shadow-xs">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/dashboard" : `/dashboard?filter=${f.key}`}
              scroll={false}
              aria-current={active === f.key ? "page" : undefined}
              className={`rounded-[5px] px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60 ${
                active === f.key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyJobs />
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}
