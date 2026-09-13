import { describe, expect, it } from "vitest";
import { buildScopePack, type ScopePackInput } from "@/lib/rules/engine";
import { diffPacks } from "@/lib/rules/diff";
import { canTransition, deriveAnalysisStatus, statusLabel } from "@/lib/rules/status";
import { buildMessageDraft } from "@/lib/rules/message-templates";
import {
  materialiseTemplate,
  normaliseTemplateDocument,
  resolveJobTemplate,
} from "@/lib/rules/template-resolve";
import { JOB_TEMPLATES, type JobTemplate } from "@/lib/rules/job-templates";
import { VoiceUpdateSchema, type ScopePack } from "@/lib/ai/schemas";
import type { Store, TemplateRow } from "@/lib/data/types";
import {
  ENQUIRY_TEXT_TAP,
  FIXTURE_A,
  FIXTURE_B,
  FIXTURE_TAP_COMPLETE,
  VOICE_NOTE_TAP,
  facts,
} from "@/lib/evaluation/fixtures";

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic-module suite: the parts of the product that decide things.
 * These tests exist so "the rules engine decides readiness" is a checked claim,
 * not a README promise — diffing, template resolution, status transitions and
 * customer-message drafting included.
 * ──────────────────────────────────────────────────────────────────────────── */

const pack = (over: Partial<ScopePackInput>): ScopePack =>
  buildScopePack({
    job_type: "leaking_tap",
    facts: FIXTURE_A,
    evidence: [],
    model_risk_flags: [],
    raw_text: ENQUIRY_TEXT_TAP,
    recommended_questions: [],
    version: 1,
    produced_by: "ai_analysis",
    ...over,
  });

const CUSTOM_TEMPLATE: JobTemplate = {
  type: "leaking_tap",
  label: "Custom tap service",
  blurb: "Test template",
  required_fields: [
    {
      key: "mystery_field",
      label: "Mystery detail",
      critical: false,
      why: "Not covered by the built-in question set.",
      ask_customer: true,
    },
  ],
  questions: {},
  assumptions: ["Test assumption"],
  exclusions: ["Test exclusion"],
  inspection_conditions: [],
  min_photos_for_good_evidence: 2,
  message_guidance: "",
};

/* ── scope diffing (the "what changed" view) ─────────────────────────────── */

describe("diffPacks", () => {
  it("reports added facts, new risk flags, resolved gaps and the action change", () => {
    // information-starved enquiry → v2 scope after the site note lands
    const before = pack({ facts: facts({ location_in_property: "bathroom" }), version: 1 });
    const after = pack({
      version: 2,
      facts: facts({
        ...FIXTURE_TAP_COMPLETE,
        fixture_type: "corroded_mixer",
        water_damage: "possible",
      }),
      // the voice-update path passes the model's flags straight into the engine
      model_risk_flags: ["corroded_fixture", "possible_concealed_leak"],
      raw_text: VOICE_NOTE_TAP,
      produced_by: "voice_update",
    });

    const diff = diffPacks(before, after);

    expect(before.recommended_action.type).toBe("request_information");
    expect(after.recommended_action.type).toBe("inspection");

    const fixture = diff.field_changes.find((c) => c.key === "fixture_type");
    expect(fixture?.to).toBe("corroded mixer");
    expect(fixture?.kind).toBe("added");

    expect(diff.field_changes.map((c) => c.key)).toContain("water_damage");
    expect(diff.new_risk_flags.length).toBeGreaterThan(0);
    // diff.ts renders its own short fact vocabulary, not the template labels
    expect(diff.resolved_missing).toContain("Fixture");
    expect(diff.action_changed).toBe(true);
    expect(diff.score_delta).toBe(after.readiness_score - before.readiness_score);
  });

  it("reports nothing when nothing changed", () => {
    const same = pack({ version: 1 });
    const diff = diffPacks(same, { ...same, version: 2 });
    expect(diff.field_changes).toHaveLength(0);
    expect(diff.new_risk_flags).toHaveLength(0);
    expect(diff.new_missing).toHaveLength(0);
    expect(diff.score_delta).toBe(0);
  });

  it("flags a newly added symptom and newly missing field", () => {
    const before = pack({ facts: facts({ ...FIXTURE_B, symptoms: ["replacement_requested"] }) });
    const after = pack({
      facts: facts({ ...FIXTURE_B, symptoms: ["replacement_requested", "continuous_drip"], suburb: undefined }),
    });
    const diff = diffPacks(before, after);
    expect(diff.field_changes.find((c) => c.key === "symptoms")?.to).toContain("continuous drip");
    expect(diff.new_risk_flags).toHaveLength(0);
    expect(diff.action_changed).toBe(false);
  });
});

/* ── status model ─────────────────────────────────────────────────────────── */

describe("status transitions", () => {
  it("derives the band as the status (safety is an overlay, not a state)", () => {
    const scope = pack({ raw_text: "There is a strong gas smell near the hot water unit." });
    expect(scope.safety_flag).toBe(true);
    expect(deriveAnalysisStatus(scope)).toBe(scope.readiness_band);
  });

  it("lets a user draft a follow-up but never jump straight to a terminal state", () => {
    expect(canTransition("needs_information", "follow_up_drafted", "user")).toBe(true);
    expect(canTransition("inspection_recommended", "inspection_requested", "user")).toBe(true);
    expect(canTransition("needs_information", "inspection_requested", "user")).toBe(false);
    expect(canTransition("follow_up_drafted", "follow_up_approved", "user")).toBe(true);
    expect(canTransition("closed", "follow_up_drafted", "user")).toBe(false);
  });

  it("never lets the AI or the system approve, close or schedule anything", () => {
    expect(canTransition("inspection_recommended", "needs_information", "ai")).toBe(true);
    expect(canTransition("inspection_recommended", "follow_up_drafted", "ai")).toBe(false);
    expect(canTransition("inspection_recommended", "inspection_requested", "ai")).toBe(false);
    expect(canTransition("inspection_recommended", "closed", "ai")).toBe(false);
    expect(canTransition("inspection_recommended", "new", "system")).toBe(false);
    expect(canTransition("new", "needs_information", "system")).toBe(false);
    expect(canTransition("closed", "needs_information", "system")).toBe(false);
  });

  it("has a human-readable label for every state", () => {
    expect(statusLabel("ready_for_estimate")).toBe("Ready for estimate");
    expect(statusLabel("follow_up_approved")).toBe("Follow-up approved");
  });
});

/* ── customer-message drafting ────────────────────────────────────────────── */

describe("buildMessageDraft", () => {
  it("drafts an inspection request when the rules recommend an inspection", () => {
    const scope = pack({
      facts: facts({ ...FIXTURE_TAP_COMPLETE, fixture_type: "corroded_mixer", water_damage: "possible" }),
      model_risk_flags: ["possible_concealed_leak"],
      raw_text: VOICE_NOTE_TAP,
    });
    const draft = buildMessageDraft(scope, "Jordan Lee");
    expect(scope.recommended_action.type).toBe("inspection");
    expect(draft.message_type).toBe("inspection_recommended");
    expect(draft.requests_fields).toHaveLength(0);
    expect(draft.body).toContain("Hi Jordan,");
    expect(draft.body).toContain("inspection");
  });

  it("asks only the customer-answerable questions and never mentions a price", () => {
    const scope = pack({ facts: facts({}), raw_text: ENQUIRY_TEXT_TAP });
    const draft = buildMessageDraft(scope, "Priya Raman");
    const askedKeys = scope.missing_fields.filter((m) => m.ask_customer).map((m) => m.key);
    expect(draft.message_type).toBe("request_information");
    expect(draft.requests_fields).toEqual(askedKeys);
    expect(draft.body).not.toMatch(/\$|price|cost|quote total/i);
    expect(draft.body).toContain("close-up photo");
  });

  it("falls back to a plain-language question when the template has no prepared one", () => {
    const scope = pack({
      facts: facts({ location_in_property: "bathroom" }),
      template: CUSTOM_TEMPLATE,
    });
    const draft = buildMessageDraft(scope, "Sam");
    expect(draft.requests_fields).toContain("mystery_field");
    expect(draft.body).toContain("Could you confirm the mystery detail?");
  });

  it("keeps a safety-flagged job to clarifying questions, never an inspection promise", () => {
    const scope = pack({ raw_text: "There is a strong gas smell near the hot water unit." });
    const draft = buildMessageDraft(scope, "Sam Chen");
    // Safety jobs must not read as if a site visit has been agreed.
    expect(scope.recommended_action.type).toBe("safety_escalation");
    expect(draft.body).not.toContain("most accurate next step is a short on-site inspection");
  });
});

/* ── template resolution (custom templates override the built-in base) ───── */

describe("template resolution", () => {
  const row: TemplateRow = {
    id: "tpl-1",
    base_type: "leaking_tap",
    name: "Melbourne Metro — taps",
    blurb: "House template",
    is_default: false,
    document: { ...JOB_TEMPLATES.leaking_tap, label: "Stored label", questions: { fixture_type: "Stored question?" } },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  it("merges a stored document over its built-in base, keeping the row's identity", () => {
    const merged = materialiseTemplate(row);
    expect(merged.type).toBe("leaking_tap");
    expect(merged.label).toBe("Melbourne Metro — taps");
    expect(merged.blurb).toBe("House template");
    expect(merged.questions.fixture_type).toBe("Stored question?");
    // question keys the stored doc does not override keep the base wording
    expect(merged.questions.location_in_property).toBe(
      JOB_TEMPLATES.leaking_tap.questions.location_in_property,
    );
    expect(merged.inspection_conditions.length).toBe(
      JOB_TEMPLATES.leaking_tap.inspection_conditions.length,
    );
  });

  it("falls back to base lists when the stored document leaves them empty", () => {
    const merged = materialiseTemplate({
      ...row,
      document: { ...row.document, required_fields: [], assumptions: [], exclusions: [] },
    });
    expect(merged.required_fields).toEqual(JOB_TEMPLATES.leaking_tap.required_fields);
    expect(merged.assumptions).toEqual(JOB_TEMPLATES.leaking_tap.assumptions);
    expect(merged.exclusions).toEqual(JOB_TEMPLATES.leaking_tap.exclusions);
  });

  it("sanitises hostile/partial template documents instead of throwing", () => {
    const doc = normaliseTemplateDocument({
      required_fields: [
        { key: "ok", label: "Fine", critical: true, why: "because" },
        { key: "", label: "no key" },
        { label: "no key at all" },
        "not an object",
      ],
      questions: { a: "Q a?", b: 42 },
      assumptions: [" real ", "", 7],
      inspection_conditions: [
        { any_risk_flag: ["gas_concern", "not_a_real_flag"], label: "Gas" },
        { any_fact: [{ key: "water_damage", value: "confirmed" }], label: "Damp" },
        { label: "nothing usable" },
        "junk",
      ],
      min_photos_for_good_evidence: 99,
    });

    expect(doc.required_fields).toHaveLength(1);
    expect(doc.required_fields[0].key).toBe("ok");
    expect(doc.questions).toEqual({ a: "Q a?" });
    expect(doc.assumptions).toEqual(["real"]);
    expect(doc.exclusions).toEqual([]);
    expect(doc.inspection_conditions).toEqual([
      { any_risk_flag: ["gas_concern"], label: "Gas" },
      { any_fact: [{ key: "water_damage", value: "confirmed" }], label: "Damp" },
    ]);
    expect(doc.min_photos_for_good_evidence).toBe(6);
  });

  it("clamps and defaults numeric evidence settings", () => {
    expect(normaliseTemplateDocument({ min_photos_for_good_evidence: -3 }).min_photos_for_good_evidence).toBe(0);
    expect(normaliseTemplateDocument({ min_photos_for_good_evidence: "abc" }).min_photos_for_good_evidence).toBe(2);
    expect(normaliseTemplateDocument(null).required_fields).toEqual([]);
  });

  it("prefers the job's filed template, then the org default, then the built-in", async () => {
    const rows: TemplateRow[] = [row, { ...row, id: "tpl-2", name: "Default taps", is_default: true }];
    const fake: Pick<Store, "getTemplate" | "listTemplates"> = {
      getTemplate: async (id) => rows.find((r) => r.id === id) ?? null,
      listTemplates: async () => rows,
    };

    const filed = await resolveJobTemplate(fake, { job_type: "leaking_tap", template_id: "tpl-1" });
    expect(filed.label).toBe("Melbourne Metro — taps");

    const byDefault = await resolveJobTemplate(fake, { job_type: "leaking_tap", template_id: null });
    expect(byDefault.label).toBe("Default taps");

    const builtin = await resolveJobTemplate(
      { getTemplate: async () => null, listTemplates: async () => [] },
      { job_type: "toilet_repair" },
    );
    expect(builtin).toEqual(JOB_TEMPLATES.toilet_repair);

    const missingId = await resolveJobTemplate(fake, { job_type: "toilet_repair", template_id: "gone" });
    expect(missingId).toEqual(JOB_TEMPLATES.toilet_repair);
  });
});

/* ── voice-note fact coercion (model output → domain values) ─────────────── */

describe("voice update coercion", () => {
  const parse = (water_damage: unknown) =>
    VoiceUpdateSchema.parse({ facts: { water_damage }, evidence: [], risk_flags: [], notes: "" }).facts
      .water_damage;

  it("maps trade phrasing onto the domain enum", () => {
    expect(parse("damp")).toBe("possible");
    expect(parse("soaked")).toBe("confirmed");
    expect(parse("dry")).toBe("none_visible");
    expect(parse("confirmed")).toBe("confirmed");
  });

  it("drops values it cannot place rather than guessing", () => {
    expect(parse("banana")).toBeUndefined();
    expect(parse(undefined)).toBeUndefined();
  });
});
