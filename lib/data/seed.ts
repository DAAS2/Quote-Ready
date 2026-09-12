import type { ScopePack } from "@/lib/ai/schemas";
import { buildScopePack } from "@/lib/rules/engine";
import { deriveAnalysisStatus } from "@/lib/rules/status";
import { DEMO_JOB_SEEDS, type DemoJobSeed } from "./demo-seed";
import type { CreateJobInput, Store } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * Demo seeding: raw inputs → deterministic scope packs via the rules engine.
 * Shared by both stores so the demo can never drift from the rules.
 * ──────────────────────────────────────────────────────────────────────────── */

export function buildSeedPack(seed: DemoJobSeed, version = 1): ScopePack {
  return buildScopePack({
    job_type: seed.job_type,
    facts: seed.facts as never,
    evidence: seed.evidence,
    model_risk_flags: seed.model_risk_flags,
    raw_text: seed.enquiry_text,
    recommended_questions: seed.recommended_questions,
    version,
    produced_by: "seed",
  });
}

export function seedJobInputs(): CreateJobInput[] {
  return DEMO_JOB_SEEDS.map((seed) => ({
    customer: seed.customer,
    job_type: seed.job_type,
    enquiry_text: seed.enquiry_text,
    image_paths: seed.image_paths,
  }));
}

export function seedStatusFor(seed: DemoJobSeed) {
  const pack = buildSeedPack(seed);
  return deriveAnalysisStatus(pack);
}

/** Hours ago each demo job was created, for a realistic dashboard. */
export const SEED_AGE_HOURS: Record<DemoJobSeed["ref"], number> = {
  job_a: 2,
  job_b: 27,
  job_c: 4,
};

export function makeStoreKindLabel(store: Store): string {
  return store.kind === "supabase" ? "Supabase" : "Local demo";
}
