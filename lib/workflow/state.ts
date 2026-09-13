import { Annotation } from "@langchain/langgraph";
import type { GeminiAnalysis } from "@/lib/ai/schemas";
import type {
  EvidenceItem,
  GuidanceNote,
  JobFacts,
  JobType,
  RetrievalMode,
  ScopePack,
} from "@/lib/ai/schemas";
import type { JobTemplate } from "@/lib/rules/job-templates";

/* ────────────────────────────────────────────────────────────────────────────
 * Workflow state shared across graph nodes.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Per-run telemetry accumulated across nodes. Every model call and every node
 * wall time lands here, then rides out on the scope pack's `metrics` field so
 * the operator can see what a run cost and where the time went.
 */
export interface WorkflowTelemetry {
  /** epoch ms when the run started */
  started_at: number;
  /** node name → wall time in ms */
  nodes: Record<string, number>;
  model: string | null;
  prompt_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export const EMPTY_TELEMETRY: WorkflowTelemetry = {
  started_at: 0,
  nodes: {},
  model: null,
  prompt_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
};

export const WorkflowState = Annotation.Root({
  /** in */
  job_id: Annotation<string>,
  job_type: Annotation<JobType | null>,
  raw_text: Annotation<string>,
  customer_suburb: Annotation<string | null>,
  image_paths: Annotation<string[]>,
  existing_version: Annotation<number>,
  /** custom (user-edited) service template the job is graded against */
  template: Annotation<JobTemplate | null>,
  /** skip the live model and use the deterministic engine (guided tour, prep) */
  force_fallback: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => false,
  }),

  /** extraction result (ai or fallback) */
  analysis: Annotation<GeminiAnalysis | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
  facts: Annotation<JobFacts | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
  evidence: Annotation<EvidenceItem[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  model_risk_flags: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  recommended_questions: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  confidence: Annotation<number>({
    reducer: (_a, b) => b,
    default: () => 0,
  }),
  produced_by: Annotation<"ai_analysis" | "fallback">({
    reducer: (_a, b) => b,
    default: () => "fallback",
  }),

  /** engine output */
  scope: Annotation<ScopePack | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
  override_reasons: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  /** true when the AI wrote the recommendation wording (rules still decide the type) */
  recommendation_ai: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => false,
  }),

  /** retrieved service guidance (RAG) for this job's facts — cited, advisory only */
  guidance: Annotation<GuidanceNote[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  /** which retrieval tier answered, and what it cost in wall time */
  retrieval: Annotation<{ mode: RetrievalMode; notes: number; ms: number }>({
    reducer: (_a, b) => b,
    default: () => ({ mode: "skipped", notes: 0, ms: 0 }),
  }),
  /** per-run latency + token accounting (merged across nodes) */
  telemetry: Annotation<WorkflowTelemetry>({
    reducer: (a, b) => ({
      ...a,
      ...b,
      started_at: a.started_at || b.started_at,
      nodes: { ...a.nodes, ...b.nodes },
      prompt_tokens: a.prompt_tokens + b.prompt_tokens,
      output_tokens: a.output_tokens + b.output_tokens,
      total_tokens: a.total_tokens + b.total_tokens,
      model: b.model ?? a.model,
    }),
    default: () => ({ ...EMPTY_TELEMETRY }),
  }),

  /** diagnostics for audit */
  validation_error: Annotation<string | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
  used_fallback: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => false,
  }),
  new_image_paths: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
});

export type WorkflowStateType = typeof WorkflowState.State;
