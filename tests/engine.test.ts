import { describe, expect, it } from "vitest";
import type { JobFacts, ScopePack } from "@/lib/ai/schemas";
import { buildScopePack } from "@/lib/rules/engine";
import { mergeFacts } from "@/lib/rules/merge";
import { deriveAnalysisStatus, canTransition } from "@/lib/rules/status";
import { buildMessageDraft } from "@/lib/rules/message-templates";
import {
  ENQUIRY_TEXT_HOTWATER,
  ENQUIRY_TEXT_TAP,
  ENQUIRY_TEXT_TOILET,
  FIXTURE_A,
  FIXTURE_B,
  FIXTURE_TAP_COMPLETE,
  VOICE_NOTE_TAP,
  EVALUATION_FIXTURES,
} from "./fixtures/scopes";

const baseInput = (over: Partial<Parameters<typeof buildScopePack>[0]>) =>
  ({
    job_type: "leaking_tap",
    facts: FIXTURE_A,
    evidence: [],
    model_risk_flags: [],
    raw_text: ENQUIRY_TEXT_TAP,
    recommended_questions: [],
    version: 1,
    produced_by: "ai_analysis" as const,
    ...over,
  });

describe("readiness scoring", () => {
  it("scores a complete leaking tap job ready for estimate (>= 70)", () => {
    const pack = buildScopePack(
      baseInput({ facts: FIXTURE_TAP_COMPLETE }),
    );
    expect(pack.readiness_score).toBeGreaterThanOrEqual(70);
    expect(pack.readiness_band).toBe("ready_for_estimate");
    expect(pack.status).toBe("ready_for_estimate");
    expect(pack.recommended_action.type).toBe("estimate_review");
    expect(pack.recommended_action.estimate_eligible).toBe(true);
  });

  it("caps readiness at 69 when a critical field is missing", () => {
    const pack = buildScopePack(
      baseInput({
        facts: {
          ...FIXTURE_TAP_COMPLETE,
          fixture_type: undefined,
          location_in_property: undefined,
        },
      }),
    );
    expect(pack.readiness_score).toBeLessThanOrEqual(69);
    expect(pack.recommended_action.type).toBe("request_information");
    expect(pack.override_reasons.join(" ")).toMatch(/critical/i);
  });

  it("treats literal 'unknown' values as absent facts", () => {
    const pack = buildScopePack(
      baseInput({ facts: { ...FIXTURE_TAP_COMPLETE, fixture_type: "unknown" } }),
    );
    const missing = pack.missing_fields.map((m) => m.key);
    expect(missing).toContain("fixture_type");
    expect(pack.known_facts.fixture_type).toBeUndefined();
  });

  it("rewards richer evidence: two photos beat zero", () => {
    const noPhotos = buildScopePack(
      baseInput({ facts: { ...FIXTURE_TAP_COMPLETE, photo_count: 0 } }),
    );
    const twoPhotos = buildScopePack(baseInput({ facts: FIXTURE_TAP_COMPLETE }));
    expect(twoPhotos.components.evidence).toBeGreaterThan(
      noPhotos.components.evidence,
    );
  });

  it("every score component stays within 0-100", () => {
    const pack = buildScopePack(
      baseInput({ facts: { location_in_property: "bathroom" }, raw_text: "" }),
    );
    for (const v of Object.values(pack.components)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(pack.readiness_score).toBeGreaterThanOrEqual(0);
    expect(pack.readiness_score).toBeLessThanOrEqual(100);
  });
});

describe("risk and inspection overrides", () => {
  it("forces inspection when a concealed-leak style flag requires it", () => {
    const pack = buildScopePack(
      baseInput({
        facts: FIXTURE_TAP_COMPLETE,
        model_risk_flags: ["possible_concealed_leak"],
      }),
    );
    expect(pack.inspection_recommended).toBe(true);
    expect(pack.readiness_score).toBeLessThanOrEqual(69);
    expect(pack.readiness_band).toBe("inspection_recommended");
    expect(pack.recommended_action.type).toBe("inspection");
  });

  it("flags safety and blocks estimate when the customer mentions a gas smell", () => {
    const pack = buildScopePack(
      baseInput({
        job_type: "hot_water_system",
        raw_text: ENQUIRY_TEXT_HOTWATER,
        model_risk_flags: ["tank_leak"],
      }),
    );
    expect(pack.safety_flag).toBe(true);
    expect(pack.recommended_action.type).toBe("safety_escalation");
    expect(pack.recommended_action.estimate_eligible).toBe(false);
    expect(pack.status).not.toBe("ready_for_estimate");
  });

  it("matches safety patterns case-insensitively and records the reason", () => {
    const pack = buildScopePack(
      baseInput({ raw_text: "THERE IS A GAS SMELL IN THE KITCHEN" }),
    );
    expect(pack.safety_flag).toBe(true);
    expect(pack.override_reasons.join(" ")).toMatch(/safety/i);
  });

  it("does not flag safety on benign text", () => {
    const pack = buildScopePack(baseInput({ raw_text: ENQUIRY_TEXT_TAP }));
    expect(pack.safety_flag).toBe(false);
  });

  it("inspection override records an explanation", () => {
    const pack = buildScopePack(
      baseInput({ model_risk_flags: ["uncertain_cause"] }),
    );
    expect(pack.override_reasons.length).toBeGreaterThan(0);
    expect(pack.override_reasons.join(" ")).toMatch(/inspection/i);
  });
});

describe("scope pack content", () => {
  it("lists only customer-answerable fields as missing with why text", () => {
    const pack = buildScopePack(baseInput({ facts: FIXTURE_A }));
    const fixtureMissing = pack.missing_fields.find(
      (m) => m.key === "fixture_type",
    );
    expect(fixtureMissing).toBeDefined();
    expect(fixtureMissing?.ask_customer).toBe(true);
    expect(fixtureMissing?.why.length).toBeGreaterThan(10);
    expect(pack.missing_fields.every((m) => m.label.length > 0)).toBe(true);
  });

  it("includes template assumptions and exclusions", () => {
    const pack = buildScopePack(baseInput({}));
    expect(pack.assumptions.length).toBeGreaterThan(0);
    expect(pack.exclusions.length).toBeGreaterThan(0);
  });

  it("keeps evidence items attached to the pack", () => {
    const pack = buildScopePack(
      baseInput({
        evidence: [
          {
            type: "photo_observation",
            claim: "Fixture appears to be a mixer tap",
            source_reference: "image_1",
            certainty: "medium",
          },
        ],
      }),
    );
    expect(pack.evidence).toHaveLength(1);
    expect(pack.evidence[0].source_reference).toBe("image_1");
  });
});

describe("voice-note merge", () => {
  it("merges new facts without dropping existing ones and bumps version", () => {
    const before = buildScopePack(baseInput({}));
    const merged = mergeFacts(before.facts, {
      fixture_type: "corroded_mixer",
      water_damage: "possible",
      water_isolation_access: "accessible",
    });
    expect(merged.fixture_type).toBe("corroded_mixer");
    expect(merged.location_in_property).toBe("bathroom");
    expect(merged.symptoms).toEqual(["continuous_drip"]);
  });

  it("voice update produces a new version with the damp-cabinet delta", () => {
    const before = buildScopePack(baseInput({}));
    const after = buildScopePack(
      baseInput({
        version: before.version + 1,
        produced_by: "voice_update",
        facts: mergeFacts(before.facts, {
          fixture_type: "corroded_mixer",
          water_damage: "possible",
          water_isolation_access: "accessible",
        }),
        model_risk_flags: ["possible_concealed_leak"],
        evidence: [
          {
            type: "voice_note",
            claim: "Cabinet base is damp; cannot rule out concealed leak",
            source_reference: "voice_note_1",
            certainty: "high",
          },
        ],
        voice_note_text: VOICE_NOTE_TAP,
      }),
    );
    expect(after.version).toBe(before.version + 1);
    expect(after.readiness_band).toBe("inspection_recommended");
    expect(after.recommended_action.type).toBe("inspection");
    expect(after.risk_flags.some((f) => f.id === "possible_concealed_leak")).toBe(
      true,
    );
  });
});

describe("status transitions", () => {
  it("derives band status from a scope pack", () => {
    const pack = buildScopePack(baseInput({}));
    expect(deriveAnalysisStatus(pack)).toBe("inspection_recommended");
  });

  it("only users can approve a drafted follow-up", () => {
    expect(canTransition("follow_up_drafted", "follow_up_approved", "user")).toBe(
      true,
    );
    expect(
      canTransition("follow_up_drafted", "follow_up_approved", "ai"),
    ).toBe(false);
  });

  it("only users can request an inspection", () => {
    expect(
      canTransition("inspection_recommended", "inspection_requested", "user"),
    ).toBe(true);
    expect(
      canTransition("inspection_recommended", "inspection_requested", "ai"),
    ).toBe(false);
  });

  it("re-analysis by AI can move a job back to its band status", () => {
    expect(
      canTransition("follow_up_drafted", "needs_information", "ai"),
    ).toBe(true);
  });

  it("rejects nonsense transitions", () => {
    expect(canTransition("new", "closed", "user")).toBe(false);
    expect(canTransition("closed", "needs_information", "ai")).toBe(false);
  });
});

describe("customer message drafting", () => {
  it("request_information asks only missing customer-answerable fields", () => {
    const pack = buildScopePack(baseInput({ facts: FIXTURE_A }));
    const draft = buildMessageDraft(pack, "Jordan");
    expect(draft.message_type).toBe("request_information");
    const missingKeys = pack.missing_fields
      .filter((m) => m.ask_customer)
      .map((m) => m.key);
    expect(draft.requests_fields).toEqual(missingKeys);
    for (const key of missingKeys) {
      expect(draft.body).toContain(
        pack.missing_fields.find((m) => m.key === key)!.label,
      );
    }
    expect(draft.body).not.toMatch(/price|\$/i);
  });

  it("inspection message explains what the inspection clarifies", () => {
    const pack = buildScopePack(
      baseInput({ model_risk_flags: ["possible_concealed_leak"] }),
    );
    const draft = buildMessageDraft(pack, "Jordan");
    expect(draft.message_type).toBe("inspection_recommended");
    expect(draft.body).toMatch(/inspection/i);
    expect(draft.body).toContain("Jordan");
  });
});

describe("evaluation fixture suite", () => {
  for (const fx of EVALUATION_FIXTURES) {
    it(`${fx.id}: ${fx.name}`, () => {
      const pack: ScopePack = buildScopePack(
        baseInput({
          job_type: fx.job_type,
          facts: fx.facts,
          raw_text: fx.raw_text,
          model_risk_flags: fx.model_risk_flags,
        }),
      );
      expect(pack.readiness_band).toBe(fx.expected_band);
      expect(pack.safety_flag).toBe(Boolean(fx.expected_safety_flag));
      expect(pack.inspection_recommended).toBe(Boolean(fx.expected_inspection));
    });
  }
});
