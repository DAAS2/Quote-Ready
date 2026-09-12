import { END, START, StateGraph } from "@langchain/langgraph";
import { WorkflowState, type WorkflowStateType } from "./state";
import {
  apply_job_template_rules_and_score,
  extract_job_facts_with_gemini,
  persist_analysis,
  validate_job_input,
  validate_structured_output,
} from "./nodes";

/* ────────────────────────────────────────────────────────────────────────────
 * QuoteReady analysis workflow (LangGraph).
 *
 *   START
 *     → validate_job_input
 *     → extract_job_facts_with_gemini
 *     → validate_structured_output
 *     → apply_job_template_rules_and_score
 *     → persist_analysis
 *   END
 * ──────────────────────────────────────────────────────────────────────────── */

const builder = new StateGraph(WorkflowState)
  .addNode("validate_job_input", validate_job_input)
  .addNode("extract_job_facts_with_gemini", extract_job_facts_with_gemini)
  .addNode("validate_structured_output", validate_structured_output)
  .addNode("apply_job_template_rules_and_score", apply_job_template_rules_and_score)
  .addNode("persist_analysis", persist_analysis)
  .addEdge(START, "validate_job_input")
  .addEdge("validate_job_input", "extract_job_facts_with_gemini")
  .addEdge("extract_job_facts_with_gemini", "validate_structured_output")
  .addEdge("validate_structured_output", "apply_job_template_rules_and_score")
  .addEdge("apply_job_template_rules_and_score", "persist_analysis")
  .addEdge("persist_analysis", END);

export const quoteReadyGraph = builder.compile();

export async function runQuoteReadyAnalysis(
  input: Pick<WorkflowStateType, "job_id" | "job_type" | "raw_text" | "customer_suburb" | "image_paths" | "existing_version"> & {
    new_image_paths?: string[];
  },
): Promise<WorkflowStateType> {
  const result = await quoteReadyGraph.invoke({
    ...input,
    new_image_paths: input.new_image_paths ?? [],
  });
  return result as WorkflowStateType;
}
