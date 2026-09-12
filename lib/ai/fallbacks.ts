import { GeminiAnalysisSchema, type GeminiAnalysis, type JobType } from "@/lib/ai/schemas";
import type { DemoJobSeed } from "@/lib/data/demo-seed";

/* ────────────────────────────────────────────────────────────────────────────
 * Fallback analyses. Used when live Gemini is unavailable (outage, no key,
 * DEMO_MODE) so the product never fails in front of a judge. Seeded jobs
 * get their curated analysis; anything else gets an honest "needs review".
 * ──────────────────────────────────────────────────────────────────────────── */

export function buildFallbackAnalysis(input: {
  enquiry_text: string;
  job_type: JobType | null;
  photo_count: number;
  seed: DemoJobSeed | null;
}): { analysis: GeminiAnalysis; usedSeed: boolean } {
  if (input.seed) {
    const parsed = GeminiAnalysisSchema.safeParse({
      job_type: input.seed.job_type,
      confidence: input.seed.analysis_confidence,
      facts: {
        ...input.seed.facts,
        photo_count: input.seed.facts.photo_count ?? input.seed.image_paths.length,
        voice_note_count: 0,
      },
      evidence: input.seed.evidence,
      missing_fields: Object.keys(input.seed.facts)
        .filter((k) => input.seed!.facts[k] === undefined)
        .slice(0, 6),
      risk_flags: input.seed.model_risk_flags,
      recommended_questions: input.seed.recommended_questions,
    });
    if (parsed.success) {
      return { analysis: parsed.data, usedSeed: true };
    }
  }

  // Honest generic fallback: nothing invented.
  const parsed = GeminiAnalysisSchema.safeParse({
    job_type: input.job_type ?? "leaking_tap",
    confidence: 0,
    facts: {
      photo_count: input.photo_count,
      voice_note_count: 0,
      symptoms: [],
      notes: [],
    },
    evidence: [
      {
        type: "customer_enquiry" as const,
        claim: "Enquiry received — automated analysis was unavailable, manual review required",
        source_reference: "enquiry_text",
        certainty: "high" as const,
      },
    ],
    missing_fields: [],
    risk_flags: [],
    recommended_questions: [],
  });
  if (parsed.success) {
    return { analysis: parsed.data, usedSeed: false };
  }
  throw new Error("fallback analysis failed to parse — this is a bug");
}
