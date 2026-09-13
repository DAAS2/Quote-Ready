import {
  EMPTY_FACTS,
  type EvidenceItem,
  type JobFacts,
  type JobType,
  type MissingField,
  type RecommendedAction,
  type ScopePack,
} from "@/lib/ai/schemas";
import { getTemplate, type JobTemplate } from "./job-templates";
import {
  bandFromScore,
  calculateComponents,
  fieldIsKnown,
  missingTemplateFields,
  weightedScore,
} from "./readiness";
import {
  checkInspectionConditions,
  detectSafetyFlags,
  normalizeRiskFlags,
} from "./risk-overrides";

/* ────────────────────────────────────────────────────────────────────────────
 * buildScopePack — the deterministic heart of QuoteReady.
 * Pure function: facts in, reviewable scope pack out. No LLM involved.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ScopePackInput {
  job_type: JobType;
  facts: JobFacts;
  evidence: EvidenceItem[];
  /** risk-flag ids suggested by the model (validated + normalised before use) */
  model_risk_flags: string[];
  /** raw customer text — scanned for safety patterns */
  raw_text: string;
  /** raw voice-note transcript (also safety-scanned) */
  voice_note_text?: string;
  recommended_questions?: string[];
  version: number;
  produced_by: ScopePack["produced_by"];
  /** custom (user-edited) template — overrides the built-in template for this run */
  template?: JobTemplate;
}

const CAP_INSPECTION = 69;
/** ≥2 missing critical fields = information-starved: "unknown" conditions
 *  no longer count as inspection triggers (the job simply lacks info). */
const STARVATION_THRESHOLD = 2;

export function buildScopePack(input: ScopePackInput): ScopePack {
  const template = input.template ?? getTemplate(input.job_type);
  // Never trust callers: normalise facts so every field exists
  const facts: JobFacts = { ...EMPTY_FACTS, ...(input.facts ?? {}) };
  const overrideReasons: string[] = [];

  // 1. Safety scan over raw text (customer words, not model words)
  const safetyFlags = detectSafetyFlags(input.raw_text, input.voice_note_text);
  const safetyFlag = safetyFlags.length > 0;
  if (safetyFlag) {
    overrideReasons.push(
      `Safety pattern detected (${safetyFlags.map((f) => f.id).join(", ")}) — estimate paths blocked.`,
    );
  }

  // 2. Normalise model risk flags
  const modelFlags = normalizeRiskFlags(input.model_risk_flags);

  // 3. Missing fields straight from the deterministic template
  const missing: MissingField[] = missingTemplateFields(facts, template).map(
    (f) => ({
      key: f.key,
      label: f.label,
      why: f.why,
      critical: f.critical,
      ask_customer: f.ask_customer,
    }),
  );
  const missingCriticalCount = missing.filter((m) => m.critical).length;
  const missingCritical = missingCriticalCount > 0;

  // 4. Inspection conditions (template-driven; "unknown"-fact conditions are
  //    suppressed when the job is information-starved — missing info is not risk)
  const inspection = checkInspectionConditions(
    template,
    facts,
    modelFlags,
    missingCriticalCount >= STARVATION_THRESHOLD,
  );
  if (inspection.matched) {
    overrideReasons.push(
      `Inspection condition met: ${inspection.reasons.join("; ")}.`,
    );
  }

  // 5. Score components (risk component consumes flags + safety)
  const components = calculateComponents({
    facts,
    rawText: input.raw_text,
    evidence: input.evidence,
    template,
    missingAskCount: missing.filter((m) => m.ask_customer).length,
    riskFlags: [...safetyFlags, ...modelFlags],
    safetyFlag,
    inspectionTriggered: inspection.matched,
  });
  let score = weightedScore(components);

  // 6. Overrides that cap the score
  if (safetyFlag && score > CAP_INSPECTION) {
    score = CAP_INSPECTION;
    overrideReasons.push("Readiness capped at 69 while a safety flag is unresolved.");
  }

  // 7. Final inspection decision
  const flagsRequiringInspection = [...safetyFlags, ...modelFlags].some(
    (f) => f.requires_inspection,
  );
  const inspectionRecommended = safetyFlag || inspection.matched || flagsRequiringInspection;
  if (inspectionRecommended && score > CAP_INSPECTION) {
    score = CAP_INSPECTION;
    overrideReasons.push(
      "Readiness capped at 69 because an inspection is recommended before fixed pricing.",
    );
  }
  if (flagsRequiringInspection && !inspection.matched) {
    const labels = [...safetyFlags, ...modelFlags]
      .filter((f) => f.requires_inspection)
      .map((f) => f.label);
    overrideReasons.push(`Inspection required — risk signal needs on-site verification: ${labels.join("; ")}.`);
  }
  if (missingCritical) {
    overrideReasons.push(
      `Critical field(s) missing: ${missing.filter((m) => m.critical).map((m) => m.label).join(", ")}.`,
    );
    if (score > CAP_INSPECTION) {
      score = CAP_INSPECTION;
      overrideReasons.push("Readiness capped at 69 while critical information is missing.");
    }
  }

  const band = bandFromScore(score);

  // 8. Known facts → display map (only what is actually known)
  const known_facts: ScopePack["known_facts"] = {};
  for (const field of template.required_fields) {
    const raw = (facts as Record<string, unknown>)[field.key];
    if (fieldIsKnown(facts, field.key)) {
      known_facts[field.key] =
        Array.isArray(raw) ? raw.map(String) : (raw as string | number);
    }
  }
  if (facts.photo_count > 0) known_facts.photo_count = facts.photo_count;
  if (facts.voice_note_count > 0) known_facts.voice_note_count = facts.voice_note_count;
  facts.notes.forEach((note, i) => {
    known_facts[`note_${i + 1}`] = note;
  });

  // 9. Recommended action
  const recommended_action = deriveAction(
    safetyFlag,
    inspectionRecommended,
    band,
    inspection.reasons,
    missing.filter((m) => m.ask_customer).length,
  );

  return {
    version: input.version,
    job_type: input.job_type,
    facts,
    status: band,
    readiness_score: score,
    readiness_band: band,
    components,
    known_facts,
    missing_fields: missing,
    assumptions: template.assumptions,
    exclusions: template.exclusions,
    risk_flags: [...safetyFlags, ...modelFlags],
    safety_flag: safetyFlag,
    inspection_recommended: inspectionRecommended,
    recommended_action,
    evidence: input.evidence,
    produced_by: input.produced_by,
    override_reasons: overrideReasons,
  };
}

function deriveAction(
  safetyFlag: boolean,
  inspectionRecommended: boolean,
  band: ScopePack["readiness_band"],
  inspectionReasons: string[],
  missingAskCount: number,
): RecommendedAction {
  if (safetyFlag) {
    return {
      type: "safety_escalation",
      title: "Safety attention required",
      rationale:
        "Something in the enquiry matches urgent safety patterns (e.g. gas odour, sewage, flooding). Do not use this assessment as a safety diagnosis — follow the appropriate professional or emergency process before any work is scheduled.",
      estimate_eligible: false,
    };
  }
  if (inspectionRecommended) {
    return {
      type: "inspection",
      title: "On-site inspection recommended",
      rationale:
        inspectionReasons.length > 0
          ? `An on-site review is the safest next step: ${inspectionReasons[0].toLowerCase()}.`
          : "Current details indicate an on-site review is the most accurate next step before any fixed price.",
      estimate_eligible: false,
    };
  }
  if (band !== "ready_for_estimate" || missingAskCount > 0) {
    return {
      type: "request_information",
      title: "Request missing information",
      rationale:
        "Key job details are absent. Send the customer the prepared follow-up questions before committing to anything.",
      estimate_eligible: false,
    };
  }
  return {
    type: "estimate_review",
    title: "Ready for estimate preparation",
    rationale:
      "Required details and evidence are sufficiently complete for owner-reviewed estimate preparation. This is not an automatic quote.",
    estimate_eligible: true,
  };
}
