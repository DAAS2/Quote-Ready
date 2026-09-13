import { GeminiAnalysisSchema, type EvidenceItem, type GeminiAnalysis, type JobFacts, type ScopePack } from "@/lib/ai/schemas";
import { extractJobFacts, GEMINI_CONFIGURED, GEMINI_MODEL, writeRecommendation } from "@/lib/ai/gemini";
import { buildFallbackAnalysis } from "@/lib/ai/fallbacks";
import { buildScopePack } from "@/lib/rules/engine";
import { retrieveServiceGuidance } from "@/lib/ai/retrieval";
import { estimateCostUsd, priceBasis } from "@/lib/ai/pricing";
import { store } from "@/lib/data/jobs";
import type { DemoJobSeed } from "@/lib/data/demo-seed";
import { loadImages } from "@/lib/ai/images";
import { DEMO_JOB_SEEDS } from "@/lib/data/demo-seed";
import { isDemoMode } from "@/lib/ai/demo-mode";
import type { WorkflowStateType, WorkflowTelemetry } from "./state";

/* ────────────────────────────────────────────────────────────────────────────
 * Graph nodes. Each node does one thing; I/O touches the store only in
 * persist_analysis. Pure-ish logic everywhere else so it stays testable.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record how long a node took. Telemetry rides on the scope pack's metrics so
 * "which step is slow" and "what did that run cost" are answerable from the
 * job itself, not from a separate log system.
 */
function withTiming(
  state: WorkflowStateType,
  label: string,
  ms: number,
): WorkflowTelemetry {
  return {
    ...state.telemetry,
    nodes: { ...state.telemetry.nodes, [label]: ms },
  };
}

export async function validate_job_input(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
  const started = Date.now();
  if (!state.raw_text || state.raw_text.trim().length < 5) {
    return {
      telemetry: withTiming(state, "validate_job_input", Date.now() - started),
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
  return {
    // start the run clock here: this node is the graph's entry point
    telemetry: { ...withTiming(state, "validate_job_input", Date.now() - started), started_at: Date.now() },
  };
}

export async function extract_job_facts_with_gemini(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const started = Date.now();
  if (state.validation_error) return {};

  // Guided tour / rehearsal: skip the vision pass entirely and go straight to
  // the deterministic engine so the scope is ready the moment it is asked for.
  if (state.force_fallback) {
    return {
      ...fallback(state, state.image_paths.length, "forced_fallback"),
      telemetry: withTiming(state, "extract_facts", Date.now() - started),
    };
  }

  const { images, failures } = await loadImages(state.image_paths);

  if (isDemoMode() || !GEMINI_CONFIGURED) {
    return {
      ...fallback(state, images.length, failures.length > 0 ? "image_load_failed" : "demo_mode"),
      telemetry: withTiming(state, "extract_facts", Date.now() - started),
    };
  }

  try {
    const { analysis, usage }: { analysis: GeminiAnalysis; usage: import("@/lib/ai/gemini").ModelUsage } =
      await extractJobFacts({
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
      telemetry: {
        ...withTiming(state, "extract_facts", Date.now() - started),
        model: usage.model,
        prompt_tokens: state.telemetry.prompt_tokens + usage.prompt_tokens,
        output_tokens: state.telemetry.output_tokens + usage.output_tokens,
        total_tokens: state.telemetry.total_tokens + usage.total_tokens,
      },
    };
  } catch (error) {
    console.warn("[QuoteReady] Gemini extraction failed:", (error as Error).message);
    return {
      ...fallback(state, images.length, "ai_unavailable"),
      telemetry: withTiming(state, "extract_facts", Date.now() - started),
    };
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
  const started = Date.now();
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
  return {
    scope,
    override_reasons: scope.override_reasons,
    telemetry: withTiming(state, "apply_rules", Date.now() - started),
  };
}

/**
 * Retrieve cited service guidance for this job's structured facts.
 *
 * Runs AFTER the rules engine on purpose: the facts, band, overrides and safety
 * escalation are already decided by the time any retrieval happens, so guidance
 * can never influence them. It contributes wording and context to the scope
 * pack, and the recommendation writer may make its rationale more specific
 * with it.
 */
export async function retrieve_service_guidance(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  if (!state.scope || state.validation_error) return {};
  const started = Date.now();

  const result = await retrieveServiceGuidance({
    job_type: state.scope.job_type,
    facts: state.scope.facts,
    risk_flags: state.model_risk_flags,
    missing_fields: state.scope.missing_fields.map((m) => m.key),
  });

  // The pack carries the guidance so it travels with the version and the audit
  // record — a later diff can show guidance changing as facts arrive.
  const scope: ScopePack = { ...state.scope, guidance: result.notes };

  return {
    guidance: result.notes,
    retrieval: { mode: result.mode, notes: result.notes.length, ms: result.ms },
    scope,
    telemetry: withTiming(state, "retrieve_guidance", Date.now() - started),
  };
}

export async function generate_recommendation_with_ai(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const started = Date.now();
  if (!state.scope || state.validation_error) return {};
  // Rules decide the action type; AI only words it. Skip in demo/fallback mode.
  if (isDemoMode() || !GEMINI_CONFIGURED || state.used_fallback) return {};
  try {
    // Retrieved guidance may sharpen the wording; it can never move the action.
    const { title, rationale, usage } = await writeRecommendation(
      state.scope,
      state.guidance,
    );
    const scope: ScopePack = {
      ...state.scope,
      recommended_action: {
        ...state.scope.recommended_action,
        title,
        rationale,
      },
    };
    return {
      scope,
      recommendation_ai: true,
      telemetry: {
        ...withTiming(state, "write_recommendation", Date.now() - started),
        prompt_tokens: state.telemetry.prompt_tokens + usage.prompt_tokens,
        output_tokens: state.telemetry.output_tokens + usage.output_tokens,
        total_tokens: state.telemetry.total_tokens + usage.total_tokens,
      },
    };
  } catch (error) {
    console.warn("[QuoteReady] AI recommendation failed, keeping rules wording:", (error as Error).message);
    return { telemetry: withTiming(state, "write_recommendation", Date.now() - started) };
  }
}

export async function persist_analysis(
  state: WorkflowStateType,
): Promise<Partial<WorkflowStateType>> {
  const started = Date.now();
  if (!state.scope) return {};
  const facts: JobFacts =
    state.facts ?? state.scope.facts;

  // Fold this run's latency + token accounting into the version being saved, so
  // "what did this analysis cost" is answerable from the job itself.
  const telemetry = withTiming(state, "persist", Date.now() - started);
  const durationMs = telemetry.started_at ? Date.now() - telemetry.started_at : 0;
  const model = telemetry.model ?? (state.recommendation_ai ? GEMINI_MODEL : null);
  const scope: ScopePack = {
    ...state.scope,
    guidance: state.guidance,
    metrics: {
      model,
      prompt_tokens: telemetry.prompt_tokens,
      output_tokens: telemetry.output_tokens,
      total_tokens: telemetry.total_tokens,
      duration_ms: durationMs,
      nodes: telemetry.nodes,
      retrieval: state.retrieval,
      estimated_cost_usd: estimateCostUsd({
        model,
        prompt_tokens: telemetry.prompt_tokens,
        output_tokens: telemetry.output_tokens,
      }),
      cost_basis: priceBasis(model),
    },
  };

  await store.updateJobFacts(
    state.job_id,
    facts,
    scope,
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
    ? `Analysis completed via fallback (manual review required) — readiness ${scope.readiness_score}%.`
    : state.produced_by === "fallback"
      ? `Analysis completed (precomputed demo analysis) — readiness ${scope.readiness_score}%, ${scope.readiness_band.replace(/_/g, " ")}.`
      : `Gemini analysis completed (confidence ${(state.confidence * 100).toFixed(0)}%) — readiness ${scope.readiness_score}%, ${scope.readiness_band.replace(/_/g, " ")}.`;
  await store.addAudit(state.job_id, {
    actor_type: "ai",
    event_type: "analysis_completed",
    summary,
    metadata: {
      version: scope.version,
      produced_by: scope.produced_by,
      confidence: state.confidence,
      validation_error: state.validation_error,
      recommendation_ai: state.recommendation_ai,
      // run accounting + retrieval provenance, kept on the audit trail
      telemetry: scope.metrics,
      guidance: scope.guidance.map((g) => ({
        id: g.id,
        reference: g.reference,
        score: g.score,
      })),
      retrieval_mode: state.retrieval.mode,
    },
  });
  return { scope, telemetry };
}
