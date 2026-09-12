import { Annotation } from "@langchain/langgraph";
import type { GeminiAnalysis } from "@/lib/ai/schemas";
import type {
  EvidenceItem,
  JobFacts,
  JobType,
  ScopePack,
} from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Workflow state shared across graph nodes.
 * ──────────────────────────────────────────────────────────────────────────── */

export const WorkflowState = Annotation.Root({
  /** in */
  job_id: Annotation<string>,
  job_type: Annotation<JobType | null>,
  raw_text: Annotation<string>,
  customer_suburb: Annotation<string | null>,
  image_paths: Annotation<string[]>,
  existing_version: Annotation<number>,

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
