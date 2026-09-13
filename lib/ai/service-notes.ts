import { createHash } from "node:crypto";
import type { JobFacts, JobType } from "./schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * QuoteReady service playbook — the curated corpus behind service guidance.
 *
 * WHY THIS IS CODE, NOT A SCRAPED CORPUS
 * Trade guidance is the product's defensible knowledge, so it is authored,
 * reviewed and version-controlled here. Nothing is generated at request time
 * and nothing is retrieved from the open internet. The vector index in
 * Postgres (supabase/migrations/0006_service_notes.sql) is a DERIVED COPY of
 * this list: if the index is missing, stale or unreachable, the deterministic
 * ranker below answers from the same source, so guidance never disappears.
 *
 * WHAT IT IS ALLOWED TO DO
 * Guidance shapes wording and what to ask/check next. It never sets the
 * readiness score, the band, the overrides or the safety escalation — those
 * stay in lib/rules, which is pure, deterministic and tested.
 *
 * WHAT IT MUST NOT CONTAIN
 * No diagnosis, no prices, no regulatory assertions. Notes are written as
 * "confirm / ask / allow for" guidance an operator reads and judges.
 * ──────────────────────────────────────────────────────────────────────────── */

export type ServiceNoteJobType = JobType | "any";

export interface ServiceNote {
  /** stable id — also the primary key in the derived Postgres index */
  id: string;
  job_type: ServiceNoteJobType;
  title: string;
  body: string;
  /** fact values and topics this note answers to (drives deterministic ranking) */
  tags: string[];
  source: string;
  /** playbook reference shown in the UI citation */
  reference: string;
}

const PLAYBOOK = "QuoteReady service playbook";

export const SERVICE_NOTE_CORPUS_VERSION = "2026-09-14.1";

export const SERVICE_NOTES: ServiceNote[] = [
  /* ── Leaking tap / mixer ─────────────────────────────────────────────────── */
  {
    id: "tap-confirm-fixture-style",
    job_type: "leaking_tap",
    title: "Confirm mixer vs pillar before booking",
    body: "A single-lever mixer and a pair of separate handles take different parts and different time. Ask which one it is (or get a photo of the tap) so the first visit can finish the job.",
    tags: ["fixture_type", "mixer_tap", "pillar_tap", "continuous_drip"],
    source: PLAYBOOK,
    reference: "QR-PB-001",
  },
  {
    id: "tap-brand-and-model",
    job_type: "leaking_tap",
    title: "Record the brand and model",
    body: "Brand and model are usually stamped on the tap body or the base ring. With them, the correct cartridge or seat can be quoted in one trip instead of two.",
    tags: ["brand", "cartridge", "fixture_type", "replacement_requested"],
    source: PLAYBOOK,
    reference: "QR-PB-002",
  },
  {
    id: "tap-mixer-age-seat",
    job_type: "leaking_tap",
    title: "Older mixers: allow for the seat, not just the cartridge",
    body: "On mixers beyond roughly a decade old, replacing the cartridge alone often does not stop the drip because the seat is pitted. Allow for re-seating or a body replacement in the scope.",
    tags: ["mixer_tap", "system_age", "cartridge", "corroded_mixer"],
    source: PLAYBOOK,
    reference: "QR-PB-003",
  },
  {
    id: "tap-corroded-body",
    job_type: "leaking_tap",
    title: "Corroded fixtures may need the body replaced",
    body: "Where the fixture body is corroded, resealing is a short-term fix. Check replacement availability before promising the job will be finished in one visit.",
    tags: ["corroded_mixer", "corrosion", "corroded_fixture", "replacement_requested"],
    source: PLAYBOOK,
    reference: "QR-PB-004",
  },
  {
    id: "tap-isolation-not-holding",
    job_type: "leaking_tap",
    title: "If isolation is not reachable or does not hold, plan a mains shutdown",
    body: "Tell the customer water will be off for the duration and check nothing else on the property depends on it at that time (e.g. a tenanted unit).",
    tags: ["water_isolation_access", "constrained", "blocked", "isolation", "isolation_valve"],
    source: PLAYBOOK,
    reference: "QR-PB-005",
  },
  {
    id: "tap-mini-stop-seized",
    job_type: "leaking_tap",
    title: "Allow for a seized mini-stop",
    body: "Seized isolation valves are common on older installations. When the valve will not turn, add a replacement stop valve to the parts list rather than discovering it on site.",
    tags: ["water_isolation_access", "stuck_isolation_valve", "isolation_valve"],
    source: PLAYBOOK,
    reference: "QR-PB-006",
  },
  {
    id: "tap-wall-mounted-body-access",
    job_type: "leaking_tap",
    title: "Wall-mounted mixers need body access",
    body: "Confirm whether the body can be reached from the wall or the adjacent room. Access determines whether this is a one-visit repair or a two-stage job.",
    tags: ["wall_mounted", "location_in_property", "property_access", "access"],
    source: PLAYBOOK,
    reference: "QR-PB-007",
  },
  {
    id: "tap-damp-cabinetry",
    job_type: "leaking_tap",
    title: "Damp cabinetry: record it, do not quote around it",
    body: "Swollen or damp cabinet bases can mean the moisture source is behind the fixture. Capture what you saw in the scope and route it to an inspection instead of pricing blind.",
    tags: ["water_damage", "possible", "damp", "moist"],
    source: PLAYBOOK,
    reference: "QR-PB-008",
  },
  {
    id: "tap-confirmed-water-damage",
    job_type: "leaking_tap",
    title: "Confirmed water damage: separate the make-good from the repair",
    body: "Photograph the affected surfaces and list cabinetry, tiling and painted surfaces as exclusions so the repair scope stays honest.",
    tags: ["water_damage", "confirmed", "exclusions"],
    source: PLAYBOOK,
    reference: "QR-PB-009",
  },
  {
    id: "tap-exclusions-surface-damage",
    job_type: "leaking_tap",
    title: "State the surface exclusions every time",
    body: "Tile, tile resealing, benchtop and cabinet repairs sit outside standard tap work. One line on the scope prevents most disputes later.",
    tags: ["exclusions", "water_damage"],
    source: PLAYBOOK,
    reference: "QR-PB-010",
  },
  {
    id: "tap-drip-vs-base-leak",
    job_type: "leaking_tap",
    title: "\"Dripping when closed\" is not the same as \"wet at the base\"",
    body: "A drip from the spout when the tap is shut points to the internals; water around the base while running points to the seals and body. Ask which one the customer sees.",
    tags: ["continuous_drip", "leak_observed", "symptoms"],
    source: PLAYBOOK,
    reference: "QR-PB-011",
  },
  {
    id: "tap-two-photos-standard",
    job_type: "leaking_tap",
    title: "The two photos that save a visit",
    body: "A close-up of the tap and a shot of the under-sink isolation valve answer most of the questions that would otherwise need a site visit.",
    tags: ["photo_count", "evidence", "water_isolation_access"],
    source: PLAYBOOK,
    reference: "QR-PB-012",
  },
  {
    id: "tap-mains-pressure-check",
    job_type: "leaking_tap",
    title: "Repeated mixer failures: check the pressure",
    body: "On mains-pressure installs, a failed pressure-limiting valve can be why mixers keep going. Worth checking when the customer says it has been repaired before.",
    tags: ["mixer_tap", "pressure", "repeat_repair"],
    source: PLAYBOOK,
    reference: "QR-PB-013",
  },
  {
    id: "tap-vanity-clearance",
    job_type: "leaking_tap",
    title: "Confined vanities slow the work",
    body: "Ask for the clearance under the basin and whether the cupboard interior is clear. Cramped access changes the visit duration and sometimes needs a second pair of hands.",
    tags: ["access", "property_access", "location_in_property", "bathroom"],
    source: PLAYBOOK,
    reference: "QR-PB-014",
  },

  /* ── Toilet repair / replacement ─────────────────────────────────────────── */
  {
    id: "toilet-identify-style",
    job_type: "toilet_repair",
    title: "Identify the toilet style first",
    body: "Close-coupled, wall-faced and concealed-cistern toilets take different parts and different access. One photo of the whole toilet settles it.",
    tags: ["fixture_type", "close_coupled", "concealed_cistern", "wall_faced"],
    source: PLAYBOOK,
    reference: "QR-PB-020",
  },
  {
    id: "toilet-cistern-brand",
    job_type: "toilet_repair",
    title: "Cistern parts are brand specific",
    body: "Inlet and outlet valves rarely interchange between brands. Capture the cistern brand (usually inside the lid) before quoting parts.",
    tags: ["brand", "cistern", "fixture_type", "replacement_requested"],
    source: PLAYBOOK,
    reference: "QR-PB-021",
  },
  {
    id: "toilet-running-water",
    job_type: "toilet_repair",
    title: "Running water: confirm where it goes",
    body: "Water trickling into the pan continuously points at the outlet valve or float; water on the floor is a different problem. Ask what the customer actually sees.",
    tags: ["running_water", "symptoms", "continuous_drip"],
    source: PLAYBOOK,
    reference: "QR-PB-022",
  },
  {
    id: "toilet-leak-at-base",
    job_type: "toilet_repair",
    title: "Leaks at the pan base can reach the floor structure",
    body: "The pan collar and floor waste are the usual suspects. Treat floor covering and structural make-good as separate, excluded work.",
    tags: ["leak_observed", "water_damage", "exclusions", "floor_water_damage"],
    source: PLAYBOOK,
    reference: "QR-PB-023",
  },
  {
    id: "toilet-blockage-vs-main",
    job_type: "toilet_repair",
    title: "One-fixture blockage vs main line",
    body: "Ask whether other fixtures in the property drain normally. A single-fixture blockage is a different job from a main-line issue, and the customer should know which one they are getting.",
    tags: ["blockage", "symptoms"],
    source: PLAYBOOK,
    reference: "QR-PB-024",
  },
  {
    id: "toilet-setout-measurement",
    job_type: "toilet_repair",
    title: "Measure the setout before ordering a replacement",
    body: "Replacement pans need the existing setout to match. A different setout turns a swap into a plumbing alteration — confirm it before committing to a date.",
    tags: ["replacement_requested", "setout", "fixture_type"],
    source: PLAYBOOK,
    reference: "QR-PB-025",
  },
  {
    id: "toilet-concealed-access-panel",
    job_type: "toilet_repair",
    title: "Concealed cisterns need service access",
    body: "Confirm there is an access panel or removable wall section. Without it, the job may need making good afterwards, which belongs in the exclusions.",
    tags: ["concealed_cistern", "access", "property_access", "exclusions"],
    source: PLAYBOOK,
    reference: "QR-PB-026",
  },
  {
    id: "toilet-sewage-odour-escalate",
    job_type: "toilet_repair",
    title: "Sewage odour is a safety signal, not a quote",
    body: "Escalate it through the safety path and stop estimating until it is resolved by the appropriate professional process.",
    tags: ["sewage_concern", "safety", "overflow"],
    source: PLAYBOOK,
    reference: "QR-PB-027",
  },
  {
    id: "toilet-floor-water",
    job_type: "toilet_repair",
    title: "Floor water: photograph and flag",
    body: "Water tracking under floor coverings is easy to underestimate from a description. Capture it as evidence and let the operator decide on inspection.",
    tags: ["floor_water_damage", "water_damage", "overflow"],
    source: PLAYBOOK,
    reference: "QR-PB-028",
  },
  {
    id: "toilet-older-property-setout",
    job_type: "toilet_repair",
    title: "Older properties: allow for non-standard setouts",
    body: "Older homes often have lead bends, non-standard setouts and no isolation at the pan. Allow extra parts and time in the scope rather than absorbing them later.",
    tags: ["property_type", "setout", "older_property"],
    source: PLAYBOOK,
    reference: "QR-PB-029",
  },
  {
    id: "toilet-out-of-service-day",
    job_type: "toilet_repair",
    title: "A replacement takes the toilet out of service",
    body: "Confirm the customer can be without that fixture for the day, and whether it is the only toilet on the property.",
    tags: ["customer_availability", "replacement_requested", "scheduling"],
    source: PLAYBOOK,
    reference: "QR-PB-030",
  },
  {
    id: "toilet-cistern-photos",
    job_type: "toilet_repair",
    title: "Photos inside the cistern save a diagnostic visit",
    body: "A shot inside the cistern with the lid off, plus the pan connection, usually identifies the parts needed before the visit.",
    tags: ["photo_count", "evidence", "cistern"],
    source: PLAYBOOK,
    reference: "QR-PB-031",
  },

  /* ── Hot water system ────────────────────────────────────────────────────── */
  {
    id: "hw-identify-system-type",
    job_type: "hot_water_system",
    title: "Identify the system type before anything else",
    body: "Gas storage, electric storage, heat pump and continuous flow are four different scopes with four different parts chains. Identify it from the data plate or a photo.",
    tags: [
      "system_type",
      "gas_storage",
      "electric_storage",
      "heat_pump",
      "continuous_flow",
      "tankless",
    ],
    source: PLAYBOOK,
    reference: "QR-PB-040",
  },
  {
    id: "hw-age-and-warranty",
    job_type: "hot_water_system",
    title: "Record the age from the data plate",
    body: "Manufacture date decides whether a unit may still be inside warranty. Units inside warranty should be referred back to the manufacturer before any repair is quoted.",
    tags: ["system_age", "warranty", "data_plate"],
    source: PLAYBOOK,
    reference: "QR-PB-041",
  },
  {
    id: "hw-gas-odour-escalate",
    job_type: "hot_water_system",
    title: "Any gas odour stops the estimate path",
    body: "Treat it as an immediate safety escalation and follow the appropriate professional or emergency process. Do not present a scope as a safety assessment.",
    tags: ["gas_concern", "safety", "gas_smell"],
    source: PLAYBOOK,
    reference: "QR-PB-042",
  },
  {
    id: "hw-no-hot-water-with-leak",
    job_type: "hot_water_system",
    title: "No hot water plus a leak is not a top-up repair",
    body: "Together these usually mean isolation and replacement consideration rather than a repair. Set expectations before the visit rather than on the day.",
    tags: ["no_hot_water_with_leak", "tank_leak", "no_hot_water"],
    source: PLAYBOOK,
    reference: "QR-PB-043",
  },
  {
    id: "hw-locate-the-leak",
    job_type: "hot_water_system",
    title: "Confirm where the water is coming from",
    body: "Tank seams, fittings and the relief valve look similar in a description but are different jobs. A photo of the wet area plus the unit narrows it down.",
    tags: ["tank_leak", "evidence", "photo_count", "leak_observed"],
    source: PLAYBOOK,
    reference: "QR-PB-044",
  },
  {
    id: "hw-relief-valve-discharge",
    job_type: "hot_water_system",
    title: "Continuous relief valve discharge",
    body: "Constant discharge can come from the valve or from system pressure. Don't price a tank replacement before that is checked.",
    tags: ["relief_valve", "discharge", "tank_leak"],
    source: PLAYBOOK,
    reference: "QR-PB-045",
  },
  {
    id: "hw-tempering-and-temperature",
    job_type: "hot_water_system",
    title: "Include tempering in the scope",
    body: "Hot-water scopes should account for the tempering valve and delivery temperature. The operator confirms what applies to the installation.",
    tags: ["tempering_valve", "compliance", "temperature"],
    source: PLAYBOOK,
    reference: "QR-PB-046",
  },
  {
    id: "hw-find-the-unit",
    job_type: "hot_water_system",
    title: "Locate the unit and its isolation first",
    body: "Roof, cupboard or external — the position changes access, safety and duration. Ask the customer where it is before scheduling.",
    tags: ["location_in_property", "access", "property_access"],
    source: PLAYBOOK,
    reference: "QR-PB-047",
  },
  {
    id: "hw-heat-pump-lead-times",
    job_type: "hot_water_system",
    title: "Heat pumps and solar: check lead times",
    body: "These units use tradie-specific parts and often have longer lead times. Confirm availability before promising a date.",
    tags: ["heat_pump", "solar", "lead_time", "system_type"],
    source: PLAYBOOK,
    reference: "QR-PB-048",
  },
  {
    id: "hw-electrical-is-separate",
    job_type: "hot_water_system",
    title: "Electrical work is a separate trade",
    body: "Where the unit needs electrical work, scope it as a separate licensed trade and list it as an exclusion.",
    tags: ["electrical_concern", "exclusions"],
    source: PLAYBOOK,
    reference: "QR-PB-049",
  },
  {
    id: "hw-shutdown-explained",
    job_type: "hot_water_system",
    title: "Explain the shutdown up front",
    body: "Drain-down and isolation time should be set as an expectation before the visit, especially where the property has tenants.",
    tags: ["customer_expectation", "scheduling", "isolation"],
    source: PLAYBOOK,
    reference: "QR-PB-050",
  },
  {
    id: "hw-condensate-discharge",
    job_type: "hot_water_system",
    title: "Condensate is not always a leak",
    body: "Condensing and continuous-flow units discharge condensate. Check where it goes before treating wet ground under the unit as a fault.",
    tags: ["condensate", "continuous_flow", "water_damage"],
    source: PLAYBOOK,
    reference: "QR-PB-051",
  },

  /* ── Any trade job: scope hygiene ────────────────────────────────────────── */
  {
    id: "any-access-and-parking",
    job_type: "any",
    title: "Confirm parking and gate access",
    body: "Access affects arrival time and sometimes crew size. It is also one of the most common causes of a first visit being cut short.",
    tags: ["property_access", "access", "parking"],
    source: PLAYBOOK,
    reference: "QR-PB-060",
  },
  {
    id: "any-define-urgent",
    job_type: "any",
    title: "Agree what urgent means",
    body: "Confirm whether the customer means same day, next day or this week, so response expectations are set before anyone commits to a window.",
    tags: ["urgency", "emergency", "urgent"],
    source: PLAYBOOK,
    reference: "QR-PB-061",
  },
  {
    id: "any-assumptions-readable",
    job_type: "any",
    title: "Every assumption should be readable by the customer",
    body: "If an assumption on the scope would surprise the customer when they read it, it needs to be a question instead.",
    tags: ["assumptions"],
    source: PLAYBOOK,
    reference: "QR-PB-062",
  },
  {
    id: "any-exclusions-prevent-disputes",
    job_type: "any",
    title: "Exclusions are cheaper than disputes",
    body: "Concealed pipework, made-good surfaces and other trades should be named as excluded before the work starts, not after.",
    tags: ["exclusions"],
    source: PLAYBOOK,
    reference: "QR-PB-063",
  },
  {
    id: "any-evidence-standard",
    job_type: "any",
    title: "Minimum evidence for a confident first visit",
    body: "One wide photo showing the situation and one close-up of the affected component. Below that, expect to ask questions or book an inspection.",
    tags: ["evidence", "photo_count", "insufficient_diagnostic_evidence"],
    source: PLAYBOOK,
    reference: "QR-PB-064",
  },
  {
    id: "any-two-availability-windows",
    job_type: "any",
    title: "Ask for two availability windows",
    body: "One window means one reschedule when something runs long. Two keeps the week workable.",
    tags: ["customer_availability", "scheduling"],
    source: PLAYBOOK,
    reference: "QR-PB-065",
  },
  {
    id: "any-ask-before-you-drive",
    job_type: "any",
    title: "The cheapest visit is the one you don't make",
    body: "Where details are missing, the follow-up question takes two minutes and can replace a wasted trip entirely.",
    tags: ["missing_fields", "follow_up"],
    source: PLAYBOOK,
    reference: "QR-PB-066",
  },
  {
    id: "any-compliance-needs-operator-confirmation",
    job_type: "any",
    title: "Never assert compliance for the customer",
    body: "Where a scope touches standards or regulations, the operator confirms what applies to the installation. QuoteReady records the question, not the answer.",
    tags: ["compliance", "standards"],
    source: PLAYBOOK,
    reference: "QR-PB-067",
  },
];

/* ── Deterministic query construction ────────────────────────────────────── */

/** Human-readable label per fact key, used to build the retrieval query text. */
const QUERY_FACT_LABELS: Record<string, string> = {
  location_in_property: "Location",
  fixture_type: "Fixture",
  system_type: "System",
  system_age: "System age",
  water_isolation_access: "Water isolation",
  water_damage: "Water damage",
  property_access: "Property access",
  urgency: "Urgency",
  symptoms: "Symptoms",
};

export interface GuidanceQuery {
  /** the text embedded for vector search */
  text: string;
  /** normalised fact values + risk ids — the deterministic matching vocabulary */
  signals: string[];
  job_type: JobType;
}

export function buildGuidanceQuery(input: {
  job_type: JobType;
  facts: JobFacts;
  risk_flags?: string[];
  missing_fields?: string[];
}): GuidanceQuery {
  const { job_type, facts } = input;
  const lines: string[] = [`Job type: ${job_type.replace(/_/g, " ")}`];
  const signals: string[] = [];

  for (const [key, label] of Object.entries(QUERY_FACT_LABELS)) {
    const raw = (facts as Record<string, unknown>)[key];
    if (raw === undefined || raw === null) continue;
    const values = (Array.isArray(raw) ? raw : [raw])
      .map((v) => String(v))
      .filter((v) => v.length > 0 && v !== "unknown");
    if (values.length === 0) continue;
    lines.push(`${label}: ${values.join(", ").replace(/_/g, " ")}`);
    signals.push(...values.map((v) => v.toLowerCase()));
  }

  for (const flag of input.risk_flags ?? []) {
    signals.push(flag.toLowerCase());
  }
  if (signals.length > 0) {
    lines.push(`Signals: ${input.risk_flags?.join(", ").replace(/_/g, " ") ?? ""}`.trim());
  }
  if (input.missing_fields?.length) {
    lines.push(`Still unknown: ${input.missing_fields.join(", ").replace(/_/g, " ")}`);
  }

  return {
    text: lines.filter((l) => l.trim().length > 0).join(". ") + ".",
    signals: Array.from(new Set(signals)),
    job_type,
  };
}

/* ── Deterministic ranking (the floor beneath vector search) ─────────────── */

const SIGNAL_WEIGHT = 1;
const TOKEN_WEIGHT = 0.35;
/** two strong tag hits = a full-confidence match */
const NORMALISER = 2;

export interface RankedNote {
  note: ServiceNote;
  score: number;
  matched_on: string[];
}

/**
 * Rank the corpus for a query with no embedding involved.
 *
 * Deterministic: same query in, same order out (ties broken by corpus order).
 * Job-type filtering is strict — a leaking-tap job never sees toilet guidance
 * unless the note is tagged "any".
 */
export function rankNotesLexically(query: GuidanceQuery, limit = 3): RankedNote[] {
  const signalSet = new Set(query.signals);
  const words = new Set(
    query.text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );

  const scored = SERVICE_NOTES.filter(
    (note) => note.job_type === "any" || note.job_type === query.job_type,
  ).map((note) => {
    let raw = 0;
    const matched: string[] = [];

    for (const tag of note.tags) {
      if (signalSet.has(tag.toLowerCase())) {
        raw += SIGNAL_WEIGHT;
        matched.push(tag);
      }
    }
    const haystack = `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase();
    for (const word of words) {
      if (haystack.includes(word)) raw += TOKEN_WEIGHT;
    }

    return {
      note,
      score: Math.min(1, Number((raw / NORMALISER).toFixed(3))),
      matched_on: Array.from(new Set(matched)).slice(0, 6),
    };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ── Corpus helpers for the derived vector index ─────────────────────────── */

/** The text that gets embedded for a note. */
export function serviceNoteText(note: ServiceNote): string {
  return `${note.title}. ${note.body} Topics: ${note.tags.join(", ").replace(/_/g, " ")}.`;
}

/** Content hash — lets the index refresh only notes that actually changed. */
export function serviceNoteHash(note: ServiceNote): string {
  return createHash("sha1").update(serviceNoteText(note)).digest("hex").slice(0, 16);
}

export function serviceNoteById(id: string): ServiceNote | undefined {
  return SERVICE_NOTES.find((n) => n.id === id);
}
