import type { JobListItem } from "@/lib/data/types";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import type { JobStatus } from "@/lib/ai/schemas";
import { initials, relativeTime, titleCase } from "@/lib/utils/format";

/* ────────────────────────────────────────────────────────────────────────────
 * Triage mapping — turns store rows into the dashboard/table view model used
 * by the triage design (badges, readiness tones, chips, relative times).
 * ──────────────────────────────────────────────────────────────────────────── */

export type Tone = "primary" | "secondary" | "error" | "neutral";

export interface TriageRow {
  id: string;
  initials: string;
  name: string;
  phone: string;
  title: string;
  chips: Array<{ icon: string; label: string; tone?: "error" }>;
  suburb: string;
  postcode: string;
  readiness: number;
  readinessTone: Tone;
  progressTone: string;
  hint: string;
  hintTone: "default" | "error";
  statusLabel: string;
  statusIcon: string;
  statusPill: string;
  actionButton: string;
  updatedAt: string;
  updatedAtMs: number;
}

/** Deterministic short reference derived from a job id (e.g. JOB-2024-089). */
export function displayRef(id: string, prefix = "JOB"): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String((hash % 900) + 100)}`;
}

export function jobTitle(job: Pick<JobListItem, "enquiry_text" | "job_type">): string {
  const text = (job.enquiry_text ?? "").trim();
  if (text) {
    const first = text.split(/(?<=[.!?])\s/)[0]!.replace(/[.]$/, "");
    if (first.length >= 8) return first.length > 120 ? `${first.slice(0, 117)}…` : first;
  }
  return JOB_TYPE_LABELS[job.job_type];
}

export function suburbParts(suburb: string | null | undefined): {
  name: string;
  postcode: string;
} {
  const s = (suburb ?? "").trim();
  if (!s) return { name: "—", postcode: "VIC" };
  const m = s.match(/^(.*?),?\s*(VIC\s*\d{4})$/i);
  if (m) {
    return { name: m[1]!.trim() || s, postcode: m[2]!.replace(/^VIC\s*/i, "VIC ") };
  }
  const pc = s.match(/\b(\d{4})\b/);
  if (pc) {
    return { name: s.replace(pc[0], "").replace(/[,\s]+$/, "").trim(), postcode: pc[0] };
  }
  return { name: s, postcode: "" };
}

export function readinessTone(score: number | null | undefined): Tone {
  if (typeof score !== "number") return "neutral";
  if (score < 40) return "error";
  if (score < 70) return "secondary";
  return "primary";
}

const TONE_TEXT: Record<Tone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  error: "text-error",
  neutral: "text-on-surface-variant",
};

const TONE_BAR: Record<Tone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  error: "bg-error",
  neutral: "bg-surface-container-highest",
};

export interface StatusBadgeView {
  label: string;
  icon: string;
  pill: string;
  action: string;
  tone: Tone;
}

export function statusBadge(
  status: JobStatus,
  safety?: boolean | null,
): StatusBadgeView {
  if (safety) {
    return {
      label: "Attention required",
      icon: "warning",
      tone: "error",
      pill: "bg-error-container/60 text-on-error-container",
      action: "hover:bg-error hover:text-on-error",
    };
  }
  switch (status) {
    case "needs_information":
      return {
        label: "Needs information",
        icon: "warning",
        tone: "error",
        pill: "bg-error-container/60 text-on-error-container",
        action: "hover:bg-error hover:text-on-error",
      };
    case "inspection_recommended":
      return {
        label: "Inspection recommended",
        icon: "build",
        tone: "secondary",
        pill: "bg-secondary-container/50 text-on-secondary-container",
        action: "hover:bg-primary hover:text-on-primary",
      };
    case "ready_for_estimate":
      return {
        label: "Ready for estimate",
        icon: "check_circle",
        tone: "primary",
        pill: "bg-primary-container/20 text-primary",
        action: "bg-primary text-on-primary shadow-xs hover:bg-primary/90",
      };
    case "follow_up_drafted":
      return {
        label: "Follow-up drafted",
        icon: "mark_email_unread",
        tone: "secondary",
        pill: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        action: "hover:bg-primary hover:text-on-primary",
      };
    case "follow_up_approved":
      return {
        label: "Follow-up approved",
        icon: "mark_email_read",
        tone: "primary",
        pill: "bg-surface-container-high text-on-surface-variant",
        action: "hover:bg-primary hover:text-on-primary",
      };
    case "inspection_requested":
      return {
        label: "Inspection requested",
        icon: "calendar_month",
        tone: "secondary",
        pill: "bg-surface-container-high text-on-surface-variant",
        action: "hover:bg-primary hover:text-on-primary",
      };
    case "closed":
      return {
        label: "Closed",
        icon: "check",
        tone: "neutral",
        pill: "bg-surface-container-high text-on-surface-variant",
        action: "hover:bg-primary hover:text-on-primary",
      };
    default:
      return {
        label: "New enquiry",
        icon: "inbox",
        tone: "secondary",
        pill: "bg-surface-container-high text-on-surface-variant",
        action: "hover:bg-primary hover:text-on-primary",
      };
  }
}

const SYMPTOM_LABELS: Record<string, { icon: string; label: string }> = {
  continuous_drip: { icon: "water_drop", label: "Continuous drip" },
  leak_observed: { icon: "water_drop", label: "Leak observed" },
  no_hot_water: { icon: "local_fire_department", label: "No hot water" },
  tank_leak: { icon: "warning", label: "Tank leaking", },
  low_water_temperature: { icon: "device_thermostat", label: "Lukewarm water" },
  blockage: { icon: "warning", label: "Blockage reported" },
  running_water: { icon: "water_drop", label: "Running water" },
  replacement_requested: { icon: "build", label: "Replacement requested" },
  broken_flush_button: { icon: "build", label: "Broken flush button" },
  leak: { icon: "water_drop", label: "Leak reported" },
};

export function toTriageRow(job: JobListItem): TriageRow {
  const badge = statusBadge(job.status, job.safety_flag);
  const readiness = typeof job.readiness_score === "number" ? job.readiness_score : 0;
  const tone = readinessTone(job.readiness_score);
  const { name: suburbName, postcode } = suburbParts(job.suburb);
  const chips: TriageRow["chips"] = [];
  const photos = job.photo_count ?? 0;
  if (photos > 0) {
    chips.push({ icon: "photo_camera", label: `${photos} photo${photos === 1 ? "" : "s"}` });
  }
  if ((job.voice_note_count ?? 0) > 0) {
    chips.push({ icon: "mic", label: `${job.voice_note_count} voice memo` });
  }
  const symptomKeys = ["blockage", "no_hot_water", "tank_leak"];
  if (job.safety_flag) {
    chips.push({ icon: "emergency", label: "Urgent safety attention", tone: "error" });
  } else {
    const note = job.enquiry_text?.toLowerCase() ?? "";
    if (note.includes("pooling")) chips.push({ icon: "water_drop", label: "Driveway pooling" });
    else if (note.includes("cartridge")) chips.push({ icon: "build", label: "Cartridge suspect" });
    else if (note.includes("dishwasher")) chips.push({ icon: "check", label: "Standard underbench access" });
    else {
      const key = symptomKeys.find((k) => note.includes(k.replace(/_/g, " ")));
      if (key) chips.push(SYMPTOM_LABELS[key]!);
    }
  }

  const ready = job.status === "ready_for_estimate";
  const finalTone: Tone = job.safety_flag ? "error" : tone;
  return {
    id: job.id,
    initials: initials(job.customer.full_name),
    name: job.customer.full_name,
    phone: job.phone ?? "—",
    title: jobTitle(job),
    chips,
    suburb: suburbName,
    postcode,
    readiness,
    readinessTone: finalTone,
    progressTone: TONE_BAR[finalTone],
    hint: ready
      ? (job.ready_note ?? "All required details captured")
      : (job.missing_hint ?? "Awaiting analysis"),
    hintTone: tone === "error" ? "error" : "default",
    statusLabel: badge.label,
    statusIcon: badge.icon,
    statusPill: badge.pill,
    actionButton: badge.action,
    updatedAt: relativeTime(job.updated_at),
    updatedAtMs: new Date(job.updated_at).getTime(),
  };
}

export function factLabel(key: string): string {
  return titleCase(key);
}
