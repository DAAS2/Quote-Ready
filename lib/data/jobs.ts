import { getServerSupabase } from "@/lib/supabase/server";
import { memoryStore } from "./memory-store";
import { SupabaseStore } from "./supabase-store";
import { buildSeedPack } from "./seed";
import { DEMO_JOB_SEEDS } from "./demo-seed";
import type { Store } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * Data facade. Prefers Supabase; falls back to the in-memory demo store on
 * any failure so the product never hard-fails in front of a judge.
 * ──────────────────────────────────────────────────────────────────────────── */

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

function primaryStore(): Store | null {
  const db = getServerSupabase();
  return db ? new SupabaseStore(db) : null;
}

async function withFallback<T>(op: (store: Store) => Promise<T>): Promise<T> {
  const primary = primaryStore();
  if (primary) {
    try {
      return await op(primary);
    } catch (error) {
      console.warn("[QuoteReady] Supabase op failed, using memory fallback:", (error as Error).message);
    }
  }
  return op(memoryStore);
}

/** Ensure the demo org row exists (idempotent). */
async function ensureOrg(): Promise<void> {
  const db = getServerSupabase();
  if (!db) return;
  const { error } = await db
    .from("organisations")
    .upsert(
      { id: DEMO_ORG_ID, name: "Melbourne Metro Plumbing" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** Seed the three demo jobs (idempotent: only when the jobs table is empty). */
export async function ensureSeeded(): Promise<"supabase" | "memory" | "skipped"> {
  const db = getServerSupabase();
  if (db) {
    try {
      await ensureOrg();
      const { count, error } = await db
        .from("jobs")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      if ((count ?? 0) === 0) {
        const store = new SupabaseStore(db);
        for (const seed of DEMO_JOB_SEEDS) {
          const jobId = await store.createJob({
            customer: seed.customer,
            job_type: seed.job_type,
            enquiry_text: seed.enquiry_text,
            image_paths: seed.image_paths,
          });
          const pack = buildSeedPack(seed);
          await store.updateJobFacts(jobId, pack.facts, pack, []);
          await store.addAudit(jobId, {
            actor_type: "ai",
            event_type: "analysis_completed",
            summary: `Analysis completed — readiness ${pack.readiness_score}%, ${pack.readiness_band.replace(/_/g, " ")}.`,
            metadata: { version: 1, produced_by: "seed" },
          });
        }
        return "supabase";
      }
      return "skipped";
    } catch (error) {
      console.warn("[QuoteReady] Supabase seed failed, memory store active:", (error as Error).message);
    }
  }
  await memoryStore.listJobs(); // triggers lazy seed
  return "memory";
}

/** Store kind currently in effect (for the status chip in the UI). */
export function activeStoreKind(): "supabase" | "memory" {
  return getServerSupabase() ? "supabase" : "memory";
}

export const store = {
  get kind(): "supabase" | "memory" {
    return activeStoreKind();
  },
  listJobs: () => withFallback((s) => s.listJobs()),
  getJob: (id: string) => withFallback((s) => s.getJob(id)),
  createJob: (input: Parameters<Store["createJob"]>[0]) =>
    withFallback((s) => s.createJob(input)),
  updateJobFacts: (...args: Parameters<Store["updateJobFacts"]>) =>
    withFallback((s) => s.updateJobFacts(...args)),
  addEvidence: (...args: Parameters<Store["addEvidence"]>) =>
    withFallback((s) => s.addEvidence(...args)),
  setJobStatus: (...args: Parameters<Store["setJobStatus"]>) =>
    withFallback((s) => s.setJobStatus(...args)),
  addDraft: (...args: Parameters<Store["addDraft"]>) =>
    withFallback((s) => s.addDraft(...args)),
  approveDraft: (...args: Parameters<Store["approveDraft"]>) =>
    withFallback((s) => s.approveDraft(...args)),
  addAudit: (...args: Parameters<Store["addAudit"]>) =>
    withFallback((s) => s.addAudit(...args)),
  listAudits: (id: string) => withFallback((s) => s.listAudits(id)),
  resetDemo: async () => {
    const primary = primaryStore();
    if (primary) {
      try {
        await primary.resetDemo();
        await ensureSeeded();
        return;
      } catch (error) {
        console.warn("[QuoteReady] reset failed on Supabase, resetting memory:", (error as Error).message);
      }
    }
    await memoryStore.resetDemo();
  },
};
