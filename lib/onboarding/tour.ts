/* ────────────────────────────────────────────────────────────────────────────
 * Interactive onboarding tour — the guided first-run walkthrough.
 *
 * A newly signed-up user lands on an empty workspace, so instead of seeding
 * demo data we walk them through creating their own first enquiry (pre-filled),
 * then show voice notes, evidence and templates. Every step highlights a real
 * element via a `data-tour` attribute and is skippable at any point.
 * ──────────────────────────────────────────────────────────────────────────── */

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  /** Route to visit for this step; `:jobId` is resolved from the tour state. */
  route?: string;
  /** Value of the `data-tour` attribute to spotlight. Omit for a centred card. */
  target?: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** Advance when the user actually clicks the highlighted element. */
  advanceOnClick?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your workspace",
    body: "This is a 60-second interactive tour. We'll actually create your first enquiry together — you'll see every screen for real, and you can skip at any time.",
    placement: "center",
  },
  {
    id: "start-enquiry",
    route: "/dashboard",
    target: "new-enquiry",
    title: "Create your first enquiry",
    body: "Click the highlighted “New enquiry” button. We've pre-filled a realistic example so you only need to click through — nothing is sent to a customer.",
    placement: "bottom",
    advanceOnClick: true,
  },
  {
    id: "form-details",
    route: "/jobs/new?tour=1",
    target: "enquiry-details",
    title: "1 · Customer & job details",
    body: "This is where an enquiry starts. We've filled in the customer, suburb, job type and the customer's own words — exactly as you'd paste them from an SMS or web form.",
    placement: "right",
  },
  {
    id: "form-evidence",
    route: "/jobs/new?tour=1",
    target: "enquiry-evidence",
    title: "2 · Evidence & site media",
    body: "Add photos, or record a voice note and let QuoteReady transcribe it and fill the job details for you. Evidence is what makes a scope reliable.",
    placement: "top",
  },
  {
    id: "form-voice",
    route: "/jobs/new?tour=1",
    target: "enquiry-voice",
    title: "3 · Voice-first intake",
    body: "Tap here to record. The recording is transcribed, then Gemini places the details into the right fields — fixture, access, urgency and notes.",
    placement: "bottom",
  },
  {
    id: "form-submit",
    route: "/jobs/new?tour=1",
    target: "enquiry-submit",
    title: "4 · Analyse the enquiry",
    body: "Click “Analyse enquiry” to run the scope pipeline. QuoteReady extracts the facts, scores readiness and flags what's still missing before any price is given.",
    placement: "top",
    advanceOnClick: true,
  },
  {
    id: "readiness",
    route: "/jobs/:jobId",
    target: "scope-readiness",
    title: "Your scope readiness score",
    body: "This score is calculated by rules — not the AI. It shows exactly which details, evidence and access notes are missing before a fixed estimate is safe.",
    placement: "left",
  },
  {
    id: "voice-note",
    route: "/jobs/:jobId",
    target: "record-site-note",
    title: "Record a site voice note",
    body: "In the field, tap record and speak for 20 seconds. The audio is transcribed and folded into the scope as evidence — you review the changes before they apply.",
    placement: "top",
  },
  {
    id: "add-evidence",
    route: "/jobs/:jobId",
    target: "add-evidence",
    title: "Add evidence at any stage",
    body: "Enquiries are never frozen. Add more photos, notes or voice memos as the customer replies — QuoteReady re-runs the analysis into a new scope version.",
    placement: "top",
  },
  {
    id: "templates",
    route: "/templates",
    target: "templates-list",
    title: "Create your own templates",
    body: "Templates define what a job type needs before it's quotable: required details, inspection triggers, assumptions and exclusions. Tailor them to how you actually work.",
    placement: "top",
  },
  {
    id: "done",
    title: "You're all set",
    body: "That's the full loop: enquiry → analysed scope → evidence → template-backed estimate. You can replay this tour any time from Settings.",
    placement: "center",
  },
];

const PENDING_KEY = "qr-tour-pending";
const STEP_KEY = "qr-tour-step";
const JOB_KEY = "qr-tour-job";

export function requestTour(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, "1");
  window.localStorage.removeItem(STEP_KEY);
  window.localStorage.removeItem(JOB_KEY);
}

export function isTourPending(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PENDING_KEY) === "1";
}

export function readTourStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = Number(window.localStorage.getItem(STEP_KEY) ?? "0");
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

export function writeTourStep(step: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STEP_KEY, String(step));
}

export function setTourJobId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOB_KEY, id);
}

export function readTourJobId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(JOB_KEY);
}

export function finishTour(completed: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
  window.localStorage.removeItem(STEP_KEY);
  window.localStorage.removeItem(JOB_KEY);
  window.localStorage.setItem("qr-tour-completed", completed ? "1" : "0");
}

/** Resolve `:jobId` placeholders in a step route. */
export function resolveTourRoute(route: string, jobId: string | null): string {
  return route.replace(":jobId", jobId ?? "");
}
