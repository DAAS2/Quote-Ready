import { mergeFacts } from "@/lib/rules/merge";
import { diffPacks, type PackDiff } from "@/lib/rules/diff";
import { buildScopePack } from "@/lib/rules/engine";
import type { JobDetail } from "@/lib/data/types";
import type { JobFacts, ScopePack, VoiceUpdate } from "@/lib/ai/schemas";
import { EMPTY_FACTS } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Voice-note → scope update. Preview first (nothing persisted), then a
 * separate user-approved apply. Both share this pure computation.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface VoicePreview {
  nextVersion: number;
  newPack: ScopePack;
  diff: PackDiff | null;
}

export function buildVoicePreview(
  job: JobDetail,
  transcript: string,
  update: VoiceUpdate,
): VoicePreview {
  const current = job.scope;
  const currentVersion = job.scope_version ?? 0;
  const nextVersion = currentVersion + 1;

  const mergedFacts = mergeFacts(
    current?.facts ?? job.extracted_facts,
    update.facts,
  );
  mergedFacts.voice_note_count = Math.max(
    mergedFacts.voice_note_count,
    (current?.facts.voice_note_count ?? 0) + 1,
  );

  const mergedEvidence = [
    ...(current?.evidence ?? []),
    ...update.evidence,
  ];
  const mergedRiskFlags = Array.from(
    new Set([
      ...(current?.risk_flags.filter((f) => f.source === "ai_analysis").map((f) => f.id) ?? []),
      ...update.risk_flags,
    ]),
  );

  const newPack = buildScopePack({
    job_type: job.job_type,
    facts: mergedFacts,
    evidence: mergedEvidence,
    model_risk_flags: mergedRiskFlags,
    raw_text: job.enquiry_text ?? "",
    voice_note_text: transcript,
    recommended_questions: [],
    version: Math.max(1, nextVersion),
    produced_by: "voice_update",
  });

  return {
    nextVersion: newPack.version,
    newPack,
    diff: current ? diffPacks(current, newPack) : null,
  };
}

/* ── Deterministic transcript extraction (fallback when live AI is down) ──── */

export function deterministicVoiceUpdate(transcript: string): VoiceUpdate {
  const t = transcript.toLowerCase();
  const facts: Partial<JobFacts> = {};
  const riskFlags: string[] = [];
  const evidence: VoiceUpdate["evidence"] = [];

  const addEvidence = (claim: string, factKey?: string) =>
    evidence.push({
      type: "voice_note",
      claim,
      source_reference: "voice_note_1",
      certainty: "high",
      ...(factKey ? { fact_key: factKey } : {}),
    });

  // fixture identification
  if (/\b(corroded|corrosion)\b/.test(t) && /\bmixer\b/.test(t)) {
    facts.fixture_type = "corroded_mixer";
    addEvidence("Fixture identified as a corroded mixer", "fixture_type");
    riskFlags.push("corroded_fixture");
  } else if (/\bmixer\b/.test(t)) {
    facts.fixture_type = "mixer_tap";
    addEvidence("Fixture identified as a mixer tap", "fixture_type");
  } else if (/\b(close.?coupled|cistern)\b/.test(t)) {
    facts.fixture_type = "close_coupled";
    addEvidence("Cistern/close-coupled toilet identified", "fixture_type");
  } else if (/\b(tank|storage)\b/.test(t) && /\bgas\b/.test(t)) {
    facts.system_type = "gas_storage";
    addEvidence("Gas storage system identified", "system_type");
  } else if (/\b(heat pump)\b/.test(t)) {
    facts.system_type = "heat_pump";
    addEvidence("Heat pump system identified", "system_type");
  }

  // isolation access
  if (/\bisolation\b|\bisolate\b/.test(t)) {
    if (/\b(accessible|easy|reachable|reach)\b/.test(t)) {
      facts.water_isolation_access = "accessible";
      addEvidence("Water isolation is accessible", "water_isolation_access");
    } else if (/\b(blocked|stuck|hard to|cannot)\b/.test(t)) {
      facts.water_isolation_access = "constrained";
      addEvidence("Water isolation access is constrained", "water_isolation_access");
    }
  }

  // water damage
  if (/\b(damp|moist|swollen|wet|water damage)\b/.test(t)) {
    facts.water_damage = /\b(standing|soaked|soaking|flooded)\b/.test(t) ? "confirmed" : "possible";
    addEvidence(
      facts.water_damage === "confirmed"
        ? "Water damage confirmed on site"
        : "Signs of dampness observed — possible water damage",
      "water_damage",
    );
    riskFlags.push("water_damage");
  }

  // concealed leak phrasing
  if (/\bconcealed\b|\bcannot rule out\b|\bcan't rule out\b/.test(t)) {
    riskFlags.push("possible_concealed_leak");
    addEvidence("Plumber cannot rule out a concealed leak");
  }

  // symptoms
  const symptoms: string[] = [];
  if (/\bno hot water\b/.test(t)) symptoms.push("no_hot_water");
  if (/\b(dripping|drip)\b/.test(t)) symptoms.push("continuous_drip");
  if (/\b(leaking|leak)\b/.test(t)) symptoms.push("leak_observed");
  if (symptoms.length > 0) facts.symptoms = symptoms;

  // property access
  if (/\baccess\b/.test(t) && /\b(accessible|easy|fine|clear)\b/.test(t)) {
    facts.property_access = "accessible";
  }

  const firstSentences = transcript
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ")
    .trim();

  return {
    facts: { ...EMPTY_FACTS, ...facts } as JobFacts,
    evidence: evidence.length > 0 ? evidence : [{
      type: "voice_note",
      claim: firstSentences || "Spoken site note recorded",
      source_reference: "voice_note_1",
      certainty: "medium",
    }],
    risk_flags: Array.from(new Set(riskFlags)),
    notes: /\binspection\b|\binspect\b/.test(t)
      ? "Plumber recommends an inspection before a fixed price."
      : "",
  };
}
