import type { JobFacts, EvidenceItem, ReadinessComponents } from "@/lib/ai/schemas";
import type { JobTemplate, RequiredField } from "./job-templates";

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic readiness scoring.
 *
 *   readiness = 0.25·D + 0.25·E + 0.20·A + 0.15·C + 0.15·R
 *
 * D details · E evidence · A access/logistics · C confirmation · R risk.
 * Every component is a plain 0–100 number — no opaque model judgement.
 * ──────────────────────────────────────────────────────────────────────────── */

const UNKNOWN_WORDS = /^(unknown|n\/a|na|not sure|unsure|none given|tbc)$/i;

export function isKnown(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    const v = value.trim();
    return v !== "" && !UNKNOWN_WORDS.test(v);
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value > 0;
  return Boolean(value);
}

export function fieldIsKnown(facts: JobFacts, key: string): boolean {
  return isKnown((facts as Record<string, unknown>)[key]);
}

export function missingTemplateFields(
  facts: JobFacts,
  template: JobTemplate,
): RequiredField[] {
  return template.required_fields.filter((f) => !fieldIsKnown(facts, f.key));
}

function scoreDetails(facts: JobFacts, template: JobTemplate): number {
  let total = 0;
  let known = 0;
  for (const field of template.required_fields) {
    const weight = field.critical ? 2 : 1;
    total += weight;
    if (fieldIsKnown(facts, field.key)) known += weight;
  }
  return total === 0 ? 100 : Math.round((known / total) * 100);
}

export function scoreEvidence(facts: JobFacts, rawText: string, evidence: EvidenceItem[], template: JobTemplate): number {
  let score = 0;

  // photos: 0 → 0 · 1 → 25 · ≥2 (or template threshold met) → 40
  if (facts.photo_count >= Math.max(2, template.min_photos_for_good_evidence)) score += 40;
  else if (facts.photo_count === 1) score += 25;

  // enquiry description quality
  const len = rawText.trim().length;
  if (len >= 40) score += 30;
  else if (len >= 15) score += 18;
  else if (len > 0) score += 8;

  // structured evidence from photos (model observations)
  if (evidence.some((e) => e.type === "photo_observation")) score += 10;

  // voice note adds field context
  if (facts.voice_note_count > 0) score += 15;

  // a customer reply answering questions
  if (evidence.some((e) => e.type === "customer_reply")) score += 15;

  return Math.min(100, score);
}

function scoreAccess(facts: JobFacts): number {
  let score = 0;
  if (fieldIsKnown(facts, "customer_availability")) score += 50;
  if (fieldIsKnown(facts, "property_access")) score += 50;
  return score;
}

function scoreConfirmation(missingAskCount: number, hasReply: boolean): number {
  if (missingAskCount === 0) return hasReply ? 100 : 80;
  return hasReply ? 60 : 40;
}

function scoreRisk(input: {
  riskFlags: Array<{ severity: "attention" | "high" | "safety" }>;
  safetyFlag: boolean;
  waterDamage: JobFacts["water_damage"];
  inspectionTriggered: boolean;
}): number {
  if (input.safetyFlag) return 0;
  let score = 100;
  for (const flag of input.riskFlags) {
    score -= flag.severity === "high" ? 25 : 10;
  }
  if (input.waterDamage === "possible") score -= 20;
  if (input.waterDamage === "confirmed") score -= 30;
  if (input.inspectionTriggered) score -= 15;
  return Math.max(0, score);
}

export function calculateComponents(input: {
  facts: JobFacts;
  rawText: string;
  evidence: EvidenceItem[];
  template: JobTemplate;
  missingAskCount: number;
  riskFlags: Array<{ severity: "attention" | "high" | "safety" }>;
  safetyFlag: boolean;
  inspectionTriggered: boolean;
}): ReadinessComponents {
  return {
    details: scoreDetails(input.facts, input.template),
    evidence: scoreEvidence(input.facts, input.rawText, input.evidence, input.template),
    access: scoreAccess(input.facts),
    confirmation: scoreConfirmation(input.missingAskCount, input.evidence.some((e) => e.type === "customer_reply")),
    risk: scoreRisk({
      riskFlags: input.riskFlags,
      safetyFlag: input.safetyFlag,
      waterDamage: input.facts.water_damage,
      inspectionTriggered: input.inspectionTriggered,
    }),
  };
}

export const COMPONENT_WEIGHTS = {
  details: 0.25,
  evidence: 0.25,
  access: 0.2,
  confirmation: 0.15,
  risk: 0.15,
} as const;

export function weightedScore(c: ReadinessComponents): number {
  return Math.round(
    COMPONENT_WEIGHTS.details * c.details +
      COMPONENT_WEIGHTS.evidence * c.evidence +
      COMPONENT_WEIGHTS.access * c.access +
      COMPONENT_WEIGHTS.confirmation * c.confirmation +
      COMPONENT_WEIGHTS.risk * c.risk,
  );
}

export function bandFromScore(score: number): "needs_information" | "inspection_recommended" | "ready_for_estimate" {
  if (score < 40) return "needs_information";
  if (score < 70) return "inspection_recommended";
  return "ready_for_estimate";
}
