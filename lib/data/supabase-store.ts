import type { JobFacts, JobStatus, ScopePack } from "@/lib/ai/schemas";
import type {
  CreateQuoteRecordInput,
  QuoteDocument,
  QuoteRecord,
  QuoteStatus,
  QuoteTotals,
} from "@/lib/quotes/schema";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEMO_ORG_ID, resolveOrgId } from "./org";
import type {
  AuditFeedRow,
  AuditInsert,
  AuditRow,
  CreateJobInput,
  DraftRow,
  EvidenceRow,
  JobDetail,
  JobListItem,
  SaveTemplateInput,
  Store,
  TemplateRow,
} from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * Supabase store. Every method degrades gracefully: the facade falls back
 * to the memory store if the client is unavailable or a call fails.
 * All rows are scoped to the signed-in user's organisation (demo org when
 * browsing anonymously).
 * ──────────────────────────────────────────────────────────────────────────── */

type Client = NonNullable<ReturnType<typeof getServerSupabase>>;

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private orgCache: string | null;

  constructor(
    private db: Client,
    orgId?: string | null,
  ) {
    this.orgCache = orgId ?? null;
  }

  /** Resolve (and cache) the organisation for this request. */
  private async org(): Promise<string> {
    if (this.orgCache) return this.orgCache;
    this.orgCache = await resolveOrgId(this.db).catch(() => DEMO_ORG_ID);
    return this.orgCache;
  }

  private async customerId(customer: CreateJobInput["customer"]): Promise<string> {
    const { data, error } = await this.db
      .from("customers")
      .insert({
        organisation_id: await this.org(),
        full_name: customer.full_name,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        suburb: customer.suburb ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async createJob(input: CreateJobInput): Promise<string> {
    const customerId = await this.customerId(input.customer);
    const { data, error } = await this.db
      .from("jobs")
      .insert({
        organisation_id: await this.org(),
        customer_id: customerId,
        job_type: input.job_type,
        status: "new",
        intake_channel: input.intake_channel ?? "text",
        enquiry_text: input.enquiry_text,
        extracted_facts: {},
        ...(input.template_id ? { template_id: input.template_id } : {}),
      })
      .select("id")
      .single();
    if (error) throw error;

    const rows = [
      {
        job_id: data.id,
        evidence_type: "enquiry",
        source_label: "enquiry_text",
        transcript: input.enquiry_text,
        extracted_data: {},
      },
      ...input.image_paths.map((p, i) => ({
        job_id: data.id,
        evidence_type: "image",
        source_label: `image_${i + 1}`,
        storage_path: p,
        extracted_data: {},
      })),
    ];
    const { error: evErr } = await this.db.from("job_evidence").insert(rows);
    if (evErr) throw evErr;
    return data.id;
  }

  async listJobs(): Promise<JobListItem[]> {
    const { data, error } = await this.db
      .from("jobs")
      .select(
        `id, job_type, intake_channel, status, readiness_score, safety_flag, created_at, updated_at, enquiry_text, extracted_facts,
         customers!inner (full_name, phone, suburb)`,
      )
      .eq("organisation_id", await this.org())
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data.map((row) => {
      const c = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const facts = (row.extracted_facts ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        customer: {
          full_name: c.full_name,
          suburb: c.suburb,
        },
        job_type: row.job_type,
        intake_channel: row.intake_channel ?? null,
        status: row.status,
        readiness_score: row.readiness_score,
        safety_flag: row.safety_flag,
        suburb: c.suburb,
        created_at: row.created_at,
        updated_at: row.updated_at,
        enquiry_text: row.enquiry_text ?? null,
        phone: c.phone ?? null,
        photo_count:
          typeof facts.photo_count === "number" ? facts.photo_count : null,
        voice_note_count:
          typeof facts.voice_note_count === "number"
            ? facts.voice_note_count
            : null,
      };
    });
  }

  async getJob(id: string): Promise<JobDetail | null> {
    const { data, error } = await this.db
      .from("jobs")
      .select(
        `*, customers!inner (full_name, phone, email, suburb)`,
      )
      .eq("id", id)
      .eq("organisation_id", await this.org())
      .single();
    if (error || !data) return null;
    const c = Array.isArray(data.customers) ? data.customers[0] : data.customers;

    const [evidence, audits, drafts, scopes] = await Promise.all([
      this.db
        .from("job_evidence")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: true }),
      this.db
        .from("audit_events")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
      this.db
        .from("message_drafts")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
      this.db
        .from("scope_versions")
        .select("version_number, scope")
        .eq("job_id", id)
        .order("version_number", { ascending: true }),
    ]);

    const versions = (scopes.data ?? []).map((r) => r.scope as ScopePack);
    const latestScope = versions[versions.length - 1];

    return {
      id: data.id,
      customer: {
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        suburb: c.suburb,
      },
      job_type: data.job_type,
      intake_channel: data.intake_channel ?? null,
      status: data.status,
      readiness_score: data.readiness_score,
      safety_flag: data.safety_flag,
      suburb: c.suburb,
      created_at: data.created_at,
      updated_at: data.updated_at,
      enquiry_text: data.enquiry_text,
      extracted_facts: (latestScope?.facts ?? data.extracted_facts) as JobFacts,
      scope: latestScope ?? null,
      scope_version: latestScope?.version ?? null,
      versions,
      evidence: (evidence.data ?? []).map(toEvidenceRow),
      audit_events: (audits.data ?? []).map(toAuditRow),
      drafts: (drafts.data ?? []).map(toDraftRow),
      template_id: data.template_id ?? null,
      image_paths: (evidence.data ?? [])
        .filter((e) => e.evidence_type === "image" && e.storage_path)
        .map((e) => e.storage_path as string),
    };
  }

  async updateJobFacts(
    id: string,
    facts: JobFacts,
    pack: ScopePack,
    imagePaths: string[],
  ): Promise<void> {
    const { error } = await this.db
      .from("jobs")
      .update({
        extracted_facts: facts,
        readiness_score: pack.readiness_score,
        safety_flag: pack.safety_flag,
        inspection_recommended: pack.inspection_recommended,
        status: pack.status,
      })
      .eq("id", id);
    if (error) throw error;

    const { error: svErr } = await this.db.from("scope_versions").insert({
      job_id: id,
      version_number: pack.version,
      readiness_score: pack.readiness_score,
      status: pack.status,
      scope: pack,
      created_by: pack.produced_by,
    });
    if (svErr) throw svErr;

    if (imagePaths.length > 0) {
      const { error: evErr } = await this.db.from("job_evidence").insert(
        imagePaths.map((p, i) => ({
          job_id: id,
          evidence_type: "image",
          source_label: `image_${i + 1}`,
          storage_path: p,
          extracted_data: {},
        })),
      );
      if (evErr) throw evErr;
    }
  }

  async addEvidence(jobId: string, items: EvidenceRow[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.db.from("job_evidence").insert(
      items.map((item) => ({
        job_id: jobId,
        evidence_type: mapEvidenceType(item.type),
        storage_path: item.storage_path ?? null,
        transcript: item.type === "voice_note" ? item.claim : null,
        source_label: item.source_reference,
        extracted_data: {
          claim: item.claim,
          certainty: item.certainty ?? null,
          fact_key: item.fact_key ?? null,
        },
      })),
    );
    if (error) throw error;
  }

  async updateEnquiryText(id: string, enquiryText: string): Promise<void> {
    const { error } = await this.db
      .from("jobs")
      .update({ enquiry_text: enquiryText })
      .eq("id", id);
    if (error) throw error;
  }

  async deleteJob(id: string): Promise<void> {
    const org = await this.org();
    // remember the customer so we can tidy it up once the job is gone
    const { data } = await this.db
      .from("jobs")
      .select("customer_id")
      .eq("id", id)
      .eq("organisation_id", org)
      .maybeSingle();

    const { error } = await this.db
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("organisation_id", org);
    if (error) throw error;

    // evidence, audits, drafts, scopes and quotes cascade off the job row.
    // The customer is only removed if no other enquiry still points at it.
    const customerId = data?.customer_id as string | null | undefined;
    if (customerId) {
      const { count } = await this.db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId);
      if ((count ?? 0) === 0) {
        await this.db.from("customers").delete().eq("id", customerId).eq("organisation_id", org);
      }
    }
  }

  async setJobStatus(jobId: string, status: JobStatus): Promise<void> {
    const { error } = await this.db
      .from("jobs")
      .update({ status })
      .eq("id", jobId);
    if (error) throw error;
  }

  async addDraft(
    jobId: string,
    draft: { message_type: string; body: string; requests_fields: string[] },
  ): Promise<string> {
    const { data, error } = await this.db
      .from("message_drafts")
      .insert({
        job_id: jobId,
        message_type: draft.message_type,
        body: draft.body,
        requests_fields: draft.requests_fields,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async updateDraftBody(jobId: string, draftId: string, body: string): Promise<void> {
    const { error } = await this.db
      .from("message_drafts")
      .update({ body })
      .eq("id", draftId)
      .eq("job_id", jobId)
      .eq("status", "draft");
    if (error) throw error;
  }

  async approveDraft(jobId: string, draftId: string, body?: string): Promise<void> {
    const { error } = await this.db
      .from("message_drafts")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        ...(body !== undefined ? { body } : {}),
      })
      .eq("id", draftId)
      .eq("job_id", jobId)
      .eq("status", "draft");
    if (error) throw error;
  }

  async addAudit(jobId: string, event: AuditInsert): Promise<void> {
    const { error } = await this.db.from("audit_events").insert({
      job_id: jobId,
      actor_type: event.actor_type,
      event_type: event.event_type,
      summary: event.summary,
      metadata: event.metadata ?? {},
    });
    if (error) throw error;
  }

  async listAudits(jobId: string): Promise<AuditRow[]> {
    const { data, error } = await this.db
      .from("audit_events")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(toAuditRow);
  }

  async listRecentAuditFeed(limit: number): Promise<AuditFeedRow[]> {
    const { data, error } = await this.db
      .from("audit_events")
      .select(
        `id, actor_type, event_type, summary, metadata, created_at,
         jobs!inner (id, organisation_id, customers (full_name))`,
      )
      .eq("jobs.organisation_id", await this.org())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as unknown as Array<{
      id: string;
      actor_type: string;
      event_type: string;
      summary: string;
      metadata: Record<string, unknown>;
      created_at: string;
      jobs: { id: string; customers: { full_name: string } | { full_name: string }[] };
    }>).map((row) => {
      const customer = Array.isArray(row.jobs.customers)
        ? row.jobs.customers[0]
        : row.jobs.customers;
      return { ...toAuditRow(row), job_id: row.jobs.id, job_name: customer?.full_name ?? "Job" };
    });
  }

  async listTemplates(): Promise<TemplateRow[]> {
    const { data, error } = await this.db
      .from("job_templates")
      .select("*")
      .eq("organisation_id", await this.org())
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toTemplateRow);
  }

  async getTemplate(id: string): Promise<TemplateRow | null> {
    const { data, error } = await this.db
      .from("job_templates")
      .select("*")
      .eq("id", id)
      .eq("organisation_id", await this.org())
      .maybeSingle();
    if (error || !data) return null;
    return toTemplateRow(data);
  }

  async saveTemplate(input: SaveTemplateInput): Promise<string> {
    const org = await this.org();
    const row = {
      organisation_id: org,
      base_type: input.base_type,
      name: input.name,
      blurb: input.blurb ?? null,
      is_default: input.is_default,
      document: input.document,
    };
    if (input.id) {
      const { data, error } = await this.db
        .from("job_templates")
        .update(row)
        .eq("id", input.id)
        .eq("organisation_id", org)
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Template not found.");
      await this.clearOtherDefaults(org, input.base_type, data.id, input.is_default);
      return data.id;
    }
    const { data, error } = await this.db
      .from("job_templates")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not save the template.");
    await this.clearOtherDefaults(org, input.base_type, data.id, input.is_default);
    return data.id;
  }

  private async clearOtherDefaults(
    org: string,
    baseType: string,
    keepId: string,
    isDefault: boolean,
  ): Promise<void> {
    if (!isDefault) return;
    await this.db
      .from("job_templates")
      .update({ is_default: false })
      .eq("organisation_id", org)
      .eq("base_type", baseType)
      .neq("id", keepId);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db
      .from("job_templates")
      .delete()
      .eq("id", id)
      .eq("organisation_id", await this.org());
  }

  async listQuotes(jobId: string): Promise<QuoteRecord[]> {
    const { data, error } = await this.db
      .from("quotes")
      .select("*")
      .eq("job_id", jobId)
      .eq("organisation_id", await this.org())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toQuoteRecord);
  }

  async getQuote(id: string): Promise<QuoteRecord | null> {
    const { data, error } = await this.db
      .from("quotes")
      .select("*")
      .eq("id", id)
      .eq("organisation_id", await this.org())
      .maybeSingle();
    if (error || !data) return null;
    return toQuoteRecord(data);
  }

  async createQuote(input: CreateQuoteRecordInput): Promise<string> {
    const { data, error } = await this.db
      .from("quotes")
      .insert({
        organisation_id: await this.org(),
        job_id: input.job_id,
        quote_number: input.quote_number,
        status: input.status ?? "draft",
        document: input.document,
        subtotal_cents: input.totals.subtotal_cents,
        gst_cents: input.totals.gst_cents,
        total_cents: input.totals.total_cents,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not save the quote.");
    return data.id;
  }

  async updateQuote(
    id: string,
    patch: { document: QuoteDocument; totals: QuoteTotals; status?: QuoteStatus },
  ): Promise<void> {
    const { error } = await this.db
      .from("quotes")
      .update({
        document: patch.document,
        subtotal_cents: patch.totals.subtotal_cents,
        gst_cents: patch.totals.gst_cents,
        total_cents: patch.totals.total_cents,
        ...(patch.status ? { status: patch.status } : {}),
      })
      .eq("id", id)
      .eq("organisation_id", await this.org());
    if (error) throw error;
  }

  async deleteQuote(id: string): Promise<void> {
    const { error } = await this.db
      .from("quotes")
      .delete()
      .eq("id", id)
      .eq("organisation_id", await this.org());
    if (error) throw error;
  }

  async listQuoteNumbers(): Promise<string[]> {
    const { data, error } = await this.db
      .from("quotes")
      .select("quote_number")
      .eq("organisation_id", await this.org());
    if (error) throw error;
    return (data ?? []).map((row) => row.quote_number as string);
  }

  async resetDemo(): Promise<void> {
    const org = await this.org();
    await this.db.from("jobs").delete().eq("organisation_id", org);
    await this.db.from("customers").delete().eq("organisation_id", org);
    await this.db.from("quotes").delete().eq("organisation_id", org);
  }
}

function mapEvidenceType(t: EvidenceRow["type"]): string {
  switch (t) {
    case "customer_enquiry":
      return "enquiry";
    case "photo_observation":
      return "image";
    case "voice_note":
      return "voice_note";
    case "customer_reply":
      return "customer_reply";
    default:
      return "manual_note";
  }
}

function toEvidenceRow(row: {
  id: string;
  evidence_type: string;
  storage_path: string | null;
  transcript: string | null;
  source_label: string | null;
  extracted_data: Record<string, unknown>;
  created_at: string;
}): EvidenceRow {
  const d = row.extracted_data ?? {};
  return {
    id: row.id,
    type: reverseEvidenceType(row.evidence_type),
    claim: (d.claim as string) ?? row.transcript ?? "Evidence item",
    source_reference: row.source_label ?? "unknown",
    certainty: (d.certainty as "high" | "medium" | "low" | undefined) ?? undefined,
    fact_key: (d.fact_key as string | undefined) ?? undefined,
    storage_path: row.storage_path,
    created_at: row.created_at,
  };
}

function reverseEvidenceType(t: string): EvidenceRow["type"] {
  switch (t) {
    case "enquiry":
      return "customer_enquiry";
    case "image":
      return "photo_observation";
    case "voice_note":
      return "voice_note";
    case "customer_reply":
      return "customer_reply";
    default:
      return "manual_note";
  }
}

function toAuditRow(row: {
  id: string;
  actor_type: string;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}): AuditRow {
  return {
    id: row.id,
    actor_type: row.actor_type as AuditRow["actor_type"],
    event_type: row.event_type,
    summary: row.summary,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

function toTemplateRow(row: {
  id: string;
  organisation_id: string;
  base_type: string;
  name: string;
  blurb: string | null;
  is_default: boolean;
  document: TemplateRow["document"];
  created_at: string;
  updated_at: string;
}): TemplateRow {
  return {
    id: row.id,
    organisation_id: row.organisation_id,
    base_type: row.base_type as TemplateRow["base_type"],
    name: row.name,
    blurb: row.blurb,
    is_default: row.is_default,
    document: row.document,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toQuoteRecord(row: {
  id: string;
  job_id: string;
  quote_number: string;
  status: string;
  document: QuoteDocument;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
}): QuoteRecord {
  const document = row.document;
  const subtotal = row.subtotal_cents ?? 0;
  const gst = row.gst_cents ?? 0;
  const total = row.total_cents ?? 0;
  const deposit = Math.round((total * (document?.deposit_percent ?? 0)) / 100);
  return {
    id: row.id,
    job_id: row.job_id,
    quote_number: row.quote_number,
    status: row.status as QuoteStatus,
    document,
    totals: {
      subtotal_cents: subtotal,
      gst_cents: gst,
      total_cents: total,
      deposit_cents: deposit,
      balance_cents: total - deposit,
    },
    customer_name: document?.customer?.name ?? "",
    job_type_label: document?.job_type_label ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toDraftRow(row: {
  id: string;
  message_type: string;
  body: string;
  requests_fields: string[];
  status: string;
  created_at: string;
  approved_at: string | null;
}): DraftRow {
  return {
    id: row.id,
    message_type: row.message_type as DraftRow["message_type"],
    body: row.body,
    requests_fields: row.requests_fields ?? [],
    status: row.status as DraftRow["status"],
    created_at: row.created_at,
    approved_at: row.approved_at,
  };
}
