import type { JobFacts, JobType } from "@/lib/ai/schemas";
import { EMPTY_FACTS } from "@/lib/ai/schemas";

/** Builder for compact fixture creation */
export function facts(partial: Partial<JobFacts>): JobFacts {
  return { ...EMPTY_FACTS, ...partial };
}

export const ENQUIRY_TEXT_TAP =
  "My bathroom tap is leaking. It is not an emergency, but can someone come next week? I uploaded two photos.";

export const ENQUIRY_TEXT_TOILET =
  "We need to replace a standard close-coupled toilet in a ground-floor bathroom. Existing water and waste connections are accessible. I have included front, side, and connection photos. No leak or overflow. We are available Tuesday or Wednesday afternoon.";

export const ENQUIRY_TEXT_HOTWATER =
  "Our hot-water unit is leaking and there is a smell near the unit. We have no hot water. Please call urgently.";

export const VOICE_NOTE_TAP =
  "I inspected Jordan's bathroom tap. It is a corroded mixer. The isolation valve is accessible, but the cabinet base is damp. I cannot rule out a concealed leak, so book an inspection before providing a fixed price.";

/* ── Fixture A: Jordan, vague leaking tap (expected: inspection recommended) ── */
export const FIXTURE_A: JobFacts = facts({
  location_in_property: "bathroom",
  symptoms: ["continuous_drip"],
  urgency: "standard",
  customer_availability: "next_week",
  photo_count: 2,
  notes: ["photos show a basin mixer tap"],
});

/* ── Fixture B: Priya, detailed toilet replacement (expected: ready) ──────── */
export const FIXTURE_B: JobFacts = facts({
  location_in_property: "ground-floor bathroom",
  fixture_type: "close_coupled",
  symptoms: ["replacement_requested"],
  urgency: "flexible",
  property_access: "accessible, off-street parking",
  customer_availability: "tuesday_or_wednesday_afternoon",
  photo_count: 3,
});

/* ── Fixture C: Sam, hot-water leak + smell (expected: safety flag) ───────── */
export const FIXTURE_C: JobFacts = facts({
  system_type: "unknown",
  symptoms: ["tank_leak", "no_hot_water"],
  urgency: "urgent",
  location_in_property: "side passage",
  customer_availability: "call to arrange",
  photo_count: 1,
});

/* ── Fixture: complete leaking tap, everything known (expected: ready) ────── */
export const FIXTURE_TAP_COMPLETE: JobFacts = facts({
  location_in_property: "bathroom",
  fixture_type: "mixer_tap",
  water_isolation_access: "accessible",
  water_damage: "none_visible",
  urgency: "standard",
  property_access: "off-street parking, easy access",
  customer_availability: "weekday mornings",
  photo_count: 2,
});

/* ── Fixture: good details but missing critical fixture_type ──────────────── */
export const FIXTURE_TAP_NO_FIXTURE: JobFacts = facts({
  location_in_property: "kitchen",
  water_isolation_access: "accessible",
  urgency: "standard",
  property_access: "street parking",
  customer_availability: "any weekday",
  photo_count: 1,
});

export interface EvaluationFixture {
  id: string;
  name: string;
  job_type: JobType;
  facts: JobFacts;
  raw_text: string;
  model_risk_flags: string[];
  expected_band: "needs_information" | "inspection_recommended" | "ready_for_estimate";
  expected_safety_flag?: boolean;
  expected_inspection?: boolean;
}

export const EVALUATION_FIXTURES: EvaluationFixture[] = [
  {
    id: "vague_tap",
    name: "Vague leaking tap enquiry",
    job_type: "leaking_tap",
    facts: FIXTURE_A,
    raw_text: ENQUIRY_TEXT_TAP,
    model_risk_flags: [],
    expected_band: "inspection_recommended",
  },
  {
    id: "toilet_replacement",
    name: "Detailed standard toilet replacement",
    job_type: "toilet_repair",
    facts: FIXTURE_B,
    raw_text: ENQUIRY_TEXT_TOILET,
    model_risk_flags: [],
    expected_band: "ready_for_estimate",
  },
  {
    id: "hotwater_smell",
    name: "Hot-water leak + unusual smell",
    job_type: "hot_water_system",
    facts: FIXTURE_C,
    raw_text: ENQUIRY_TEXT_HOTWATER,
    model_risk_flags: ["tank_leak"],
    expected_band: "inspection_recommended",
    expected_safety_flag: true,
    expected_inspection: true,
  },
  {
    id: "no_images_no_access",
    name: "No images, no property access info",
    job_type: "leaking_tap",
    facts: facts({ location_in_property: "bathroom", urgency: "standard", symptoms: ["drip"] }),
    raw_text: "The tap drips.",
    model_risk_flags: [],
    expected_band: "needs_information",
  },
  {
    id: "clear_mixer",
    name: "Clear mixer replacement with access + photos",
    job_type: "leaking_tap",
    facts: FIXTURE_TAP_COMPLETE,
    raw_text: ENQUIRY_TEXT_TAP,
    model_risk_flags: [],
    expected_band: "ready_for_estimate",
  },
  {
    id: "unknown_fixture_damage",
    name: "Unknown fixture + visible water damage",
    job_type: "leaking_tap",
    facts: facts({
      location_in_property: "kitchen",
      water_damage: "possible",
      urgency: "standard",
      property_access: "easy access, off-street parking",
      customer_availability: "weekday mornings",
      photo_count: 1,
      symptoms: ["drip"],
    }),
    raw_text: "Kitchen tap leaking, bench cabinet looks swollen.",
    model_risk_flags: ["water_damage"],
    expected_band: "inspection_recommended",
    expected_inspection: true,
  },
  {
    id: "voice_damp_cabinet",
    name: "Voice note mentions damp cabinet",
    job_type: "leaking_tap",
    facts: facts({
      location_in_property: "bathroom",
      fixture_type: "corroded_mixer",
      water_isolation_access: "accessible",
      water_damage: "possible",
      urgency: "standard",
      property_access: "easy access",
      customer_availability: "weekday mornings",
      photo_count: 2,
      voice_note_count: 1,
      symptoms: ["continuous_drip"],
    }),
    raw_text: ENQUIRY_TEXT_TAP,
    model_risk_flags: ["possible_concealed_leak"],
    expected_band: "inspection_recommended",
    expected_inspection: true,
  },
  {
    id: "gas_smell",
    name: "Customer says gas smell",
    job_type: "hot_water_system",
    facts: facts({
      system_type: "gas_storage",
      symptoms: ["no_hot_water"],
      urgency: "urgent",
      photo_count: 1,
      location_in_property: "garage",
      property_access: "side passage, easy access",
      customer_availability: "call any time",
    }),
    raw_text: "No hot water and there is a gas smell near the unit.",
    model_risk_flags: ["gas_concern"],
    expected_band: "inspection_recommended",
    expected_safety_flag: true,
    expected_inspection: true,
  },
  {
    id: "toilet_overflow",
    name: "Toilet overflowing",
    job_type: "toilet_repair",
    facts: facts({
      location_in_property: "bathroom",
      symptoms: ["overflow"],
      urgency: "emergency",
      photo_count: 1,
      property_access: "easy access",
      customer_availability: "call now",
    }),
    raw_text: "The toilet is overflowing and sewage is coming up. Please help.",
    model_risk_flags: ["overflow", "sewage_concern"],
    expected_band: "inspection_recommended",
    expected_safety_flag: true,
    expected_inspection: true,
  },
  {
    id: "burst_pipe",
    name: "Burst pipe flooding",
    job_type: "leaking_tap",
    facts: facts({
      location_in_property: "laundry",
      symptoms: ["burst_pipe"],
      urgency: "emergency",
      photo_count: 1,
      property_access: "easy access",
      customer_availability: "call now",
    }),
    raw_text: "A pipe has burst under the laundry sink and water is gushing everywhere.",
    model_risk_flags: [],
    expected_band: "inspection_recommended",
    expected_safety_flag: true,
    expected_inspection: true,
  },
];
