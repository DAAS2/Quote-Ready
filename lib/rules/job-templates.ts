import type { JobType } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic service templates per supported job type.
 * This is trade knowledge encoded as data: what a plumber needs to know
 * before committing to a price, and when an on-site inspection is required.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RequiredField {
  key: string;
  label: string;
  /** critical = absence caps readiness at 69 */
  critical: boolean;
  why: string;
  /** value asked from the customer vs established on site */
  ask_customer: boolean;
}

export interface InspectionCondition {
  /** risk-flag ids or fact conditions that trigger inspection */
  any_risk_flag?: string[];
  any_fact?: Array<{ key: string; value: string }>;
  label: string;
}

export interface JobTemplate {
  type: JobType;
  label: string;
  blurb: string;
  required_fields: RequiredField[];
  /** questions to derive when the field is missing */
  questions: Record<string, string>;
  assumptions: string[];
  exclusions: string[];
  inspection_conditions: InspectionCondition[];
  /** evidence weights */
  min_photos_for_good_evidence: number;
  message_guidance: string;
}

const LOCATION_FIELD: RequiredField = {
  key: "location_in_property",
  label: "Location in property",
  critical: true,
  why: "Determines access requirements and likely fixture configuration.",
  ask_customer: true,
};

const ACCESS_FIELD: RequiredField = {
  key: "property_access",
  label: "Property access",
  critical: true,
  why: "Driveway/parking, gate access and site entry affect the visit and quote.",
  ask_customer: true,
};

const AVAILABILITY_FIELD: RequiredField = {
  key: "customer_availability",
  label: "Customer availability",
  critical: false,
  why: "Needed to schedule the visit or inspection window.",
  ask_customer: true,
};

const URGENCY_FIELD: RequiredField = {
  key: "urgency",
  label: "Urgency",
  critical: true,
  why: "Separates standard bookings from emergency call-outs and pricing.",
  ask_customer: true,
};

export const JOB_TEMPLATES: Record<JobType, JobTemplate> = {
  leaking_tap: {
    type: "leaking_tap",
    label: "Leaking tap / mixer",
    blurb: "Dripping or leaking taps, mixers and spouts, including wall-mounted mixers.",
    required_fields: [
      LOCATION_FIELD,
      {
        key: "fixture_type",
        label: "Fixture type",
        critical: true,
        why: "Mixer vs pillar tap, washer vs cartridge, changes parts and labour.",
        ask_customer: true,
      },
      {
        key: "water_isolation_access",
        label: "Water isolation access",
        critical: false,
        why: "Isolation valve access determines whether the repair can proceed on the first visit.",
        ask_customer: true,
      },
      {
        key: "water_damage",
        label: "Water damage",
        critical: false,
        why: "Damage to cabinetry or walls may indicate a concealed leak needing inspection.",
        ask_customer: true,
      },
      URGENCY_FIELD,
      ACCESS_FIELD,
      AVAILABILITY_FIELD,
    ],
    questions: {
      fixture_type:
        "Is the leaking tap a single-lever mixer or does it have separate hot and cold handles?",
      water_isolation_access:
        "Is there an isolation valve under the sink or in the cupboard, and is it easy to reach?",
      water_damage:
        "Is there any swelling, staining or dampness in the cupboard or around the bench?",
      property_access: "Is there anywhere to park, and any gate or security access we should know about?",
      customer_availability: "Which days or times generally suit for a visit?",
    },
    assumptions: [
      "Fixture is a standard residential tap/mixer unless photos indicate otherwise",
      "Repair is to the tap/mixer itself, not the incoming water main",
    ],
    exclusions: [
      "Concealed in-wall pipe repairs",
      "Replacement of tile, benchtop or cabinetry damaged by water",
      "Main pressure-regulating valve work",
    ],
    inspection_conditions: [
      {
        any_risk_flag: ["possible_concealed_leak", "water_damage", "corroded_fixture"],
        label: "Signs of a possible concealed leak or visible water damage",
      },
      {
        any_fact: [{ key: "fixture_type", value: "unknown" }],
        label: "Fixture type cannot be established from the enquiry or photos",
      },
    ],
    min_photos_for_good_evidence: 2,
    message_guidance:
      "Ask for a close-up of the tap, whether it is a mixer or separate handles, and under-sink access. Never state a cause or price.",
  },

  toilet_repair: {
    type: "toilet_repair",
    label: "Toilet repair / replacement",
    blurb: "Leaking, running, blocked or broken toilets, including full replacement.",
    required_fields: [
      LOCATION_FIELD,
      {
        key: "fixture_type",
        label: "Toilet style",
        critical: false,
        why: "Close-coupled vs wall-faced vs in-wall cistern changes parts and labour.",
        ask_customer: true,
      },
      {
        key: "symptoms",
        label: "Issue type",
        critical: true,
        why: "Leak, blockage, running water or crack each route to different work.",
        ask_customer: true,
      },
      URGENCY_FIELD,
      ACCESS_FIELD,
      AVAILABILITY_FIELD,
    ],
    questions: {
      fixture_type: "Is the cistern on top of the pan (close-coupled) or concealed in the wall?",
      symptoms: "Is the issue a leak, a blockage, running water, or something else?",
      property_access: "Is there anywhere to park, and any gate or security access we should know about?",
      customer_availability: "Which days or times generally suit for a visit?",
    },
    assumptions: [
      "Standard residential pan and cistern unless photos indicate otherwise",
      "Existing water and waste connections remain serviceable",
    ],
    exclusions: [
      "Sewer main or boundary trap work",
      "Floor/wall tile or waterproofing repair",
      "Structural or sub-floor frame damage",
    ],
    inspection_conditions: [
      {
        any_risk_flag: ["sewage_concern", "overflow", "floor_water_damage"],
        label: "Overflow, sewage or floor damage indications",
      },
      {
        any_fact: [{ key: "fixture_type", value: "unknown" }],
        label: "Toilet style cannot be established (in-wall cistern changes scope significantly)",
      },
    ],
    min_photos_for_good_evidence: 2,
    message_guidance:
      "Ask for a front and side photo of the toilet and where the water isolation tap is. Never state a cause or price.",
  },

  hot_water_system: {
    type: "hot_water_system",
    label: "Hot-water-system issue",
    blurb: "No hot water, leaking tanks, error codes and pilot/gas issues.",
    required_fields: [
      {
        key: "system_type",
        label: "System type",
        critical: true,
        why: "Gas, electric, heat pump or continuous-flow changes diagnosis entirely.",
        ask_customer: true,
      },
      {
        key: "symptoms",
        label: "Symptoms",
        critical: true,
        why: "Leak, no hot water, error code or smell each route to different work.",
        ask_customer: true,
      },
      LOCATION_FIELD,
      {
        key: "system_age",
        label: "System age",
        critical: false,
        why: "Age drives repair-vs-replace decisions and warranty state.",
        ask_customer: true,
      },
      URGENCY_FIELD,
      ACCESS_FIELD,
      AVAILABILITY_FIELD,
    ],
    questions: {
      system_type: "Do you know if it is a gas, electric, heat pump or continuous-flow system?",
      system_age: "Do you know roughly how old the unit is, or when it was installed?",
      property_access: "Is the unit accessible (e.g. in a garage or side passage), and is there parking?",
      customer_availability: "Which days or times generally suit for a visit?",
    },
    assumptions: [
      "System is standard residential capacity unless photos indicate otherwise",
      "Existing gas/water/electrical connections are serviceable",
    ],
    exclusions: [
      "Gas main or meter work",
      "Electrical switchboard or circuit work",
      "Replacement of damaged flooring, walls or enclosures",
    ],
    inspection_conditions: [
      {
        any_risk_flag: ["gas_concern", "electrical_concern", "tank_leak", "no_hot_water_with_leak"],
        label: "Gas, electrical or tank-leak indications",
      },
      {
        any_fact: [{ key: "system_type", value: "unknown" }],
        label: "System type unknown — on-site identification required",
      },
    ],
    min_photos_for_good_evidence: 1,
    message_guidance:
      "Ask for a photo of the unit's data plate and any error display. Never state a cause or price.",
  },
};

export function getTemplate(jobType: JobType): JobTemplate {
  return JOB_TEMPLATES[jobType];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = Object.fromEntries(
  Object.values(JOB_TEMPLATES).map((t) => [t.type, t.label]),
) as Record<JobType, string>;

/* ── Safety patterns: hard override, applied to raw customer text ────────── */

export const SAFETY_PATTERNS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: "gas_smell", label: "Possible gas odour reported", pattern: /\bgas\b[^.]*\b(smell|smelling|stink|odour|odor|leak)\b|\b(smell|smelling|stink|odour|odor)\b[^.]*\bgas\b/i },
  { id: "gas_or_unit_smell", label: "Unusual odour reported near equipment", pattern: /\b(smell|smelling|stink|stinks|odour|odor)\b[^.]*\b(near|around|by)\b|\b(rotten|sulphur|sulfur)\b/i },
  { id: "sewage", label: "Sewage or backflow concern reported", pattern: /\b(sewage|sewerage|raw waste|backflow|faecal|fecal)\b/i },
  { id: "electrical_hazard", label: "Electrical hazard signs reported", pattern: /\b(sparking|sparks|burning smell|electrical burning|smoking outlet|smoking power ?point)\b/i },
  { id: "burst_flooding", label: "Active flooding / burst reported", pattern: /\b(burst|flooding|flood|water pouring|water everywhere|gushing)\b/i },
  { id: "urgent_safety", label: "Customer describes urgent safety concern", pattern: /\b(dangerous|urgent safety|unsafe)\b/i },
];

export const INSPECTION_RISK_FLAGS: Record<string, { label: string; requires_inspection: boolean; severity: "attention" | "high" }> = {
  possible_concealed_leak: { label: "Possible concealed leak", requires_inspection: true, severity: "high" },
  water_damage: { label: "Water damage reported or visible", requires_inspection: true, severity: "high" },
  corroded_fixture: { label: "Corrosion observed on fixture", requires_inspection: true, severity: "attention" },
  sewage_concern: { label: "Sewage/backflow concern", requires_inspection: true, severity: "high" },
  overflow: { label: "Overflow reported", requires_inspection: true, severity: "high" },
  floor_water_damage: { label: "Floor damage from water", requires_inspection: true, severity: "attention" },
  gas_concern: { label: "Gas-related concern", requires_inspection: true, severity: "high" },
  electrical_concern: { label: "Electrical-related concern", requires_inspection: true, severity: "high" },
  tank_leak: { label: "Tank leak observed", requires_inspection: true, severity: "high" },
  no_hot_water_with_leak: { label: "No hot water combined with a leak", requires_inspection: true, severity: "high" },
  uncertain_cause: { label: "Cause cannot be established remotely", requires_inspection: true, severity: "attention" },
  access_unclear: { label: "Access constraints unclear", requires_inspection: true, severity: "attention" },
  insufficient_diagnostic_evidence: { label: "Photos insufficient for remote assessment", requires_inspection: true, severity: "attention" },
};
