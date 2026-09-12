import type { JobFacts, JobStatus, ScopePack } from "@/lib/ai/schemas";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  AuditInsert,
  AuditRow,
  CreateJobInput,
  DraftRow,
  EvidenceRow,
  JobDetail,
  JobListItem,
  Store,
} from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * Supabase store. Every method degrades gracefully: the facade falls back
 * to the memory store if the client is unavailable or a call fails.
 * ──────────────────────────────────────────────────────────────────────────── */

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

type Client = NonNullable<ReturnType<typeof getServerSupabase>>;

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  constructor(private db: Client) {}

  private async customerId(customer: CreateJobInput["customer"]): Promise<string> {
    const { data, error } = await this.db
      .from("customers")
      .insert({
        organisation_id: DEMO_ORG_ID,
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
        organisation_id: DEMO_ORG_ID,
        customer_id: customerId,
        job_type: input.job_type,
        status: "new",
        intake_channel: input.intake_channel ?? "text",
        enquiry_text: input.enquiry_text,
        extracted_facts: {},
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
        `id, job_type, intake_channel, status, readiness_score, safety_flag, created_at, updated_at,
         customers!inner (full_name, suburb)`,
      )
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data.map((row) => {
      const c = Array.isArray(row.customers) ? row.customers[0] : row.customers;
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

  async resetDemo(): Promise<void> {
    await this.db.from("audit_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.db.from("message_drafts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.db.from("scope_versions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.db.from("job_evidence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.db.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.db.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
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
