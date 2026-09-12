import type {
  AuditEvent,
  EvidenceItem,
  JobFacts,
  JobStatus,
  JobType,
  MessageType,
  ScopePack,
} from "@/lib/ai/schemas";

export interface CustomerRecord {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  suburb?: string | null;
}

export interface EvidenceRow extends EvidenceItem {
  id: string;
  storage_path?: string | null;
  created_at: string;
}

export interface AuditRow extends AuditEvent {
  id: string;
  created_at: string;
}

export interface DraftRow {
  id: string;
  message_type: MessageType;
  body: string;
  requests_fields: string[];
  status: "draft" | "approved";
  created_at: string;
  approved_at: string | null;
}

export interface JobListItem {
  id: string;
  customer: CustomerRecord;
  job_type: JobType;
  status: JobStatus;
  readiness_score: number | null;
  safety_flag: boolean;
  suburb?: string | null;
  updated_at: string;
  created_at: string;
}

export interface JobDetail extends JobListItem {
  enquiry_text: string | null;
  extracted_facts: JobFacts;
  scope: ScopePack | null;
  scope_version: number | null;
  evidence: EvidenceRow[];
  audit_events: AuditRow[];
  drafts: DraftRow[];
  image_paths: string[];
}

export interface CreateJobInput {
  customer: CustomerRecord;
  job_type: JobType;
  enquiry_text: string;
  image_paths: string[];
}

export interface AuditInsert {
  actor_type: "user" | "ai" | "system";
  event_type: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface Store {
  readonly kind: "supabase" | "memory";
  listJobs(): Promise<JobListItem[]>;
  getJob(id: string): Promise<JobDetail | null>;
  createJob(input: CreateJobInput): Promise<string>;
  updateJobFacts(
    id: string,
    facts: JobFacts,
    pack: ScopePack,
    imagePaths: string[],
  ): Promise<void>;
  addEvidence(jobId: string, items: EvidenceRow[]): Promise<void>;
  setJobStatus(jobId: string, status: JobStatus): Promise<void>;
  addDraft(
    jobId: string,
    draft: { message_type: MessageType; body: string; requests_fields: string[] },
  ): Promise<string>;
  approveDraft(jobId: string, draftId: string): Promise<void>;
  addAudit(jobId: string, event: AuditInsert): Promise<void>;
  listAudits(jobId: string): Promise<AuditRow[]>;
  resetDemo(): Promise<void>;
}
