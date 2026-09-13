import { JOB_TEMPLATES, INSPECTION_RISK_FLAGS, type JobTemplate } from "./job-templates";
import type { JobType } from "@/lib/ai/schemas";
import type { Store, TemplateRow } from "@/lib/data/types";

/* ────────────────────────────────────────────────────────────────────────────
 * Template resolution: merge a stored (user-edited) template document over
 * its built-in base template, then pick the right template for a job.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Merge a stored document over the built-in base template. */
export function materialiseTemplate(row: TemplateRow): JobTemplate {
  const base = JOB_TEMPLATES[row.base_type];
  const doc = row.document;
  return {
    ...base,
    ...doc,
    type: row.base_type,
    label: row.name || base.label,
    blurb: row.blurb ?? base.blurb,
    required_fields: doc.required_fields?.length ? doc.required_fields : base.required_fields,
    questions: { ...base.questions, ...(doc.questions ?? {}) },
    assumptions: doc.assumptions?.length ? doc.assumptions : base.assumptions,
    exclusions: doc.exclusions?.length ? doc.exclusions : base.exclusions,
    inspection_conditions: doc.inspection_conditions?.length
      ? doc.inspection_conditions
      : base.inspection_conditions,
  };
}

/** Validate an incoming template document (lenient — UI-normalised). */
export function normaliseTemplateDocument(input: unknown): JobTemplate {
  const raw = (input ?? {}) as Record<string, unknown>;
  const fields = Array.isArray(raw.required_fields) ? raw.required_fields : [];
  const conditions = Array.isArray(raw.inspection_conditions) ? raw.inspection_conditions : [];

  const required_fields = fields
    .map((f) => f as Record<string, unknown>)
    .filter((f) => typeof f.key === "string" && f.key.length > 0 && typeof f.label === "string")
    .map((f) => ({
      key: String(f.key).slice(0, 60),
      label: String(f.label).slice(0, 120),
      critical: Boolean(f.critical),
      why: String(f.why ?? "").slice(0, 240),
      ask_customer: f.ask_customer !== false,
    }));

  const inspection_conditions = conditions
    .map((c) => c as Record<string, unknown>)
    .map((c) => {
      const label = String(c.label ?? "").slice(0, 160) || "Condition flagged for inspection";
      const flags = Array.isArray(c.any_risk_flag)
        ? (c.any_risk_flag as string[]).filter((f) => INSPECTION_RISK_FLAGS[f])
        : undefined;
      if (flags && flags.length > 0) return { any_risk_flag: flags, label };
      const facts = Array.isArray(c.any_fact)
        ? (c.any_fact as Array<{ key: string; value?: string }>)
          .filter((f) => typeof f?.key === "string")
          .map((f) => ({ key: f.key, value: f.value ?? "unknown" }))
        : undefined;
      if (facts && facts.length > 0) return { any_fact: facts, label };
      return null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    required_fields,
    questions: typeof raw.questions === "object" && raw.questions !== null
      ? Object.fromEntries(
        Object.entries(raw.questions as Record<string, unknown>)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k, String(v).slice(0, 300)]),
      )
      : {},
    assumptions: (Array.isArray(raw.assumptions) ? raw.assumptions : [])
      .map(String)
      .filter((s) => s.trim().length > 0)
      .slice(0, 12),
    exclusions: (Array.isArray(raw.exclusions) ? raw.exclusions : [])
      .map(String)
      .filter((s) => s.trim().length > 0)
      .slice(0, 12),
    inspection_conditions,
    min_photos_for_good_evidence: Math.max(0, Math.min(6, Number(raw.min_photos_for_good_evidence) || 2)),
    message_guidance: String(raw.message_guidance ?? "").slice(0, 400),
    type: "leaking_tap",
    label: String(raw.label ?? "").slice(0, 120),
    blurb: String(raw.blurb ?? "").slice(0, 300),
  };
}

/**
 * The template a job should be graded against:
 * 1. the template the enquiry was filed under (template_id), else
 * 2. the organisation's default template for that base type, else
 * 3. the built-in template.
 */
export async function resolveJobTemplate(
  store: Pick<Store, "getTemplate" | "listTemplates">,
  job: { job_type: JobType; template_id?: string | null },
): Promise<JobTemplate> {
  if (job.template_id) {
    const row = await store.getTemplate(job.template_id);
    if (row) return materialiseTemplate(row);
  }
  const defaults = await store.listTemplates();
  const def = defaults.find((t) => t.is_default && t.base_type === job.job_type);
  if (def) return materialiseTemplate(def);
  return JOB_TEMPLATES[job.job_type];
}
