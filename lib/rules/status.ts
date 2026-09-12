import type { JobStatus, ScopePack } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Status model. Only human user actions can move a job into
 * follow_up_approved / inspection_requested / closed — never an LLM.
 * ──────────────────────────────────────────────────────────────────────────── */

export function deriveAnalysisStatus(scope: ScopePack): JobStatus {
  // Safety is an overlay flag, not a terminal state — the band status stands.
  return scope.readiness_band;
}

const USER_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new: [],
  analysed: [],
  needs_information: ["follow_up_drafted", "closed"],
  inspection_recommended: ["follow_up_drafted", "inspection_requested", "closed"],
  ready_for_estimate: ["follow_up_drafted", "closed"],
  follow_up_drafted: ["follow_up_approved", "closed"],
  follow_up_approved: ["closed"],
  inspection_requested: ["closed"],
  closed: [],
};

const BAND_STATUSES: JobStatus[] = [
  "needs_information",
  "inspection_recommended",
  "ready_for_estimate",
];

export function canTransition(
  from: JobStatus,
  to: JobStatus,
  actor: "user" | "ai" | "system",
): boolean {
  if (actor === "user") {
    return USER_TRANSITIONS[from]?.includes(to) ?? false;
  }
  // ai/system may only re-run analysis: any analysed-ish state → a band status
  if (to === "new" || to === "closed") return false;
  if (!BAND_STATUSES.includes(to)) return false;
  return from !== "new" && from !== "closed";
}

export function statusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    new: "New enquiry",
    analysed: "Analysed",
    needs_information: "Needs information",
    inspection_recommended: "Inspection recommended",
    ready_for_estimate: "Ready for estimate",
    follow_up_drafted: "Follow-up drafted",
    follow_up_approved: "Follow-up approved",
    inspection_requested: "Inspection requested",
    closed: "Closed",
  };
  return labels[status];
}
