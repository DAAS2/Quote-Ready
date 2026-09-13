import { GeminiAnalysisSchema, type EvidenceItem, type GeminiAnalysis, type JobFacts, type ScopePack } from "@/lib/ai/schemas";
import { extractJobFacts, GEMINI_CONFIGURED, writeRecommendation } from "@/lib/ai/gemini";
import { buildFallbackAnalysis } from "@/lib/ai/fallbacks";
import { buildScopePack } from "@/lib/rules/engine";
import { store } from "@/lib/data/jobs";
import type { DemoJobSeed } from "@/lib/data/demo-seed";
import { loadImages } from "@/lib/ai/images";
import { DEMO_JOB_SEEDS } from "@/lib/data/demo-seed";
import { isDemoMode } from "@/lib/ai/demo-mode";
import type { WorkflowStateType } from "./state";

/* ────────────────────────────────────────────────────────────────────────────
 * Graph nodes. Each node does one thing; I/O touches the store only in
 * persist_analysis. Pure-ish logic everywhere else so it stays testable.
 * ──────────────────────────────────────────────────────────────────────────── */

export async function validate_job_input(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
  if (!state.raw_text || state.raw_text.trim().length < 5) {
    return {
      validation_error: "Enquiry text missing or too short",
      used_fallback: true,
      produced_by: "fallback",
      facts: { symptoms: [], photo_count: state.image_paths.length, voice_note_count: 0, notes: [] },
      evidence: [],
      model_risk_flags: [],
      recommended_questions: [],
      confidence: 0,
    };
  }
  return {};
}

export async function extract_job_facts_with_gemini(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  if (state.validation_error) return {};

  const { images, failures } = await loadImages(state.image_paths);

  if (isDemoMode() || !GEMINI_CONFIGURED) {
    return fallback(state, images.length, failures.length > 0 ? "image_load_failed" : "demo_mode");
  }

  try {
    const analysis: GeminiAnalysis = await extractJobFacts({
      enquiry_text: state.raw_text,
      job_type: state.job_type,
      customer_suburb: state.customer_suburb,
      images,
    });
    return {
      analysis,
      facts: analysis.facts,
      evidence: analysis.evidence,
      model_risk_flags: analysis.risk_flags,
      recommended_questions: analysis.recommended_questions,
      confidence: analysis.confidence,
      produced_by: "ai_analysis",
      used_fallback: false,
    };
  } catch (error) {
    console.warn("[QuoteReady] Gemini extraction failed:", (error as Error).message);
    return fallback(state, images.length, "ai_unavailable");
  }
}

function fallback(
  state: WorkflowStateType,
  photoCount: number,
  reason: string,
): Partial<WorkflowStateType> {
  const seed = matchSeed(state);
  const { analysis, usedSeed } = buildFallbackAnalysis({
    enquiry_text: state.raw_text,
    job_type: state.job_type,
    photo_count: photoCount,
    seed,
  });
  return {
    analysis,
    facts: analysis.facts,
    evidence: analysis.evidence,
    model_risk_flags: analysis.risk_flags,
    recommended_questions: analysis.recommended_questions,
    confidence: analysis.confidence,
    produced_by: "fallback",
    used_fallback: !usedSeed,
    validation_error: usedSeed ? null : `Live analysis unavailable (${reason}) — manual review required`,
  };
}

function matchSeed(state: WorkflowStateType): DemoJobSeed | null {
  return (
    DEMO_JOB_SEEDS.find(
      (s) => s.enquiry_text.trim() === state.raw_text.trim(),
    ) ?? null
  );
}

export async function validate_structured_output(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  if (state.validation_error) return {};
  const parsed = GeminiAnalysisSchema.safeParse(state.analysis);
  if (!parsed.success) {
    return {
      validation_error: "Structured analysis failed validation — manual review required",
      used_fallback: true,
      produced_by: "fallback",
      facts: { symptoms: [], photo_count: state.image_paths.length, voice_note_count: 0, notes: [] },
      evidence: [],
      model_risk_flags: [],
      recommended_questions: [],
      confidence: 0,
    };
  }
  return { analysis: parsed.data };
}

export async function apply_job_template_rules_and_score(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const facts: JobFacts = state.facts ?? {
    symptoms: [],
    photo_count: state.image_paths.length,
    voice_note_count: 0,
    notes: [],
  };
  const scope = buildScopePack({
    job_type: state.job_type ?? (state.analysis?.job_type as WorkflowStateType["job_type"]) ?? "leaking_tap",
    facts,
    evidence: state.evidence,
    model_risk_flags: state.model_risk_flags,
    raw_text: state.raw_text,
    recommended_questions: state.recommended_questions,
    version: Math.max(1, state.existing_version),
    produced_by: state.used_fallback ? "fallback" : state.produced_by === "fallback" ? "fallback" : "ai_analysis",
    ...(state.template ? { template: state.template } : {}),
  });
  return { scope, override_reasons: scope.override_reasons };
}

export async function generate_recommendation_with_ai(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  if (!state.scope || state.validation_error) return {};
  // Rules decide the action type; AI only words it. Skip in demo/fallback mode.
  if (isDemoMode() || !GEMINI_CONFIGURED || state.used_fallback) return {};
  try {
    const { title, rationale } = await writeRecommendation(state.scope);
    const scope: ScopePack = {
      ...state.scope,
      recommended_action: {
        ...state.scope.recommended_action,
        title,
        rationale,
      },
    };
    return { scope, recommendation_ai: true };
  } catch (error) {
    console.warn("[QuoteReady] AI recommendation failed, keeping rules wording:", (error as Error).message);
    return {};
  }
}

export async function persist_analysis(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  if (!state.scope) return {};
  const facts: JobFacts =
    state.facts ?? state.scope.facts;
  await store.updateJobFacts(
    state.job_id,
    facts,
    state.scope,
    state.new_image_paths,
  );
  if (state.evidence.length > 0) {
    const ts = new Date().toISOString();
    await store.addEvidence(
      state.job_id,
      state.evidence.map((e: EvidenceItem, i: number) => ({
        ...e,
        id: `${ts}-${i}`,
        created_at: ts,
      })),
    );
  }
  const summary = state.used_fallback
    ? `Analysis completed via fallback (manual review required) — readiness ${state.scope.readiness_score}%.`
    : state.produced_by === "fallback"
      ? `Analysis completed (precomputed demo analysis) — readiness ${state.scope.readiness_score}%, ${state.scope.readiness_band.replace(/_/g, " ")}.`
      : `Gemini analysis completed (confidence ${(state.confidence * 100).toFixed(0)}%) — readiness ${state.scope.readiness_score}%, ${state.scope.readiness_band.replace(/_/g, " ")}.`;
  await store.addAudit(state.job_id, {
    actor_type: "ai",
    event_type: "analysis_completed",
    summary,
    metadata: {
      version: state.scope.version,
      produced_by: state.scope.produced_by,
      confidence: state.confidence,
      validation_error: state.validation_error,
      recommendation_ai: state.recommendation_ai,
    },
  });
  return {};
}
