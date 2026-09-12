import type { EvidenceItem, JobType } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Demo seed inputs. Raw inputs only — the scope pack is always computed by
 * the deterministic engine, so the demo can never drift from the rules.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DemoJobSeed {
  ref: "job_a" | "job_b" | "job_c";
  customer: {
    full_name: string;
    phone: string;
    email: string;
    suburb: string;
  };
  job_type: JobType;
  enquiry_text: string;
  image_paths: string[];
  facts: Record<string, unknown>;
  evidence: EvidenceItem[];
  model_risk_flags: string[];
  recommended_questions: string[];
  analysis_confidence: number;
  image_notes: Array<{ source_reference: string; claim: string; certainty: "high" | "medium" | "low" }>;
}

export const DEMO_ORG_NAME = "Melbourne Metro Plumbing";

export const DEMO_JOB_SEEDS: DemoJobSeed[] = [
  {
    ref: "job_a",
    customer: {
      full_name: "Jordan Lee",
      phone: "+61 4XX XXX XXX",
      email: "jordan.lee@example.com",
      suburb: "Brunswick, VIC",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "My bathroom tap is leaking. It is not an emergency, but can someone come next week? I uploaded two photos.",
    image_paths: ["/demo/tap-1.jpg", "/demo/tap-2.jpg"],
    facts: {
      location_in_property: "bathroom",
      symptoms: ["continuous_drip"],
      urgency: "standard",
      customer_availability: "next_week",
      photo_count: 2,
      notes: ["Customer states tap is leaking continuously"],
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Bathroom tap is leaking continuously",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "symptoms",
      },
      {
        type: "customer_enquiry",
        claim: "Not an emergency; available next week",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
      {
        type: "photo_observation",
        claim: "Photo appears to show a basin mixer tap in a bathroom vanity",
        source_reference: "image_1",
        certainty: "medium",
        fact_key: "fixture_type",
      },
      {
        type: "photo_observation",
        claim: "Photo quality is insufficient to confirm under-sink access or water damage",
        source_reference: "image_2",
        certainty: "medium",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [
      "Is the water isolation valve accessible under the basin?",
      "Can you share a photo showing access beneath the basin?",
      "Is there any swelling or dampness in the cupboard?",
    ],
    analysis_confidence: 0.86,
    image_notes: [],
  },
  {
    ref: "job_b",
    customer: {
      full_name: "Priya Shah",
      phone: "+61 4XX XXX XXX",
      email: "priya.shah@example.com",
      suburb: "Richmond, VIC",
    },
    job_type: "toilet_repair",
    enquiry_text:
      "We need to replace a standard close-coupled toilet in a ground-floor bathroom. Existing water and waste connections are accessible. I have included front, side, and connection photos. No leak or overflow. We are available Tuesday or Wednesday afternoon.",
    image_paths: ["/demo/toilet-1.jpg", "/demo/toilet-2.jpg", "/demo/toilet-3.jpg"],
    facts: {
      location_in_property: "ground-floor bathroom",
      fixture_type: "close_coupled",
      symptoms: ["replacement_requested"],
      urgency: "flexible",
      property_access: "accessible, off-street parking",
      customer_availability: "tuesday_or_wednesday_afternoon",
      photo_count: 3,
      notes: [
        "Customer confirms existing water and waste connections are accessible",
        "No leak or overflow reported",
      ],
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Standard close-coupled toilet, ground-floor bathroom",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "photo_observation",
        claim: "Photos appear to show a close-coupled pan with accessible connections",
        source_reference: "image_1",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "customer_enquiry",
        claim: "Available Tuesday or Wednesday afternoon",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.91,
    image_notes: [],
  },
  {
    ref: "job_c",
    customer: {
      full_name: "Sam Wilson",
      phone: "+61 4XX XXX XXX",
      email: "sam.wilson@example.com",
      suburb: "Coburg, VIC",
    },
    job_type: "hot_water_system",
    enquiry_text:
      "Our hot-water unit is leaking and there is a smell near the unit. We have no hot water. Please call urgently.",
    image_paths: ["/demo/hotwater-1.jpg"],
    facts: {
      system_type: "unknown",
      symptoms: ["tank_leak", "no_hot_water"],
      urgency: "urgent",
      location_in_property: "side passage",
      customer_availability: "call to arrange",
      photo_count: 1,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Hot-water unit leaking; no hot water",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "symptoms",
      },
      {
        type: "customer_enquiry",
        claim: "Customer reports a smell near the unit and asks for an urgent call",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "urgency",
      },
      {
        type: "photo_observation",
        claim: "Photo appears to show a storage tank on an external wall; data plate not readable",
        source_reference: "image_1",
        certainty: "low",
        fact_key: "system_type",
      },
    ],
    model_risk_flags: ["tank_leak"],
    recommended_questions: [
      "Is the smell like gas or more like a damp/musty smell?",
      "Has anyone switched off the water supply to the unit?",
    ],
    analysis_confidence: 0.78,
    image_notes: [],
  },
];

/* The canonical voice note used in the demo (Job A). */
export const DEMO_VOICE_NOTE = {
  ref: "job_a_voice_1",
  transcript:
    "I inspected Jordan's bathroom tap. It is a corroded mixer. The isolation valve is accessible, but the cabinet base is damp. I cannot rule out a concealed leak, so book an inspection before providing a fixed price.",
  extracted: {
    facts: {
      fixture_type: "corroded_mixer",
      water_isolation_access: "accessible",
      water_damage: "possible",
    },
    risk_flags: ["possible_concealed_leak"],
    evidence: [
      {
        type: "voice_note" as const,
        claim: "Fixture identified as a corroded mixer; isolation valve accessible",
        source_reference: "voice_note_1",
        certainty: "high" as const,
        fact_key: "fixture_type",
      },
      {
        type: "voice_note" as const,
        claim: "Cabinet base is damp — cannot rule out a concealed leak",
        source_reference: "voice_note_1",
        certainty: "high" as const,
        fact_key: "water_damage",
      },
    ],
  },
};
