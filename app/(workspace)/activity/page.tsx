import type { Metadata } from "next";
import Link from "next/link";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { relativeTime, titleCase } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const details = await Promise.all(jobs.map((j) => store.getJob(j.id)));

  const events = details
    .flatMap((job) => (job?.audit_events ?? []).map((e) => ({ event: e, job: job! })))
    .sort((a, b) => b.event.created_at.localeCompare(a.event.created_at));

  const ActorIcon = {
    user: "person",
    ai: "auto_awesome",
    system: "settings_suggest",
  } as const;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              history
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Workspace activity</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              The immutable audit trail — every enquiry, analysis, draft approval and sign-off.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high font-data-mono text-label-sm text-on-surface-variant">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
        {events.length === 0 ? (
          <p className="py-10 text-center font-body-md text-body-md text-on-surface-variant">
            No activity recorded yet.
          </p>
        ) : (
          <div className="relative pl-6 flex flex-col gap-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
            {events.map(({ event, job }) => (
              <div key={`${job.id}-${event.id}`} className="relative flex items-start justify-between gap-4">
                <span
                  className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-lowest ${
                    event.actor_type === "ai"
                      ? "bg-primary"
                      : event.actor_type === "user"
                        ? "bg-secondary"
                        : "bg-outline-variant"
                  }`}
                ></span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-outline">
                      {ActorIcon[event.actor_type]}
                    </span>
                    {titleCase(event.event_type)}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {event.summary}
                  </span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-label-sm text-label-sm text-primary hover:underline mt-0.5 w-fit"
                  >
                    {job.customer.full_name} · {event.actor_type} event
                  </Link>
                </div>
                <span className="font-data-mono text-body-sm text-on-surface-variant whitespace-nowrap">
                  {relativeTime(event.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guarantee callout */}
      <div className="flex items-center justify-center p-4 rounded-xl bg-surface-container-low text-center">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>
            <strong>Plumber verified:</strong> Every event is attributed to its actor — AI actions
            can never approve pricing or customer messages.
          </span>
        </div>
      </div>
    </div>
  );
}
