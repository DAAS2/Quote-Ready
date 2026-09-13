import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/lib/data/jobs";
import { JobDetailView } from "@/components/jobs/job-detail-view";
import { QuotePanel } from "@/components/quotes/quote-panel";
import type { DraftRow, JobDetail } from "@/lib/data/types";
import type { ScopePack } from "@/lib/ai/schemas";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import { displayRef, jobTitle, suburbParts, statusBadge, readinessTone } from "@/lib/ui/triage";
import { initials, relativeTime, titleCase } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Job detail" };
export const dynamic = "force-dynamic";

function clock(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d
    .toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/([ap])m/i, (m) => m.toUpperCase());
  if (sameDay) return time;
  return `${d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}, ${time}`;
}

function createdLine(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d
    .toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/([ap])m/i, (m) => m.toUpperCase());
  return sameDay
    ? `Created today at ${time}`
    : `Created ${relativeTime(iso)} on ${d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} at ${time}`;
}

const MISSING_ICONS: Record<string, string> = {
  fixture_type: "help_outline",
  water_isolation_access: "valve",
  water_damage: "water_damage",
  property_access: "directions_car",
  customer_availability: "event",
  location_in_property: "location_on",
  system_type: "local_fire_department",
  system_age: "history",
  symptoms: "troubleshoot",
  urgency: "schedule",
  photo_access: "camera_enhance",
};

const FACT_LABELS: Record<string, string> = {
  location_in_property: "Fixture Location",
  fixture_type: "Fixture Type",
  system_type: "System Type",
  system_age: "System Age",
  water_isolation_access: "Water Isolation",
  water_damage: "Water Damage",
  customer_availability: "Customer Availability",
  property_access: "Property Access",
  urgency: "Urgency",
  symptoms: "Primary Issue",
};

function humanValue(v: unknown): string {
  if (typeof v === "number") return v === 1 ? "1 photo uploaded & verified" : `${v} photos uploaded & verified`;
  if (Array.isArray(v)) {
    const arr = v.map((x) => titleCase(String(x)));
    return arr.length > 0 ? arr[0]! : "—";
  }
  const s = String(v);
  if (s === "none_visible") return "No visible water damage";
  if (s === "accessible") return "Accessible";
  if (s === "constrained") return "Constrained";
  return titleCase(s);
}

const FACT_ORDER = [
  "location_in_property",
  "fixture_type",
  "system_type",
  "symptoms",
  "water_isolation_access",
  "water_damage",
  "customer_availability",
  "property_access",
  "urgency",
  "system_age",
];

function buildKnownFacts(job: JobDetail, scope: ScopePack | null) {
  const rows: Array<{ label: string; value: string; wide?: boolean }> = [];
  const known = scope?.known_facts ?? {};
  for (const key of FACT_ORDER) {
    if (key === "symptoms") {
      const symptoms = (known[key] as string[] | undefined) ?? [];
      if (symptoms.length > 0) {
        rows.push({ label: "Primary Issue", value: humanValue(symptoms[0]) });
      }
      continue;
    }
    if (key in known) {
      const label = FACT_LABELS[key] ?? titleCase(key);
      const value = humanValue(known[key]);
      if (label === "Urgency" && rows.some((r) => r.label === "Urgency")) continue;
      rows.push({ label, value });
    }
  }
  if (known.photo_count) {
    rows.push({ label: "Site Evidence", value: humanValue(known.photo_count) });
  }
  const { name, postcode } = suburbParts(job.customer.suburb);
  if (name !== "—") {
    rows.push({
      label: "Service Suburb",
      value: `${name}${postcode ? `, ${postcode}` : ""} (Melbourne North Region)`,
      wide: true,
    });
  }
  return rows.slice(0, 6);
}

function buildEvidenceTimeline(job: JobDetail) {
  const events = [...job.audit_events].reverse().slice(0, 4);
  return events.map((e) => ({
    id: e.id,
    title:
      e.event_type === "enquiry_received"
        ? "Customer enquiry submitted"
        : e.event_type === "analysis_completed"
          ? "AI intake readiness analysis"
          : e.event_type === "evidence_added"
            ? "Evidence added by operator"
            : e.event_type === "voice_note_applied"
              ? "Site note applied to scope"
              : titleCase(e.event_type),
    sub:
      e.event_type === "enquiry_received"
        ? `${job.customer.full_name.split(" ")[0]} filled the residential intake form`
        : e.summary,
    time: clock(e.created_at),
    tone: e.actor_type === "ai" ? ("primary" as const) : ("secondary" as const),
  }));
}

function buildDiffRows(prev: ScopePack | null, current: ScopePack) {
  const rows: Array<{
    param: string;
    before: string;
    after: string;
    pill?: string;
    pillTone: "primary" | "amber" | "error";
    afterTone: "default" | "amber" | "error";
  }> = [];
  const prevKnown = prev?.known_facts ?? {};

  const fixture = current.known_facts.fixture_type;
  rows.push({
    param: "Fixture type",
    before: prevKnown.fixture_type ? humanValue(prevKnown.fixture_type) : "Unknown",
    after: fixture ? humanValue(fixture) : "Not identified on site",
    pill: fixture ? "Identified in note" : undefined,
    pillTone: "primary",
    afterTone: "default",
  });

  const iso = current.known_facts.water_isolation_access;
  rows.push({
    param: "Isolation access",
    before: prevKnown.water_isolation_access ? humanValue(prevKnown.water_isolation_access) : "Unknown",
    after: iso ? humanValue(iso) : "Not reported",
    pill: iso === "accessible" ? "Mini-stops turn freely" : iso ? "Access recorded" : undefined,
    pillTone: "primary",
    afterTone: "default",
  });

  const dmg = current.facts.water_damage;
  rows.push({
    param: "Cabinet condition",
    before:
      prevKnown.water_damage && prevKnown.water_damage !== "none_visible"
        ? humanValue(prevKnown.water_damage)
        : "Unknown / Not reported",
    after:
      dmg === "possible"
        ? "Damp / Swelling"
        : dmg === "confirmed"
          ? "Water damage confirmed"
          : dmg === "none_visible"
            ? "Dry on inspection"
            : "Not reported",
    pill:
      dmg === "possible" || dmg === "confirmed"
        ? "Sub-floor moisture risk"
        : dmg === "none_visible"
          ? "No damage observed"
          : undefined,
    pillTone: dmg === "none_visible" ? "primary" : "amber",
    afterTone: dmg === "none_visible" ? "default" : dmg ? "amber" : "default",
  });

  const risk = current.risk_flags;
  const riskText = current.safety_flag
    ? "Safety attention required"
    : risk.some((f) => f.id === "possible_concealed_leak")
      ? "Possible concealed leak"
      : current.inspection_recommended
        ? "On-site verification advised"
        : "None identified";
  rows.push({
    param: "Risk assessment",
    before:
      (prev?.inspection_recommended || (prev?.risk_flags.length ?? 0) > 0)
        ? "Signals recorded"
        : "None identified",
    after: riskText,
    pill: current.inspection_recommended ? "Physical inspection needed" : "Review on site",
    pillTone: current.inspection_recommended || riskText === "Possible concealed leak" ? "error" : "primary",
    afterTone:
      riskText === "Possible concealed leak" || riskText === "Safety attention required"
        ? "error"
        : "default",
  });

  return rows;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string }>;
}) {
  const { id } = await params;
  const { applied } = await searchParams;
  const job = await store.getJob(id);
  if (!job) notFound();

  const scope = job.scope;
  const versions = job.versions;
  const isV2 = (job.scope_version ?? 1) >= 2 && versions.length >= 2;
  const prevVersion = isV2 ? versions[versions.length - 2]! : null;
  const readiness = job.readiness_score ?? 0;
  const badge = statusBadge(job.status, job.safety_flag);
  const { name: suburbName, postcode } = suburbParts(job.customer.suburb);
  const photoEvidence = job.evidence.filter((e) => e.type === "photo_observation");
  const voiceEvidence = job.evidence.filter((e) => e.type === "voice_note");
  const lastVoice = voiceEvidence[voiceEvidence.length - 1];
  // the most recent site note that has its recording saved (replayable)
  const recordedVoice = [...voiceEvidence].reverse().find((e) => e.storage_path);
  const lastVoiceAudit = [...job.audit_events]
    .filter((a) => a.event_type === "voice_note_applied")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  // a job filed under a custom service template reports that name
  const templateRow = job.template_id
    ? await store.getTemplate(job.template_id).catch(() => null)
    : null;
  const jobTypeLabel = templateRow?.name ?? JOB_TYPE_LABELS[job.job_type];

  const delta =
    isV2 && prevVersion ? readiness - prevVersion.readiness_score : null;

  const drafts: DraftRow[] = job.drafts;

  return (
    <JobDetailView
      jobId={job.id}
      refJob={displayRef(job.id, "JOB")}
      refQr={`#${displayRef(job.id, "QR")}`}
      title={jobTitle(job)}
      customerName={job.customer.full_name}
      customerInitials={initials(job.customer.full_name)}
      phone={job.customer.phone ?? "—"}
      suburbLine={`${suburbName}${postcode ? `, ${postcode}` : ""}`}
      createdLine={createdLine(job.created_at)}
      updatedLine={`Updated at ${clock(job.updated_at)} by Alex Miller`}
      jobTypeLabel={jobTypeLabel}
      statusPill={badge.pill}
      statusLabel={badge.label}
      statusIcon={badge.icon}
      statusKey={job.status}
      readiness={readiness}
      readinessTone={readinessTone(job.readiness_score)}
      readinessDelta={delta}
      missingCount={scope?.missing_fields.length ?? 0}
      missingAskCount={scope?.missing_fields.filter((m) => m.ask_customer).length ?? 0}
      scopeVersion={job.scope_version}
      enquiryText={job.enquiry_text ?? ""}
      intakeLabel={job.intake_channel === "web_form" ? "QuoteReady Online Intake" : "Customer intake"}
      urgencyLabel={titleCase(scope?.facts.urgency ?? "standard")}
      photoCount={job.image_paths.length}
      photos={job.image_paths.map((src, i) => ({
        src,
        caption:
          photoEvidence[i]?.claim && photoEvidence[i]!.claim !== "Evidence item"
            ? photoEvidence[i]!.claim
            : "Customer-supplied site photo",
      }))}
      knownFacts={buildKnownFacts(job, scope)}
      missingFields={(scope?.missing_fields ?? []).map((m) => ({
        key: m.key,
        title: m.label,
        why: m.why,
        icon: MISSING_ICONS[m.key] ?? "help_outline",
      }))}
      evidenceTimeline={buildEvidenceTimeline(job)}
      advisory={{
        recommended: scope?.inspection_recommended ?? false,
        safety: job.safety_flag,
        actionTitle: scope?.recommended_action.title ?? "Review the enquiry",
        body: scope?.recommended_action.rationale ?? "Analysis has not been run for this enquiry yet.",
        reasons: [
          ...(scope?.risk_flags.map((f) => f.label) ?? []),
          ...(scope?.missing_fields.filter((m) => m.critical).map((m) => m.why) ?? []),
        ].slice(0, 3),
      }}
      assumptions={scope?.assumptions ?? []}
      nextActions={(scope?.missing_fields.filter((m) => m.ask_customer) ?? [])
        .slice(0, 3)
        .map((m) => ({
          key: m.key,
          label: m.key.includes("photo") ? `Request ${m.label.toLowerCase()}` : `Ask customer about ${m.label.toLowerCase()}`,
        }))}
      versions={versions.map((v, i) => ({
        version: v.version,
        latest: i === versions.length - 1,
        producedLabel:
          v.produced_by === "voice_update"
            ? "Site Note Added"
            : v.produced_by === "ai_analysis" || v.produced_by === "seed"
              ? "AI Intake Analysis"
              : titleCase(v.produced_by),
        score: v.readiness_score,
        band: v.readiness_band.replace(/_/g, " "),
        summary:
          v.produced_by === "voice_update"
            ? "Site observation merged into the scope; recommendation recalculated."
            : "Calculated from the customer enquiry and attached evidence.",
      }))}
      diffRows={buildDiffRows(prevVersion, scope ?? (versions[0] as ScopePack))}
      hasScope={Boolean(scope)}
      inspectionRecommended={scope?.inspection_recommended ?? false}
      voiceEvidence={
        lastVoice
          ? {
              transcript: lastVoice.claim,
              time: lastVoiceAudit ? clock(lastVoiceAudit.created_at) : clock(job.updated_at),
              audioUrl: recordedVoice
                ? `/api/jobs/${job.id}/voice-note/audio?evidence=${recordedVoice.id}`
                : null,
            }
          : null
      }
      drafts={drafts}
      showAppliedBanner={applied === "1"}
      auditCount={job.audit_events.length}
      quotePanel={
        <QuotePanel
          jobId={job.id}
          customerName={job.customer.full_name}
          status={job.status}
          readinessScore={job.readiness_score}
          readinessBand={scope?.readiness_band ?? null}
          safetyFlag={job.safety_flag}
          inspectionRecommended={scope?.inspection_recommended ?? false}
          missingFields={(scope?.missing_fields ?? []).map((m) => ({
            key: m.key,
            label: m.label,
            critical: m.critical,
          }))}
        />
      }
    />
  );
}
