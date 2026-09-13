"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RecordSiteNoteModal } from "@/components/jobs/record-site-note-modal";
import type { TriageRow } from "@/lib/ui/triage";
import { displayRef } from "@/lib/ui/triage";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

type TabKey = "all" | "needs_info" | "inspection" | "ready";

/**
 * Triage dashboard — transcribed 1:1 from the triage dashboard design.
 * All counts, rows, filters, search, sort and pagination run on live data.
 */
export function TriageDashboard({
  greeting,
  region,
  rows,
  counts,
  totalActive,
  voiceJobId,
  emptyState = false,
  variant = "overview",
}: {
  greeting: string;
  region?: string | null;
  rows: TriageRow[];
  counts: { needsInfo: number; inspection: number; ready: number };
  totalActive: number;
  voiceJobId: string | null;
  emptyState?: boolean;
  variant?: "overview" | "jobs";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [suburb, setSuburb] = useState("All Suburbs");
  const [sort, setSort] = useState<"updated" | "readiness" | "urgency">("updated");
  const [page, setPage] = useState(1);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const suburbs = useMemo(
    () => Array.from(new Set(rows.map((r) => r.suburb).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let out = rows;
    if (tab === "needs_info")
      out = out.filter(
        (r) => r.statusLabel === "Needs information" || r.statusLabel === "Attention required",
      );
    if (tab === "inspection") out = out.filter((r) => r.statusLabel === "Inspection recommended");
    if (tab === "ready") out = out.filter((r) => r.statusLabel === "Ready for estimate");
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.suburb.toLowerCase().includes(q),
      );
    }
    if (suburb !== "All Suburbs") out = out.filter((r) => r.suburb === suburb);
    if (sort === "readiness") out = [...out].sort((a, b) => b.readiness - a.readiness);
    else if (sort === "urgency") out = [...out].sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    else out = [...out].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return out;
  }, [rows, tab, search, suburb, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function tabClasses(active: boolean) {
    return cn(
      "px-3 py-1.5 rounded-md font-label-md text-label-md transition-colors whitespace-nowrap",
      active
        ? "bg-surface-container-lowest text-on-surface shadow-xs"
        : "text-on-surface-variant hover:text-on-surface",
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Greeting Header */}
      {variant === "overview" && (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              handshake
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{greeting}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                On Duty
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Here&apos;s what needs attention before your next quote.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {region && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-[18px]">near_me</span>
              <span className="font-label-md text-label-md text-on-surface">{region}</span>
            </div>
          )}
          <button
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container-low transition-colors"
            type="button"
            onClick={() => setVoiceOpen(true)}
            disabled={!voiceJobId}
          >
            <span className="material-symbols-outlined text-tertiary text-[20px]">mic</span>
            <span>Import voice note</span>
          </button>
          <Link
            data-tour="new-enquiry"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all"
            href="/jobs/new"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New enquiry</span>
          </Link>
        </div>
      </div>
      )}

      {/* Triage Status Overview Cards */}
      {variant === "overview" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Needs Information */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface-variant">
                Needs information
              </span>
              <div className="w-10 h-10 rounded-full bg-error-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-[22px]">warning</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-lg text-display-lg text-error">
                {counts.needsInfo}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">jobs</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Missing photos, fixture model, or access clearance
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-error-container/60 text-on-error-container font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              Awaiting follow-up or re-analysis
            </span>
          </div>
        </div>
        {/* Card 2: Inspection Recommended */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface-variant">
                Inspection recommended
              </span>
              <div className="w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  build_circle
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-lg text-display-lg text-secondary">
                {counts.inspection}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">jobs</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              High risk of concealed pipework or sub-floor access issues
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container/50 text-on-secondary-container font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">home_repair_service</span>
              Requires on-site assessment
            </span>
          </div>
        </div>
        {/* Card 3: Ready for Estimate */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface-variant">
                Ready for estimate
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  verified
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-lg text-display-lg text-primary">
                {counts.ready}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">jobs</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              All critical photos, dimensions &amp; scope items validated
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center gap-2">              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">check</span>
              Ready for your review &amp; approval
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Today's Triage Insight Card (demo workspace only) */}
      {variant === "overview" && !emptyState && (
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-secondary-container/50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              lightbulb
            </span>
          </div>
          <div>
            <span className="font-label-lg text-label-lg text-on-surface">
              Today’s triage insight
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Most incomplete enquiries are missing fixture details and access photos. Requesting
              clear photos upfront has reduced preliminary site visit times by 38% this month.
            </p>
          </div>
        </div>
        <Link
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-secondary hover:bg-surface-container-high transition-colors flex-shrink-0"
          href="/templates"
        >
          <span>Review intake checklist</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
      )}

      {/* Jobs Needing Attention Main Section */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Bar */}
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Jobs needing attention
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high font-data-mono text-label-sm text-on-surface-variant">
                {totalActive} total active enquiries
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Review operational scopes and verify site inputs before issuing estimates
            </p>
          </div>
          {/* Filter Segment Bar */}
          <div className="flex items-center p-1 rounded-lg bg-surface-container-low text-on-surface-variant overflow-x-auto max-w-full">
            <button className={tabClasses(tab === "all")} onClick={() => { setTab("all"); setPage(1); }} type="button">
              All ({totalActive})
            </button>
            <button className={tabClasses(tab === "needs_info")} onClick={() => { setTab("needs_info"); setPage(1); }} type="button">
              Needs info ({counts.needsInfo})
            </button>
            <button className={tabClasses(tab === "inspection")} onClick={() => { setTab("inspection"); setPage(1); }} type="button">
              Inspection ({counts.inspection})
            </button>
            <button className={tabClasses(tab === "ready")} onClick={() => { setTab("ready"); setPage(1); }} type="button">
              Ready for estimate ({counts.ready})
            </button>
          </div>
        </div>
        {/* Search & Filtering Tools Row */}
        <div className="px-5 py-3 bg-surface-container-low/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                placeholder="Filter by customer, phone or fixture..."
                type="text"
              />
            </div>
            <div className="relative">
              <select
                value={suburb}
                onChange={(e) => { setSuburb(e.target.value); setPage(1); }}
                className="h-9 pl-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md appearance-none focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              >
                <option>All Suburbs</option>
                {suburbs.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-2 text-outline pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-9 pl-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md appearance-none focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              >
                <option value="updated">Sort: Last updated</option>
                <option value="readiness">Sort: Readiness high-to-low</option>
                <option value="urgency">Sort: Urgency (Oldest first)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-2 text-outline pointer-events-none text-[18px]">
                sort
              </span>
            </div>
          </div>
          <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>
              Showing {pageRows.length} of {filtered.length} records
            </span>
          </div>
        </div>
        {/* Data Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-5 font-label-sm" scope="col">
                  Customer &amp; Contact
                </th>
                <th className="py-3 px-4 font-label-sm min-w-[280px]" scope="col">
                  Plumbing Issue &amp; Scope Details
                </th>
                <th className="py-3 px-4 font-label-sm" scope="col">
                  Location
                </th>
                <th className="py-3 px-4 font-label-sm min-w-[220px]" scope="col">
                  Scope Readiness
                </th>
                <th className="py-3 px-4 font-label-sm" scope="col">
                  Triage Status
                </th>
                <th className="py-3 px-4 font-label-sm whitespace-nowrap" scope="col">
                  Last Updated
                </th>
                <th className="py-3 px-5 text-right font-label-sm" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {pageRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-container-low/40 transition-colors group"
                >
                  <td className="py-4 px-5 align-top">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md flex-shrink-0",
                          idx % 2 === 0
                            ? "bg-secondary-container/40 text-on-secondary-container"
                            : "bg-primary-container/20 text-primary",
                        )}
                      >
                        {row.initials}
                      </div>
                      <div>
                        <div className="font-label-lg text-label-lg text-on-surface">{row.name}</div>
                        <div className="font-data-mono text-body-sm text-on-surface-variant">
                          {row.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="font-body-md text-body-md text-on-surface font-medium">
                      {row.title}
                    </div>
                    {row.chips.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        {row.chips.map((chip) => (
                          <span
                            key={chip.label}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-label-sm text-label-sm",
                              chip.tone === "error"
                                ? "bg-error-container/40 text-on-error-container"
                                : "bg-surface-container-low text-on-surface-variant",
                            )}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {chip.icon}
                            </span>
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <div className="font-body-md text-body-md text-on-surface">{row.suburb}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {row.postcode}
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="text-on-surface-variant">Scope completeness</span>
                        <span className={cn("font-data-mono font-semibold", {
                          "text-secondary": row.readinessTone === "secondary",
                          "text-primary": row.readinessTone === "primary",
                          "text-error": row.readinessTone === "error",
                          "text-on-surface-variant": row.readinessTone === "neutral",
                        })}>
                          {row.readiness}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", row.progressTone)}
                          style={{ width: `${row.readiness}%` }}
                        ></div>
                      </div>
                      <span
                        className={cn(
                          "font-body-sm text-body-sm line-clamp-1",
                          row.hintTone === "error" ? "text-error" : "text-on-surface-variant",
                        )}
                      >
                        {row.hintTone === "error" ? "Missing " : ""}
                        {row.hint.toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium",
                        row.statusPill,
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {row.statusIcon}
                      </span>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="py-4 px-4 align-top whitespace-nowrap font-data-mono text-body-sm text-on-surface-variant">
                    {row.updatedAt}
                  </td>
                  <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                    <Link
                      href={`/jobs/${row.id}`}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md transition-all",
                        row.actionButton,
                      )}
                    >
                      <span>Review scope</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td className="py-10 px-5 text-center" colSpan={7}>
                    {totalActive === 0 && emptyState ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[26px]">
                            inbox
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-headline-sm text-headline-sm text-on-surface">
                            No enquiries yet
                          </span>
                          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                            Your workspace is empty. Create your first enquiry — QuoteReady analyses
                            it and tells you what is still needed before a fixed estimate.
                          </p>
                        </div>
                        <Link
                          href="/jobs/new"
                          data-tour="new-enquiry"
                          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">add</span>
                          <span>New enquiry</span>
                        </Link>
                      </div>
                    ) : (
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        No enquiries match these filters.
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination / Bottom Status Bar */}
        <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-on-surface-variant">
          <div className="flex items-center gap-2 font-body-sm text-body-sm">
            <span>
              Displaying page {safePage} of {pages}
            </span>
            <span className="text-outline">•</span>
            <span>
              {Math.max(0, totalActive - PAGE_SIZE)} additional enquiries waiting in triage backlog
            </span>
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              className="px-2.5 py-1.5 rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-xs disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-surface-container-high"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={cn(
                  "px-2.5 py-1.5 rounded font-label-md text-label-md shadow-xs",
                  p === safePage
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high",
                )}
                onClick={() => setPage(p)}
                type="button"
              >
                {p}
              </button>
            ))}
            <button
              className="px-2.5 py-1.5 rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-xs disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-surface-container-high"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={safePage >= pages}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Tradie Review Guarantee Callout Footer */}
      <div className="flex items-center justify-center p-4 rounded-xl bg-surface-container-low text-center">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>
            <strong>Tradie verified:</strong> All job scopes and customer enquiries require tradie
            review and owner sign-off before quotes are generated.
          </span>
        </div>
      </div>

      {/* Import voice note → record-site-note modal for the newest job */}
      {voiceOpen && voiceJobId && (
        <RecordSiteNoteModal
          jobId={voiceJobId}
          jobRef={displayRef(voiceJobId)}
          onClose={() => setVoiceOpen(false)}
          onApplied={(id) => {
            setVoiceOpen(false);
            router.push(`/jobs/${id}?applied=1`);
          }}
        />
      )}
    </div>
  );
}
