import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────────────
 * Core domain schemas for QuoteReady.
 * These are the single source of truth: Gemini output is validated against
 * them server-side, the rules engine consumes them, and the UI renders them.
 * ──────────────────────────────────────────────────────────────────────────── */

export const JobTypeEnum = z.enum([
  "leaking_tap",
  "toilet_repair",
  "hot_water_system",
]);
export type JobType = z.infer<typeof JobTypeEnum>;

export const UrgencyEnum = z.enum([
  "emergency",
  "urgent",
  "standard",
  "flexible",
]);
export type Urgency = z.infer<typeof UrgencyEnum>;

export const WaterDamageEnum = z.enum(["none_visible", "possible", "confirmed"]);

export const JobStatusEnum = z.enum([
  "new",
  "analysed",
  "needs_information",
  "inspection_recommended",
  "ready_for_estimate",
  "follow_up_drafted",
  "follow_up_approved",
  "inspection_requested",
  "closed",
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

/** How the enquiry reached the business. */
export const IntakeChannelEnum = z.enum([
  "text",
  "call",
  "web_form",
  "email",
  "in_person",
]);
export type IntakeChannel = z.infer<typeof IntakeChannelEnum>;

export const INTAKE_CHANNEL_LABELS: Record<IntakeChannel, string> = {
  text: "Text / SMS",
  call: "Phone call",
  web_form: "Web form",
  email: "Email",
  in_person: "In person",
};

export const ReadinessBandEnum = z.enum([
  "needs_information",
  "inspection_recommended",
  "ready_for_estimate",
]);
export type ReadinessBand = z.infer<typeof ReadinessBandEnum>;

/* ── Facts extracted from customer input ─────────────────────────────────── */

export const JobFactsSchema = z.object({
  location_in_property: z.string().max(80).optional(),
  fixture_type: z.string().max(80).optional(),
  system_type: z.string().max(80).optional(),
  system_age: z.string().max(40).optional(),
  symptoms: z.array(z.string().max(60)).max(10).default([]),
  urgency: UrgencyEnum.optional(),
  property_access: z.string().max(80).optional(),
  water_isolation_access: z.string().max(80).optional(),
  water_damage: WaterDamageEnum.optional(),
  customer_availability: z.string().max(80).optional(),
  suburb: z.string().max(60).optional(),
  photo_count: z.number().int().nonnegative().max(20).default(0),
  voice_note_count: z.number().int().nonnegative().max(20).default(0),
  /** free-form extras the model deems relevant but that have no dedicated key */
  notes: z.array(z.string().max(120)).max(8).default([]),
});
export type JobFacts = z.infer<typeof JobFactsSchema>;

export const EMPTY_FACTS: JobFacts = {
  symptoms: [],
  photo_count: 0,
  voice_note_count: 0,
  notes: [],
};

/* ── Evidence: every displayed fact must be traceable to a source ────────── */

export const EvidenceTypeEnum = z.enum([
  "customer_enquiry",
  "photo_observation",
  "voice_note",
  "manual_note",
  "customer_reply",
]);

export const EvidenceItemSchema = z.object({
  type: EvidenceTypeEnum,
  /** the extracted claim, in plain language */
  claim: z.string().min(1).max(300),
  /** enquiry_text | image_1 | image_2 | voice_note_1 | operator */
  source_reference: z.string().min(1).max(60),
  certainty: z.enum(["high", "medium", "low"]).optional(),
  /** which fact key this evidence supports, when it maps to one */
  fact_key: z.string().max(60).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/* ── Raw Gemini extraction output (validated, never trusted blind) ───────── */

export const GeminiAnalysisSchema = z.object({
  job_type: JobTypeEnum,
  confidence: z.number().min(0).max(1),
  facts: JobFactsSchema,
  evidence: z.array(EvidenceItemSchema).max(20).default([]),
  /** fact keys the model could not determine */
  missing_fields: z.array(z.string().max(60)).max(20).default([]),
  risk_flags: z.array(z.string().max(60)).max(10).default([]),
  recommended_questions: z.array(z.string().max(200)).max(10).default([]),
});
export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;

/* ── Readiness engine output ─────────────────────────────────────────────── */

export const RiskFlagSchema = z.object({
  id: z.string().max(60),
  label: z.string().max(120),
  severity: z.enum(["attention", "high", "safety"]),
  source: z.string().max(60).optional(),
  /** drives the inspection override when true */
  requires_inspection: z.boolean().default(false),
});
export type RiskFlag = z.infer<typeof RiskFlagSchema>;

export const MissingFieldSchema = z.object({
  key: z.string().max(60),
  label: z.string().max(120),
  why: z.string().max(240),
  critical: z.boolean(),
  /** ask-this-in-the-followup-message */
  ask_customer: z.boolean().default(true),
});
export type MissingField = z.infer<typeof MissingFieldSchema>;

export const ReadinessComponentsSchema = z.object({
  details: z.number().min(0).max(100),
  evidence: z.number().min(0).max(100),
  access: z.number().min(0).max(100),
  confirmation: z.number().min(0).max(100),
  risk: z.number().min(0).max(100),
});
export type ReadinessComponents = z.infer<typeof ReadinessComponentsSchema>;

export const RecommendedActionTypeEnum = z.enum([
  "request_information",
  "inspection",
  "estimate_review",
  "safety_escalation",
]);
export type RecommendedActionType = z.infer<typeof RecommendedActionTypeEnum>;

export const RecommendedActionSchema = z.object({
  type: RecommendedActionTypeEnum,
  title: z.string().max(120),
  rationale: z.string().max(400),
  /** false when safety rules block estimate paths */
  estimate_eligible: z.boolean().default(false),
});
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

/* ── Retrieved service guidance (RAG — informs wording, never decisions) ─── */
export const GuidanceNoteSchema = z.object({
  id: z.string().max(80),
  title: z.string().max(160),
  body: z.string().max(700),
  source: z.string().max(80).default("QuoteReady service playbook"),
  reference: z.string().max(40).default("QR-PB-000"),
  job_type: z.string().max(40).default("any"),
  /** cosine similarity when retrieved by vector, normalised match score otherwise */
  score: z.number().min(0).max(1).default(0),
  /** the fact values / risk ids this note answered to — shown as the reason */
  matched_on: z.array(z.string().max(60)).max(10).default([]),
});
export type GuidanceNote = z.infer<typeof GuidanceNoteSchema>;

export const RetrievalModeEnum = z.enum(["vector", "lexical", "skipped"]);
export type RetrievalMode = z.infer<typeof RetrievalModeEnum>;

/* ── Per-run telemetry (latency + token accounting) ──────────────────────── */
export const AnalysisMetricsSchema = z.object({
  model: z.string().max(80).nullable().default(null),
  prompt_tokens: z.number().int().nonnegative().default(0),
  output_tokens: z.number().int().nonnegative().default(0),
  total_tokens: z.number().int().nonnegative().default(0),
  /** end-to-end wall time for the analysis run */
  duration_ms: z.number().int().nonnegative().default(0),
  /** per-node wall time, for spotting which step is actually slow */
  nodes: z.record(z.string(), z.number().nonnegative()).default({}),
  retrieval: z
    .object({
      mode: RetrievalModeEnum.default("skipped"),
      notes: z.number().int().nonnegative().default(0),
      ms: z.number().int().nonnegative().default(0),
    })
    .default({ mode: "skipped", notes: 0, ms: 0 }),
  /**
   * Estimated spend for the run. Always an estimate: the rate card it used is
   * named in `cost_basis` so the operator can audit the arithmetic.
   */
  estimated_cost_usd: z.number().nonnegative().default(0),
  cost_basis: z.string().max(160).default(""),
});
export type AnalysisMetrics = z.infer<typeof AnalysisMetricsSchema>;

export const ScopePackSchema = z.object({
  version: z.number().int().positive(),
  job_type: JobTypeEnum,
  /** the fact set this pack was built from — kept for self-contained persistence */
  facts: JobFactsSchema,
  status: JobStatusEnum,
  readiness_score: z.number().int().min(0).max(100),
  readiness_band: ReadinessBandEnum,
  components: ReadinessComponentsSchema,
  known_facts: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
  missing_fields: z.array(MissingFieldSchema).max(20),
  assumptions: z.array(z.string().max(240)).max(12),
  exclusions: z.array(z.string().max(240)).max(12),
  risk_flags: z.array(RiskFlagSchema).max(10),
  safety_flag: z.boolean(),
  inspection_recommended: z.boolean(),
  recommended_action: RecommendedActionSchema,
  evidence: z.array(EvidenceItemSchema).max(30),
  /** populated when the pack was produced by a fallback instead of live AI */
  produced_by: z.enum(["ai_analysis", "voice_update", "manual_edit", "fallback", "seed"]),
  override_reasons: z.array(z.string().max(160)).max(10).default([]),
  /** cited service playbook notes for this job's facts (empty when unavailable) */
  guidance: z.array(GuidanceNoteSchema).max(6).default([]),
  /** latency + token accounting for the run that produced this version */
  metrics: AnalysisMetricsSchema.optional(),
});
export type ScopePack = z.infer<typeof ScopePackSchema>;

/* ── Human-approved customer messages ────────────────────────────────────── */

export const MessageTypeEnum = z.enum([
  "request_information",
  "inspection_recommended",
]);
export type MessageType = z.infer<typeof MessageTypeEnum>;

export const MessageDraftSchema = z.object({
  message_type: MessageTypeEnum,
  body: z.string().min(1),
  requests_fields: z.array(z.string().max(60)).default([]),
});
export type MessageDraft = z.infer<typeof MessageDraftSchema>;

/* ── Audit events ────────────────────────────────────────────────────────── */

export const AuditEventSchema = z.object({
  actor_type: z.enum(["user", "ai", "system"]),
  event_type: z.string().max(60),
  summary: z.string().max(300),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

/* ── Voice-intake form filling (Gemini on a dictated enquiry) ────────────── */

export const IntakeExtractionSchema = z.object({
  customer_name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  suburb: z.string().max(80).optional(),
  job_type: JobTypeEnum.optional(),
  message: z.string().max(2000).optional(),
  availability: z.string().max(120).optional(),
  urgency: UrgencyEnum.optional(),
  property_type: z.string().max(80).optional(),
});
export type IntakeExtraction = z.infer<typeof IntakeExtractionSchema>;

/* ── Voice-note update extraction (Gemini on transcript) ─────────────────── */

const WaterDamageCoerce = z
  .union([WaterDamageEnum, z.string()])
  .transform((v): z.infer<typeof WaterDamageEnum> | undefined => {
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (["possible", "suspected", "maybe", "damp", "moist", "swollen", "wet"].includes(s)) return "possible";
      if (["confirmed", "yes", "definite", "soaked", "flooded", "standing water"].includes(s)) return "confirmed";
      if (["none", "none_visible", "no", "dry"].includes(s)) return "none_visible";
      return undefined;
    }
    return v;
  });

export const VoiceUpdateSchema = z.object({
  facts: JobFactsSchema.extend({
    water_damage: WaterDamageCoerce.optional(),
  }),
  evidence: z.array(EvidenceItemSchema).max(20).default([]),
  risk_flags: z.array(z.string().max(60)).max(10).default([]),
  notes: z.union([z.string().max(400), z.array(z.string().max(200)).max(5)]).default(""),
}).transform((data) => ({
  ...data,
  notes: Array.isArray(data.notes) ? data.notes.join(" ") : data.notes,
}));
export type VoiceUpdate = z.infer<typeof VoiceUpdateSchema>;
