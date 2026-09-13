import { describe, expect, it } from "vitest";
import {
  SERVICE_NOTES,
  SERVICE_NOTE_CORPUS_VERSION,
  buildGuidanceQuery,
  rankNotesLexically,
  serviceNoteHash,
  serviceNoteText,
} from "@/lib/ai/service-notes";
import { lexicalGuidance, MAX_GUIDANCE_NOTES } from "@/lib/ai/retrieval";
import { buildScopePack } from "@/lib/rules/engine";
import { diffPacks } from "@/lib/rules/diff";
import {
  ENQUIRY_TEXT_HOTWATER,
  ENQUIRY_TEXT_TAP,
  FIXTURE_A,
  FIXTURE_C,
  FIXTURE_TAP_COMPLETE,
  VOICE_NOTE_TAP,
  facts,
} from "@/lib/evaluation/fixtures";

/* ────────────────────────────────────────────────────────────────────────────
 * Service-guidance retrieval.
 *
 * Two things are being protected here:
 *  1. GUIDANCE QUALITY — the right playbook notes surface for the right facts,
 *     and every note is cited.
 *  2. THE SAFETY INVARIANT — retrieval is advisory. Adding, removing or
 *     corrupting guidance must never move the readiness score, the band, the
 *     overrides or the safety escalation. That is asserted directly below,
 *     because it is the claim the whole architecture rests on.
 * ──────────────────────────────────────────────────────────────────────────── */

const tapPack = (over: Parameters<typeof buildScopePack>[0]["facts"], extra = {}) =>
  buildScopePack({
    job_type: "leaking_tap",
    facts: over,
    evidence: [],
    model_risk_flags: [],
    raw_text: ENQUIRY_TEXT_TAP,
    recommended_questions: [],
    version: 1,
    produced_by: "ai_analysis",
    ...extra,
  });

describe("service playbook corpus", () => {
  it("is curated, unique and fully cited", () => {
    const ids = SERVICE_NOTES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);

    const refs = SERVICE_NOTES.map((n) => n.reference);
    expect(new Set(refs).size).toBe(refs.length);

    for (const note of SERVICE_NOTES) {
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.body.length).toBeGreaterThan(0);
      expect(note.tags.length).toBeGreaterThan(0);
      expect(note.source).toBe("QuoteReady service playbook");
      expect(note.reference).toMatch(/^QR-PB-\d{3}$/);
      expect(["leaking_tap", "toilet_repair", "hot_water_system", "any"]).toContain(note.job_type);
    }
  });

  it("never states a price or makes a diagnosis", () => {
    for (const note of SERVICE_NOTES) {
      const text = `${note.title} ${note.body}`;
      // no money, no rates — guidance can say "don't price this yet", never "it costs X"
      expect(text, note.id).not.toMatch(/\$\s?\d|\bper hour\b|\bhourly rate\b|\b(price|cost)\s*(is|of|:)\s*\d/i);
      // guidance is framed as an action ("confirm / ask / allow for"), never a verdict
      expect(text, note.id).not.toMatch(/\bis (definitely|certainly) (broken|failed)\b/i);
    }
  });

  it("has a content hash that changes only when the note changes", () => {
    const note = SERVICE_NOTES[0];
    expect(serviceNoteHash(note)).toBe(serviceNoteHash({ ...note, title: note.title }));
    expect(serviceNoteHash(note)).not.toBe(serviceNoteHash({ ...note, body: `${note.body} Extra.` }));
    expect(serviceNoteText(note)).toContain(note.title);
    expect(SERVICE_NOTE_CORPUS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe("guidance query construction", () => {
  it("is built from structured facts, not from model prose", () => {
    const query = buildGuidanceQuery({
      job_type: "leaking_tap",
      facts: facts({
        fixture_type: "corroded_mixer",
        water_damage: "possible",
        symptoms: ["continuous_drip"],
      }),
      risk_flags: ["possible_concealed_leak"],
    });

    expect(query.job_type).toBe("leaking_tap");
    expect(query.signals).toContain("corroded_mixer");
    expect(query.signals).toContain("possible");
    expect(query.signals).toContain("continuous_drip");
    expect(query.signals).toContain("possible_concealed_leak");
    expect(query.text).toContain("Fixture: corroded mixer");
    // no raw customer text leaks into the retrieval query
    expect(query.text).not.toContain(ENQUIRY_TEXT_TAP);
  });

  it("drops absent and \"unknown\" values rather than matching on noise", () => {
    const query = buildGuidanceQuery({
      job_type: "leaking_tap",
      facts: facts({ fixture_type: "unknown" }),
    });
    expect(query.signals).not.toContain("unknown");
    expect(query.text).not.toContain("unknown");
    expect(query.text).toContain("Job type: leaking tap");
  });
});

describe("deterministic ranking", () => {
  it("is deterministic and capped", () => {
    const query = buildGuidanceQuery({ job_type: "leaking_tap", facts: FIXTURE_TAP_COMPLETE });
    const first = rankNotesLexically(query);
    const second = rankNotesLexically(query);
    expect(first.map((r) => r.note.id)).toEqual(second.map((r) => r.note.id));
    expect(first.length).toBeLessThanOrEqual(MAX_GUIDANCE_NOTES);
  });

  it("surfaces the guidance the facts actually call for", () => {
    const corroded = rankNotesLexically(
      buildGuidanceQuery({
        job_type: "leaking_tap",
        facts: facts({ ...FIXTURE_A, fixture_type: "corroded_mixer", water_damage: "possible" }),
      }),
    );
    expect(corroded.map((r) => r.note.id)).toContain("tap-corroded-body");

    const damp = rankNotesLexically(
      buildGuidanceQuery({
        job_type: "leaking_tap",
        facts: facts({ ...FIXTURE_A, water_damage: "possible" }),
      }),
    );
    expect(damp.map((r) => r.note.id)).toContain("tap-damp-cabinetry");
  });

  it("keeps trades apart (a tap job is not served toilet guidance)", () => {
    const query = buildGuidanceQuery({ job_type: "leaking_tap", facts: FIXTURE_TAP_COMPLETE });
    const ranked = rankNotesLexically(query, 10);
    for (const r of ranked) {
      expect(["leaking_tap", "any"]).toContain(r.note.job_type);
    }
  });

  it("still finds guidance for a job with almost no facts", () => {
    const notes = lexicalGuidance({ job_type: "toilet_repair", facts: facts({}) });
    expect(notes.length).toBeGreaterThan(0);
  });

  it("always explains a match by the signals that caused it", () => {
    const notes = lexicalGuidance({
      job_type: "leaking_tap",
      facts: facts({ fixture_type: "corroded_mixer" }),
      risk_flags: ["corroded_fixture"],
    });
    const corroded = notes.find((n) => n.id === "tap-corroded-body");
    expect(corroded).toBeDefined();
    expect(corroded!.matched_on).toContain("corroded_fixture");
    expect(corroded!.score).toBeGreaterThan(0);
    expect(corroded!.score).toBeLessThanOrEqual(1);
  });
});

describe("the safety invariant: guidance cannot change a decision", () => {
  const cases: Array<{ name: string; base: Omit<Parameters<typeof buildScopePack>[0], "guidance"> }> = [
    {
      name: "vague tap",
      base: {
        job_type: "leaking_tap",
        facts: FIXTURE_A,
        evidence: [],
        model_risk_flags: [],
        raw_text: ENQUIRY_TEXT_TAP,
        recommended_questions: [],
        version: 1,
        produced_by: "ai_analysis",
      },
    },
    {
      name: "complete tap",
      base: {
        job_type: "leaking_tap",
        facts: FIXTURE_TAP_COMPLETE,
        evidence: [],
        model_risk_flags: [],
        raw_text: ENQUIRY_TEXT_TAP,
        recommended_questions: [],
        version: 1,
        produced_by: "ai_analysis",
      },
    },
    {
      name: "hot-water safety job",
      base: {
        job_type: "hot_water_system",
        facts: FIXTURE_C,
        evidence: [],
        model_risk_flags: ["tank_leak"],
        raw_text: ENQUIRY_TEXT_HOTWATER,
        recommended_questions: [],
        version: 1,
        produced_by: "ai_analysis",
      },
    },
  ];

  it("holds for every fixture: guidance in, same decisions out", () => {
    for (const { name, base } of cases) {
      const without = buildScopePack(base);
      const guidance = lexicalGuidance({
        job_type: without.job_type,
        facts: without.facts,
        risk_flags: without.risk_flags.map((f) => f.id),
        missing_fields: without.missing_fields.map((m) => m.key),
      });
      const withGuidance = buildScopePack({ ...base, guidance });

      // guidance really was attached (otherwise this proves nothing)
      expect(guidance.length, name).toBeGreaterThan(0);
      expect(withGuidance.guidance, name).toHaveLength(guidance.length);

      // every decision-bearing field is unchanged
      expect(withGuidance.readiness_score, name).toBe(without.readiness_score);
      expect(withGuidance.readiness_band, name).toBe(without.readiness_band);
      expect(withGuidance.components, name).toEqual(without.components);
      expect(withGuidance.safety_flag, name).toBe(without.safety_flag);
      expect(withGuidance.inspection_recommended, name).toBe(without.inspection_recommended);
      expect(withGuidance.recommended_action, name).toEqual(without.recommended_action);
      expect(withGuidance.override_reasons, name).toEqual(without.override_reasons);
      expect(withGuidance.missing_fields, name).toEqual(without.missing_fields);
      expect(withGuidance.risk_flags, name).toEqual(without.risk_flags);
    }
  });

  it("reports guidance arriving with a new version in the diff", () => {
    const corroded = facts({ ...FIXTURE_A, fixture_type: "corroded_mixer", water_damage: "possible" });
    const before = tapPack(FIXTURE_TAP_COMPLETE);
    const after = tapPack(corroded, {
      version: 2,
      guidance: lexicalGuidance({ job_type: "leaking_tap", facts: corroded }),
    });

    expect(before.guidance).toHaveLength(0);
    const diff = diffPacks(before, after);
    expect(diff.new_guidance.length).toBeGreaterThan(0);
    expect(diff.dropped_guidance).toHaveLength(0);
  });

  it("re-runs against the merged facts, so a site note can legitimately change guidance", () => {
    const before = lexicalGuidance({ job_type: "leaking_tap", facts: FIXTURE_A });
    const after = lexicalGuidance({
      job_type: "leaking_tap",
      facts: facts({
        ...FIXTURE_A,
        fixture_type: "corroded_mixer",
        water_isolation_access: "accessible",
        water_damage: "possible",
      }),
      risk_flags: ["corroded_fixture", "possible_concealed_leak"],
    });

    expect(after.map((n) => n.id)).toContain("tap-corroded-body");
    expect(after.map((n) => n.id)).not.toEqual(before.map((n) => n.id));
  });

  it("never uses the raw voice-note transcript as a retrieval signal", () => {
    // retrieval queries are built from structured facts only — the model's prose
    // (and the tradie's spoken words) never become a search input
    const query = buildGuidanceQuery({
      job_type: "leaking_tap",
      facts: facts({ ...FIXTURE_A, fixture_type: "corroded_mixer" }),
      risk_flags: ["possible_concealed_leak"],
    });
    expect(query.text).not.toContain(VOICE_NOTE_TAP);
    expect(query.signals).not.toContain(VOICE_NOTE_TAP.toLowerCase());
    // risk ids are allowed signals; the tradie's sentence is not
    expect(query.signals).toContain("possible_concealed_leak");
  });
});
