import type { Metadata } from "next";
import Link from "next/link";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { displayRef, suburbParts } from "@/lib/ui/triage";
import { initials, relativeTime, titleCase } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const details = await Promise.all(jobs.map((j) => store.getJob(j.id)));

  const messages = details
    .flatMap((job) =>
      (job?.drafts ?? []).map((d) => ({
        draft: d,
        job: job!,
      })),
    )
    .sort((a, b) => b.draft.created_at.localeCompare(a.draft.created_at));

  const pending = messages.filter((m) => m.draft.status === "draft").length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              chat_bubble
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Customer follow-ups
              </h1>
              {pending > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {pending} awaiting approval
                </span>
              )}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Every draft is prepared by QuoteReady and approved by hand — nothing is sent
              automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-5 font-label-sm" scope="col">
                  Customer
                </th>
                <th className="py-3 px-4 font-label-sm min-w-[280px]" scope="col">
                  Follow-up
                </th>
                <th className="py-3 px-4 font-label-sm" scope="col">
                  Type
                </th>
                <th className="py-3 px-4 font-label-sm" scope="col">
                  Status
                </th>
                <th className="py-3 px-4 font-label-sm whitespace-nowrap" scope="col">
                  Created
                </th>
                <th className="py-3 px-5 text-right font-label-sm" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map(({ draft, job }) => {
                const { name } = suburbParts(job.customer.suburb);
                return (
                  <tr key={draft.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-4 px-5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary-container/40 text-on-secondary-container flex items-center justify-center font-label-md text-label-md flex-shrink-0">
                          {initials(job.customer.full_name)}
                        </div>
                        <div>
                          <div className="font-label-lg text-label-lg text-on-surface">
                            {job.customer.full_name}
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">
                            {name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="font-body-md text-body-md text-on-surface font-medium line-clamp-2 max-w-[420px]">
                        {draft.body.split("\n").filter(Boolean)[0]}
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Requests {draft.requests_fields.length || "no"} field
                        {draft.requests_fields.length === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top whitespace-nowrap font-body-md text-body-md text-on-surface">
                      {titleCase(draft.message_type)}
                    </td>
                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      {draft.status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">
                            mark_email_read
                          </span>
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">
                            mark_email_unread
                          </span>
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top whitespace-nowrap font-data-mono text-body-sm text-on-surface-variant">
                      {relativeTime(draft.created_at)}
                    </td>
                    <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-all"
                      >
                        <span>Review follow-up</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {messages.length === 0 && (
                <tr>
                  <td className="py-12 px-5 text-center" colSpan={6}>
                    <span className="material-symbols-outlined text-[32px] text-outline block mb-2">
                      chat_bubble
                    </span>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      No follow-ups drafted yet. Open a job and choose “Draft customer follow-up”.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container-low flex items-center justify-between gap-3 text-on-surface-variant font-body-sm text-body-sm">
          <span>
            {messages.length} message{messages.length === 1 ? "" : "s"} across{" "}
            {new Set(messages.map((m) => m.job.id)).size} job
            {new Set(messages.map((m) => m.job.id)).size === 1 ? "" : "s"}
          </span>
          {messages.length > 0 && (
            <span className="font-data-mono text-label-sm">
              Job refs: {displayRef(messages[0]!.job.id)}
            </span>
          )}
        </div>
      </div>

      {/* Guarantee callout */}
      <div className="flex items-center justify-center p-4 rounded-xl bg-surface-container-low text-center">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>
            <strong>Tradie verified:</strong> Approving a follow-up only records the decision —
            QuoteReady never sends messages on your behalf.
          </span>
        </div>
      </div>
    </div>
  );
}
