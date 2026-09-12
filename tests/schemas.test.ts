import { describe, expect, it } from "vitest";
import {
  GeminiAnalysisSchema,
  JobFactsSchema,
  ScopePackSchema,
  VoiceUpdateSchema,
} from "@/lib/ai/schemas";

const validGemini = {
  job_type: "leaking_tap",
  confidence: 0.86,
  facts: {
    location_in_property: "bathroom",
    fixture_type: "mixer_tap",
    symptoms: ["continuous_drip"],
    urgency: "standard",
    customer_availability: "next_week",
    suburb: "Brunswick",
    photo_count: 2,
    voice_note_count: 0,
    notes: [],
  },
  evidence: [
    {
      type: "customer_enquiry",
      claim: "Bathroom tap is leaking",
      source_reference: "enquiry_text",
    },
    {
      type: "photo_observation",
      claim: "Fixture appears to be a mixer tap",
      source_reference: "image_1",
      certainty: "medium",
    },
  ],
  missing_fields: ["water_isolation_access"],
  risk_flags: ["possible_concealed_leak"],
  recommended_questions: ["Is the isolation valve accessible?"],
};

describe("GeminiAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    const parsed = GeminiAnalysisSchema.safeParse(validGemini);
    expect(parsed.success).toBe(true);
  });

  it("fills defaults for omitted arrays", () => {
    const parsed = GeminiAnalysisSchema.parse({
      job_type: "toilet_repair",
      confidence: 0.5,
      facts: { photo_count: 0, voice_note_count: 0, symptoms: [], notes: [] },
    });
    expect(parsed.evidence).toEqual([]);
    expect(parsed.risk_flags).toEqual([]);
  });

  it("rejects an unknown job type", () => {
    const parsed = GeminiAnalysisSchema.safeParse({
      ...validGemini,
      job_type: "pool_cleaning",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-numeric confidence", () => {
    const parsed = GeminiAnalysisSchema.safeParse({
      ...validGemini,
      confidence: "high",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects evidence entries without a source", () => {
    const parsed = GeminiAnalysisSchema.safeParse({
      ...validGemini,
      evidence: [{ type: "photo_observation", claim: "leak" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range confidence", () => {
    const parsed = GeminiAnalysisSchema.safeParse({
      ...validGemini,
      confidence: 1.4,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("VoiceUpdateSchema", () => {
  it("accepts a valid transcript extraction", () => {
    const parsed = VoiceUpdateSchema.safeParse({
      facts: { fixture_type: "corroded_mixer", photo_count: 0, voice_note_count: 1, symptoms: [], notes: [] },
      risk_flags: ["possible_concealed_leak"],
      notes: "cabinet damp",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty facts object (adds nothing, crashes nothing)", () => {
    const parsed = VoiceUpdateSchema.safeParse({ facts: {} });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.facts.symptoms).toEqual([]);
    }
  });
});

describe("ScopePackSchema", () => {
  it("rejects readiness out of range", () => {
    const parsed = ScopePackSchema.safeParse({
      version: 1,
      job_type: "leaking_tap",
      status: "ready_for_estimate",
      readiness_score: 140,
      readiness_band: "ready_for_estimate",
      components: { details: 1, evidence: 1, access: 1, confirmation: 1, risk: 1 },
      known_facts: {},
      missing_fields: [],
      assumptions: [],
      exclusions: [],
      risk_flags: [],
      safety_flag: false,
      inspection_recommended: false,
      recommended_action: {
        type: "estimate_review",
        title: "t",
        rationale: "r",
        estimate_eligible: true,
      },
      evidence: [],
      produced_by: "seed",
      override_reasons: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("JobFactsSchema", () => {
  it("caps unbounded arrays", () => {
    const parsed = JobFactsSchema.safeParse({
      symptoms: Array.from({ length: 12 }, (_, i) => `s${i}`),
      photo_count: 0,
      voice_note_count: 0,
      notes: [],
    });
    expect(parsed.success).toBe(false);
  });
});
