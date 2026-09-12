import type { EvidenceItem, JobType } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Demo seed inputs. Raw inputs only — the scope pack is always computed by
 * the deterministic engine, so the demo can never drift from the rules.
 * Seeded to mirror the triage dashboard design: 13 active enquiries —
 * 4 needing information, 2 inspection recommended, 7 ready for estimate.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DemoJobSeed {
  ref:
    | "job_a"
    | "job_b"
    | "job_c"
    | "job_d"
    | "job_e"
    | "job_f"
    | "job_g"
    | "job_h"
    | "job_i"
    | "job_j"
    | "job_k"
    | "job_l"
    | "job_m";
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
  seed_draft?: { message_type: "request_information" | "inspection_recommended"; body: string; requests_fields: string[] };
}

export const DEMO_ORG_NAME = "Melbourne Metro Plumbing";

export const DEMO_JOB_SEEDS: DemoJobSeed[] = [
  {
    ref: "job_a",
    customer: {
      full_name: "Jordan Lee",
      phone: "0412 884 921",
      email: "jordan.lee@example.com.au",
      suburb: "Brunswick, VIC 3056",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "Leaking bathroom tap and suspected mixer cartridge failure. My bathroom tap is leaking — it is not urgent but I would like someone next week. I have uploaded two photos.",
    image_paths: ["/demo/tap-1.jpg", "/demo/tap-2.jpg"],
    facts: {
      location_in_property: "bathroom",
      symptoms: ["continuous_drip"],
      urgency: "standard",
      customer_availability: "next week (flexible mornings)",
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
      phone: "0423 119 402",
      email: "priya.shah@example.com.au",
      suburb: "Richmond, VIC 3121",
    },
    job_type: "toilet_repair",
    enquiry_text:
      "Back-to-wall toilet replacement. We need to replace a back-to-wall toilet in a ground-floor bathroom. Existing water and waste connections are accessible, and photos are attached from the front, side and connection angles. No leak or overflow. We are available Tuesday or Wednesday afternoon.",
    image_paths: ["/demo/toilet-1.jpg", "/demo/toilet-2.jpg", "/demo/toilet-3.jpg"],
    facts: {
      location_in_property: "ground-floor bathroom",
      fixture_type: "back_to_wall",
      symptoms: ["replacement_requested"],
      urgency: "flexible",
      property_access: "accessible, off-street parking",
      customer_availability: "tuesday_or_wednesday_afternoon",
      photo_count: 3,
      notes: ["Full dimensions and model identified"],
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Back-to-wall toilet, ground-floor bathroom",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "photo_observation",
        claim: "Photos appear to show a back-to-wall pan with accessible connections",
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
      phone: "0401 552 830",
      email: "sam.wilson@example.com.au",
      suburb: "Coburg, VIC 3058",
    },
    job_type: "hot_water_system",
    enquiry_text:
      "Hot-water unit leak (Rheem Stellar 330). Our hot-water unit is leaking and there is a smell near the unit. We have no hot water. Please call urgently.",
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
  {
    ref: "job_d",
    customer: {
      full_name: "Marcus Chen",
      phone: "0433 901 228",
      email: "marcus.chen@example.com.au",
      suburb: "Northcote, VIC 3070",
    },
    job_type: "toilet_repair",
    enquiry_text:
      "Blocked storm water drain following heavy rain. Water is pooling along the driveway and the drain is not coping. It can wait until tomorrow but not much longer.",
    image_paths: ["/demo/hotwater-1.jpg"],
    facts: {
      location_in_property: "driveway",
      symptoms: ["blockage"],
      urgency: "urgent",
      photo_count: 1,
      notes: ["CCTV camera inspection needed"],
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Storm-water drain blocked after heavy rain; driveway pooling",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "symptoms",
      },
      {
        type: "photo_observation",
        claim: "Photo shows pooled water along the driveway drain grate",
        source_reference: "image_1",
        certainty: "medium",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [
      "Has the drain backed up into the house at any point?",
      "Do you know where the boundary trap or inspection opening is?",
    ],
    analysis_confidence: 0.74,
    image_notes: [],
  },
  {
    ref: "job_e",
    customer: {
      full_name: "Elena Rostova",
      phone: "0419 723 104",
      email: "elena.rostova@example.com.au",
      suburb: "Carlton, VIC 3053",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "Kitchen sink mixer replacement and dishwasher reconnection. Standard underbench access, and the dishwasher stop-tap is available. Happy to wait for a standard weekday morning.",
    image_paths: ["/demo/tap-1.jpg"],
    facts: {
      location_in_property: "kitchen",
      fixture_type: "sink_mixer",
      water_isolation_access: "accessible",
      water_damage: "none_visible",
      urgency: "standard",
      property_access: "standard underbench access",
      customer_availability: "weekday mornings",
      photo_count: 1,
      notes: ["Standard underbench access confirmed"],
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Kitchen sink mixer to be replaced with dishwasher reconnection",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "customer_enquiry",
        claim: "Standard weekday mornings suit the customer",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.9,
    image_notes: [],
  },
  {
    ref: "job_f",
    customer: {
      full_name: "Harold Simmons",
      phone: "0402 117 663",
      email: "harold.simmons@example.com.au",
      suburb: "Brunswick, VIC 3056",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "Bathroom tap dripping in the hallway ensuite. Please have a look when you can.",
    image_paths: [],
    facts: {
      urgency: "standard",
      photo_count: 0,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Hallway ensuite tap is dripping",
        source_reference: "enquiry_text",
        certainty: "medium",
        fact_key: "symptoms",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [
      "Is the dripping tap a mixer or separate handles?",
      "Where is the tap located — bathroom, kitchen or laundry?",
    ],
    analysis_confidence: 0.7,
    image_notes: [],
  },
  {
    ref: "job_g",
    customer: {
      full_name: "Nadia Petrov",
      phone: "0468 224 190",
      email: "nadia.petrov@example.com.au",
      suburb: "Reservoir, VIC 3073",
    },
    job_type: "hot_water_system",
    enquiry_text:
      "No hot water at all since this morning. The unit is out in the garage.",
    image_paths: [],
    facts: {
      location_in_property: "garage",
      symptoms: ["no_hot_water"],
      photo_count: 0,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "No hot water since this morning; unit in the garage",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "symptoms",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [
      "Do you know if it is a gas, electric, heat pump or continuous-flow system?",
      "Is the pilot light out, or is the display showing an error code?",
    ],
    analysis_confidence: 0.72,
    image_notes: [],
    seed_draft: {
      message_type: "request_information",
      body:
        "Hi Nadia,\n\nThanks for reaching out about your hot-water-system issue. To give you an accurate response, could you help us with a few quick details?\n\n- System type: Do you know if it is a gas, electric, heat pump or continuous-flow system?\n- System age: Do you know roughly how old the unit is?\n- Property access: Is the unit easy to get to, and is there parking?\n\nOnce we have these, we'll be in touch straight away with the best next step.\n\nKind regards,\nAlex — licensed plumber",
      requests_fields: ["system_type", "system_age", "property_access"],
    },
  },
  {
    ref: "job_h",
    customer: {
      full_name: "Chris Wong",
      phone: "0431 559 742",
      email: "chris.wong@example.com.au",
      suburb: "Coburg, VIC 3058",
    },
    job_type: "toilet_repair",
    enquiry_text: "Toilet keeps running.",
    image_paths: [],
    facts: {
      symptoms: ["running_water"],
      photo_count: 0,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Toilet keeps running continuously",
        source_reference: "enquiry_text",
        certainty: "medium",
        fact_key: "symptoms",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [
      "Is the cistern on top of the pan (close-coupled) or concealed in the wall?",
      "Where is the toilet located in the property?",
    ],
    analysis_confidence: 0.66,
    image_notes: [],
    seed_draft: {
      message_type: "request_information",
      body:
        "Hi Chris,\n\nThanks for reaching out about your toilet repair. To give you an accurate response, could you help us with a few quick details?\n\n- Location in property: Which bathroom is the toilet in?\n- Issue type: Is the issue a leak, a blockage, running water, or something else?\n- Toilet style: Is the cistern on top of the pan (close-coupled) or concealed in the wall?\n\nOnce we have these, we'll be in touch straight away with the best next step.\n\nKind regards,\nAlex — licensed plumber",
      requests_fields: ["location_in_property", "fixture_type", "symptoms"],
    },
  },
  {
    ref: "job_i",
    customer: {
      full_name: "Bea North",
      phone: "0435 880 214",
      email: "bea.north@example.com.au",
      suburb: "Northcote, VIC 3070",
    },
    job_type: "toilet_repair",
    enquiry_text:
      "Leaking toilet cistern replacement. The cistern slowly fills and drips into the pan. Standard close-coupled unit with an accessible isolation valve. Parking is easy on the street. Weekday afternoons suit.",
    image_paths: ["/demo/toilet-1.jpg", "/demo/toilet-2.jpg"],
    facts: {
      location_in_property: "bathroom",
      fixture_type: "close_coupled",
      symptoms: ["leak"],
      urgency: "standard",
      property_access: "street parking",
      customer_availability: "weekday afternoons",
      photo_count: 2,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Close-coupled cistern leaking into the pan",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "customer_enquiry",
        claim: "Weekday afternoons suit the customer",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.9,
    image_notes: [],
  },
  {
    ref: "job_j",
    customer: {
      full_name: "Tom Kelly",
      phone: "0410 447 208",
      email: "tom.kelly@example.com.au",
      suburb: "Essendon, VIC 3040",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "Laundry mixer tap replacement. Single-lever laundry mixer dripping from the spout; the isolation valve under the sink turns freely. No visible water damage. A standard booking is fine.",
    image_paths: ["/demo/tap-2.jpg", "/demo/tap-1.jpg"],
    facts: {
      location_in_property: "laundry",
      fixture_type: "mixer_tap",
      water_isolation_access: "accessible",
      water_damage: "none_visible",
      urgency: "standard",
      property_access: "driveway available",
      customer_availability: "any weekday",
      photo_count: 2,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Single-lever laundry mixer dripping from the spout",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "photo_observation",
        claim: "Photo shows a single-lever mixer with the isolation valve visible",
        source_reference: "image_1",
        certainty: "medium",
        fact_key: "water_isolation_access",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.89,
    image_notes: [],
  },
  {
    ref: "job_k",
    customer: {
      full_name: "Alice Nguyen",
      phone: "0421 663 055",
      email: "alice.nguyen@example.com.au",
      suburb: "Preston, VIC 3072",
    },
    job_type: "hot_water_system",
    enquiry_text:
      "Hot-water service temperature fault. Water is only lukewarm; electric storage system about 8 years old in the garage. Access is clear and we are home mornings.",
    image_paths: ["/demo/hotwater-1.jpg"],
    facts: {
      system_type: "electric_storage",
      system_age: "8 years",
      symptoms: ["low_water_temperature"],
      location_in_property: "garage",
      urgency: "standard",
      property_access: "clear driveway access",
      customer_availability: "mornings",
      photo_count: 1,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Electric storage system about 8 years old; water only lukewarm",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "system_type",
      },
      {
        type: "customer_enquiry",
        claim: "Customer is home mornings",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.87,
    image_notes: [],
  },
  {
    ref: "job_l",
    customer: {
      full_name: "Oscar Reed",
      phone: "0434 220 891",
      email: "oscar.reed@example.com.au",
      suburb: "Fitzroy, VIC 3065",
    },
    job_type: "toilet_repair",
    enquiry_text:
      "Broken toilet button and cistern valve replacement. The flush button has snapped and the inlet valve runs on. Close-coupled unit, access is straightforward. Tuesday or Thursday suit.",
    image_paths: ["/demo/toilet-3.jpg", "/demo/toilet-1.jpg"],
    facts: {
      location_in_property: "bathroom",
      fixture_type: "close_coupled",
      symptoms: ["broken_flush_button"],
      urgency: "standard",
      property_access: "on-street parking",
      customer_availability: "tuesday_or_thursday",
      photo_count: 2,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Flush button snapped and inlet valve running on",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "symptoms",
      },
      {
        type: "customer_enquiry",
        claim: "Tuesday or Thursday suit the customer",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.9,
    image_notes: [],
  },
  {
    ref: "job_m",
    customer: {
      full_name: "Mia Sandoval",
      phone: "0439 771 468",
      email: "mia.sandoval@example.com.au",
      suburb: "Carlton, VIC 3053",
    },
    job_type: "leaking_tap",
    enquiry_text:
      "Shower mixer drip repair. Wall mixer drips continuously; the access plate is intact and water can be isolated at the unit. No water damage on the tiles. Flexible on timing.",
    image_paths: ["/demo/tap-1.jpg", "/demo/tap-2.jpg"],
    facts: {
      location_in_property: "bathroom",
      fixture_type: "wall_mixer",
      water_isolation_access: "accessible",
      water_damage: "none_visible",
      urgency: "flexible",
      property_access: "unit access easy",
      customer_availability: "flexible",
      photo_count: 2,
    },
    evidence: [
      {
        type: "customer_enquiry",
        claim: "Wall mixer drips continuously; isolation available at the unit",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "fixture_type",
      },
      {
        type: "customer_enquiry",
        claim: "Customer is flexible on timing",
        source_reference: "enquiry_text",
        certainty: "high",
        fact_key: "customer_availability",
      },
    ],
    model_risk_flags: [],
    recommended_questions: [],
    analysis_confidence: 0.88,
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
