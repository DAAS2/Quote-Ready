import type { JobFacts, JobStatus, MessageType, ScopePack } from "@/lib/ai/schemas";
import { DEMO_JOB_SEEDS } from "./demo-seed";
import { buildSeedPack, SEED_AGE_HOURS } from "./seed";
import { deriveAnalysisStatus } from "@/lib/rules/status";
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
 * In-memory store. Fallback when Supabase is not configured, and the
 * read-only resilience layer for the demo. Full read/write parity.
 * ──────────────────────────────────────────────────────────────────────────── */

interface MemJob {
  id: string;
  customer: JobListItem["customer"];
  job_type: JobListItem["job_type"];
  status: JobStatus;
  readiness_score: number | null;
  safety_flag: boolean;
  inspection_recommended: boolean;
  enquiry_text: string | null;
  intake_channel?: string | null;
  extracted_facts: JobFacts;
  created_at: string;
  updated_at: string;
  image_paths: string[];
  scope: ScopePack | null;
  versions: ScopePack[];
  evidence: EvidenceRow[];
  audit: AuditRow[];
  drafts: DraftRow[];
}

const g = globalThis as unknown as { __qr_mem?: Map<string, MemJob> };
const jobs: Map<string, MemJob> = (g.__qr_mem ??= new Map());

function nowIso(): string {
  return new Date().toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function ensureSeed(): void {
  if (jobs.size > 0) return;
  for (const seed of DEMO_JOB_SEEDS) {
    const id = crypto.randomUUID();
    const pack = buildSeedPack(seed);
    const created = hoursAgo(SEED_AGE_HOURS[seed.ref]);
    const evidence: EvidenceRow[] = seed.evidence.map((e, i) => ({
      ...e,
      id: crypto.randomUUID(),
      storage_path:
        e.type === "photo_observation" ? (seed.image_paths[i] ?? null) : null,
      created_at: created,
    }));
    const job: MemJob = {
      id,
      customer: seed.customer,
      job_type: seed.job_type,
      status: deriveAnalysisStatus(pack),
      readiness_score: pack.readiness_score,
      safety_flag: pack.safety_flag,
      inspection_recommended: pack.inspection_recommended,
      enquiry_text: seed.enquiry_text,
      intake_channel: "text",
      extracted_facts: pack.facts,
      created_at: created,
      updated_at: created,
      image_paths: seed.image_paths,
      scope: pack,
      versions: [pack],
      evidence,
      audit: [
        {
          id: crypto.randomUUID(),
          actor_type: "user",
          event_type: "enquiry_received",
          summary: `Enquiry received from ${seed.customer.full_name} (${seed.image_paths.length} photo${seed.image_paths.length === 1 ? "" : "s"}).`,
          metadata: {},
          created_at: created,
        },
        {
          id: crypto.randomUUID(),
          actor_type: "ai",
          event_type: "analysis_completed",
          summary: `Analysis completed — readiness ${pack.readiness_score}%, ${pack.readiness_band.replace(/_/g, " ")}.`,
          metadata: { version: 1, produced_by: "seed" },
          created_at: created,
        },
      ],
      drafts: seed.seed_draft
        ? [
            {
              id: crypto.randomUUID(),
              message_type: seed.seed_draft.message_type,
              body: seed.seed_draft.body,
              requests_fields: seed.seed_draft.requests_fields,
              status: "draft" as const,
              created_at: created,
              approved_at: null,
            },
          ]
        : [],
    };
    jobs.set(id, job);
  }
}

export class MemoryStore implements Store {
  readonly kind = "memory" as const;

  async listJobs(): Promise<JobListItem[]> {
    ensureSeed();
    return [...jobs.values()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(toListItem);
  }

  async getJob(id: string): Promise<JobDetail | null> {
    ensureSeed();
    const job = jobs.get(id);
    if (!job) return null;
    return {
      ...toListItem(job),
      enquiry_text: job.enquiry_text,
      intake_channel: job.intake_channel as never ?? null,
      extracted_facts: job.extracted_facts,
      scope: job.scope,
      scope_version: job.scope?.version ?? null,
      versions: job.versions,
      evidence: [...job.evidence].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      audit_events: [...job.audit].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      drafts: [...job.drafts].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      image_paths: job.image_paths,
    };
  }

  async createJob(input: CreateJobInput): Promise<string> {
    ensureSeed();
    const id = crypto.randomUUID();
    const ts = nowIso();
    const job: MemJob = {
      id,
      customer: input.customer,
      job_type: input.job_type,
      status: "new",
      readiness_score: null,
      safety_flag: false,
      inspection_recommended: false,
      enquiry_text: input.enquiry_text,
      intake_channel: input.intake_channel ?? "text",
      extracted_facts: { symptoms: [], photo_count: input.image_paths.length, voice_note_count: 0, notes: [] },
      created_at: ts,
      updated_at: ts,
      image_paths: input.image_paths,
      scope: null,
      versions: [],
      evidence: [
        {
          id: crypto.randomUUID(),
          type: "customer_enquiry",
          claim: input.enquiry_text.slice(0, 280),
          source_reference: "enquiry_text",
          certainty: "high",
          created_at: ts,
        },
        ...input.image_paths.map((p, i) => ({
          id: crypto.randomUUID(),
          type: "photo_observation" as const,
          claim: "Photo attached by customer — awaiting analysis",
          source_reference: `image_${i + 1}`,
          storage_path: p,
          certainty: "low" as const,
          created_at: ts,
        })),
      ],
      audit: [
        {
          id: crypto.randomUUID(),
          actor_type: "user",
          event_type: "enquiry_received",
          summary: `Enquiry received from ${input.customer.full_name} (${input.image_paths.length} photo${input.image_paths.length === 1 ? "" : "s"}).`,
          metadata: {},
          created_at: ts,
        },
      ],
      drafts: [],
    };
    jobs.set(id, job);
    return id;
  }

  async updateJobFacts(id: string, facts: JobFacts, pack: ScopePack, imagePaths: string[]): Promise<void> {
    const job = jobs.get(id);
    if (!job) return;
    job.extracted_facts = facts;
    job.scope = pack;
    job.versions.push(pack);
    job.readiness_score = pack.readiness_score;
    job.safety_flag = pack.safety_flag;
    job.inspection_recommended = pack.inspection_recommended;
    job.status = deriveAnalysisStatus(pack);
    job.updated_at = nowIso();
    if (imagePaths.length > 0) {
      const known = new Set(job.image_paths);
      job.image_paths = [...job.image_paths, ...imagePaths.filter((p) => !known.has(p))];
    }
  }

  async addEvidence(jobId: string, items: EvidenceRow[]): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    job.evidence.push(...items);
    job.updated_at = nowIso();
  }

  async updateEnquiryText(id: string, enquiryText: string): Promise<void> {
    const job = jobs.get(id);
    if (!job) return;
    job.enquiry_text = enquiryText;
    job.updated_at = nowIso();
  }

  async setJobStatus(jobId: string, status: JobStatus): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    job.status = status;
    job.updated_at = nowIso();
  }

  async addDraft(
    jobId: string,
    draft: { message_type: MessageType; body: string; requests_fields: string[] },
  ): Promise<string> {
    const job = jobs.get(jobId);
    if (!job) throw new Error("job not found");
    const id = crypto.randomUUID();
    job.drafts.unshift({
      id,
      message_type: draft.message_type,
      body: draft.body,
      requests_fields: draft.requests_fields,
      status: "draft",
      created_at: nowIso(),
      approved_at: null,
    });
    return id;
  }

  async updateDraftBody(jobId: string, draftId: string, body: string): Promise<void> {
    const job = jobs.get(jobId);
    const d = job?.drafts.find((x) => x.id === draftId);
    if (d && d.status === "draft") {
      d.body = body;
      job!.updated_at = nowIso();
    }
  }

  async approveDraft(jobId: string, draftId: string, body?: string): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    const d = job.drafts.find((x) => x.id === draftId);
    if (d && d.status === "draft") {
      if (body !== undefined) d.body = body;
      d.status = "approved";
      d.approved_at = nowIso();
      job.updated_at = nowIso();
    }
  }

  async addAudit(jobId: string, event: AuditInsert): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    job.audit.unshift({
      id: crypto.randomUUID(),
      actor_type: event.actor_type,
      event_type: event.event_type,
      summary: event.summary,
      metadata: event.metadata ?? {},
      created_at: nowIso(),
    });
    job.updated_at = nowIso();
  }

  async listAudits(jobId: string): Promise<AuditRow[]> {
    const job = jobs.get(jobId);
    return job ? [...job.audit] : [];
  }

  async resetDemo(): Promise<void> {
    jobs.clear();
    ensureSeed();
  }
}

function toListItem(job: MemJob): JobListItem {
  return {
    id: job.id,
    customer: job.customer,
    job_type: job.job_type,
    status: job.status,
    readiness_score: job.readiness_score,
    safety_flag: job.safety_flag,
    inspection_recommended: job.inspection_recommended,
    suburb: job.customer.suburb ?? null,
    updated_at: job.updated_at,
    created_at: job.created_at,
    enquiry_text: job.enquiry_text,
    phone: job.customer.phone ?? null,
    photo_count: job.extracted_facts.photo_count ?? job.image_paths.length,
    voice_note_count: job.extracted_facts.voice_note_count,
    missing_hint: job.scope?.missing_fields[0]?.label ?? null,
    ready_note: job.extracted_facts.notes[0] ?? null,
  };
}

export const memoryStore = new MemoryStore();
