/* ────────────────────────────────────────────────────────────────────────────
 * Model cost estimation.
 *
 * These rates are an ASSUMPTION, not a live price feed, and the UI always
 * labels the result as an estimate "at the configured rates". Keep them in
 * sync with Google's published Gemini pricing, or override them per
 * environment (GEMINI_INPUT_USD_PER_M / GEMINI_OUTPUT_USD_PER_M) so a deployed
 * instance can carry its own real numbers.
 *
 * We deliberately report tokens and wall time as the primary facts and cost as
 * a derived convenience — token counts come back from the API, the dollars are
 * arithmetic on top of them.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ModelRate {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
}

const DEFAULT_RATES: Record<string, ModelRate> = {
  "gemini-3.6-flash": { input: 0.3, output: 2.5 },
};

function envRate(kind: "input" | "output"): number | null {
  const raw =
    kind === "input"
      ? process.env.GEMINI_INPUT_USD_PER_M
      : process.env.GEMINI_OUTPUT_USD_PER_M;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function rateFor(model: string | null): ModelRate {
  const base = (model && DEFAULT_RATES[model]) || { input: 0.3, output: 2.5 };
  return {
    input: envRate("input") ?? base.input,
    output: envRate("output") ?? base.output,
  };
}

/** Human-readable description of the rate card an estimate used. */
export function priceBasis(model: string | null): string {
  const rate = rateFor(model);
  return `estimated at configured rates: $${rate.input}/M input, $${rate.output}/M output (USD, ${model ?? "unknown model"})`;
}

/** Estimated USD for one run. Zero when no tokens were spent (fallback paths). */
export function estimateCostUsd(usage: {
  model: string | null;
  prompt_tokens: number;
  output_tokens: number;
}): number {
  const rate = rateFor(usage.model);
  const cost =
    (usage.prompt_tokens / 1_000_000) * rate.input +
    (usage.output_tokens / 1_000_000) * rate.output;
  return Number(cost.toFixed(6));
}
