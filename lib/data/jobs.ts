import { getServerSupabase } from "@/lib/supabase/server";
import { DEMO_ORG_ID, resolveOrgId } from "./org";
import { memoryStore } from "./memory-store";
import { SupabaseStore } from "./supabase-store";
import { buildSeedPack } from "./seed";
import { DEMO_JOB_SEEDS } from "./demo-seed";
import type { Store } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * Data facade. Prefers Supabase (scoped to the signed-in user's organisation,
 * or the shared demo org when browsing anonymously); falls back to the
 * in-memory demo store on any failure so the product never hard-fails.
 * ──────────────────────────────────────────────────────────────────────────── */

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

/** Ensure the org row exists (idempotent) — only needed for the shared demo org. */
async function ensureDemoOrg(): Promise<void> {
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

/**
 * Seed the demo jobs for the shared demo organisation (idempotent: only when
 * the demo org has no jobs). Signed-in users get an empty workspace instead.
 */
export async function ensureSeeded(): Promise<"supabase" | "memory" | "skipped"> {
  const db = getServerSupabase();
  if (db) {
    try {
      const orgId = await resolveOrgId(db);
      // Real (signed-in) workspaces start completely empty — demo enquiries,
      // templates and audit history live only in the shared anonymous demo org.
      if (orgId !== DEMO_ORG_ID) return "skipped";
      await ensureDemoOrg();

      const { count, error } = await db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", orgId);
      if (error) throw error;
      if ((count ?? 0) === 0) {
        const store = new SupabaseStore(db, orgId);
        for (const seed of DEMO_JOB_SEEDS) {
          const jobId = await store.createJob({
            customer: seed.customer,
            job_type: seed.job_type,
            enquiry_text: seed.enquiry_text,
            image_paths: seed.image_paths,
          });
          const pack = buildSeedPack(seed);
          await store.updateJobFacts(jobId, pack.facts, pack, []);
          if (seed.seed_draft) {
            await store.addDraft(jobId, seed.seed_draft);
          }
          await store.addAudit(jobId, {
            actor_type: "user",
            event_type: "enquiry_received",
            summary: `Enquiry received from ${seed.customer.full_name} (${seed.image_paths.length} photo${seed.image_paths.length === 1 ? "" : "s"}).`,
            metadata: {},
          });
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
  updateEnquiryText: (id: string, enquiryText: string) =>
    withFallback((s) => s.updateEnquiryText(id, enquiryText)),
  addEvidence: (...args: Parameters<Store["addEvidence"]>) =>
    withFallback((s) => s.addEvidence(...args)),
  setJobStatus: (...args: Parameters<Store["setJobStatus"]>) =>
    withFallback((s) => s.setJobStatus(...args)),
  addDraft: (...args: Parameters<Store["addDraft"]>) =>
    withFallback((s) => s.addDraft(...args)),
  approveDraft: (...args: Parameters<Store["approveDraft"]>) =>
    withFallback((s) => s.approveDraft(...args)),
  updateDraftBody: (...args: Parameters<Store["updateDraftBody"]>) =>
    withFallback((s) => s.updateDraftBody(...args)),
  addAudit: (...args: Parameters<Store["addAudit"]>) =>
    withFallback((s) => s.addAudit(...args)),
  listAudits: (id: string) => withFallback((s) => s.listAudits(id)),
  listRecentAuditFeed: (limit: number) =>
    withFallback((s) => s.listRecentAuditFeed(limit)),
  listTemplates: () => withFallback((s) => s.listTemplates()),
  getTemplate: (id: string) => withFallback((s) => s.getTemplate(id)),
  saveTemplate: (input: Parameters<Store["saveTemplate"]>[0]) =>
    withFallback((s) => s.saveTemplate(input)),
  deleteTemplate: (id: string) => withFallback((s) => s.deleteTemplate(id)),
  listQuotes: (jobId: string) => withFallback((s) => s.listQuotes(jobId)),
  getQuote: (id: string) => withFallback((s) => s.getQuote(id)),
  createQuote: (input: Parameters<Store["createQuote"]>[0]) =>
    withFallback((s) => s.createQuote(input)),
  updateQuote: (...args: Parameters<Store["updateQuote"]>) =>
    withFallback((s) => s.updateQuote(...args)),
  deleteQuote: (id: string) => withFallback((s) => s.deleteQuote(id)),
  listQuoteNumbers: () => withFallback((s) => s.listQuoteNumbers()),
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
