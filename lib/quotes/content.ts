import type { JobType, ScopePack } from "@/lib/ai/schemas";
import type { JobTemplate } from "@/lib/rules/job-templates";
import { QUOTE_ACCEPTANCE_NOTE, QUOTE_DISCLAIMER, QuoteDocumentSchema } from "./schema";
import type {
  QuoteBusiness,
  QuoteCustomer,
  QuoteDocument,
  QuoteLineItem,
  QuoteSuggestion,
  QuoteUnit,
} from "./schema";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote content.
 *
 * Two jobs live here:
 * 1. a DETERMINISTIC fallback suggestion, so quote preparation works with no
 *    API key and never shows the operator an empty document; and
 * 2. assembly of the full QuoteDocument from (job + scope + template + the
 *    operator's business details + whatever content the model suggested).
 *
 * Line items are always unpriced at this layer. Pricing is the operator's.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface QuoteSource {
  reference: string;
  customer: QuoteCustomer;
  /** where the work happens (customer suburb / site address) */
  site_address: string;
  job_type: JobType;
  job_type_label: string;
  enquiry_text: string;
  scope: ScopePack | null;
  template: JobTemplate;
}

interface WorkHint {
  description: string;
  details?: string;
  quantity: number;
  unit: QuoteUnit;
  /** only include when the facts / symptoms indicate it */
  when?: (ctx: { symptoms: Set<string>; scope: ScopePack | null }) => boolean;
}

const ATTEND = (label: string): WorkHint => ({
  description: "Attend site, confirm conditions and make safe",
  details: `Site attendance for ${label.toLowerCase()}; confirm the scope on arrival before starting work.`,
  quantity: 1,
  unit: "callout",
});

const WORK_LIBRARY: Record<JobType, WorkHint[]> = {
  leaking_tap: [
    ATTEND("leaking tap"),
    {
      description: "Replace tap/mixer cartridge or washer — supply and install",
      details: "Standard replacement part for the supplied fixture. Wall or bench mounted as described.",
      quantity: 1,
      unit: "each",
    },
    {
      description: "Refit assembly, test under pressure and check for leaks",
      details: "Includes flushing the line and confirming hot and cold operation.",
      quantity: 1,
      unit: "job",
    },
  ],
  toilet_repair: [
    ATTEND("toilet repair"),
    {
      description: "Repair or replace cistern internal valve set — supply and install",
      details: "Inlet/outlet valve and seal kit for a standard close-coupled cistern.",
      quantity: 1,
      unit: "each",
    },
    {
      description: "Reseal pan, test flush and refill cycle",
      details: "Includes confirming there is no seepage at the pan or cistern base.",
      quantity: 1,
      unit: "job",
    },
  ],
  hot_water_system: [
    ATTEND("hot-water system"),
    {
      description: "Diagnose hot-water fault and test system components",
      details: "Includes checking the relief valve, tempering valve and electrical/gas supply at the unit.",
      quantity: 1,
      unit: "hr",
      when: ({ symptoms }) => symptoms.has("no_hot_water") || symptoms.has("low_water_temperature"),
    },
    {
      description: "Replace temperature/pressure relief valve — supply and install",
      details: "Standard valve rated for the unit; includes isolating and recharging the tank.",
      quantity: 1,
      unit: "each",
    },
    {
      description: "Test unit operation and confirm no leaks on completion",
      details: "Includes a short run test and reporting on any further recommendations.",
      quantity: 1,
      unit: "job",
    },
  ],
};

/** Extra rows that only make sense when the scope actually recorded them. */
function conditionalHints(scope: ScopePack | null): WorkHint[] {
  if (!scope) return [];
  const hints: WorkHint[] = [];
  if (scope.facts.water_damage === "possible" || scope.facts.water_damage === "confirmed") {
    hints.push({
      description: "Document and make safe water-affected area",
      details: "Photographic record of affected cabinetry/flooring for the customer and insurer.",
      quantity: 1,
      unit: "job",
    });
  }
  if (scope.risk_flags.some((f) => f.requires_inspection)) {
    hints.push({
      description: "On-site inspection to confirm concealed conditions",
      details: "Recommended before the fixed price is confirmed. Quoted separately unless accepted with this quote.",
      quantity: 1,
      unit: "job",
    });
  }
  return hints;
}

/**
 * Deterministic suggestion used when Gemini is unavailable, or when the
 * operator asks to rebuild the line items from the scope. No prices.
 */
export function buildFallbackSuggestion(input: {
  job_type: JobType;
  scope: ScopePack | null;
  template: JobTemplate;
  customer_name: string;
}): QuoteSuggestion {
  const symptoms = new Set(input.scope?.facts.symptoms ?? []);
  const ctx = { symptoms, scope: input.scope };
  const base = WORK_LIBRARY[input.job_type]
    .filter((hint) => !hint.when || hint.when(ctx))
    .map((hint) => ({
      description: hint.description,
      details: hint.details,
      quantity: hint.quantity,
      unit: hint.unit,
    }));
  const extras = conditionalHints(input.scope)
    .filter((hint) => !hint.when || hint.when(ctx))
    .map((hint) => ({
      description: hint.description,
      details: hint.details,
      quantity: hint.quantity,
      unit: hint.unit,
    }));

  const facts = input.scope?.known_facts ?? {};
  const where = facts.location_in_property ? ` in the ${String(facts.location_in_property)}` : "";
  const photos = Number(facts.photo_count ?? 0);
  const first = input.customer_name.split(" ")[0] ?? "the customer";

  return {
    scope_summary: [
      `Supply labour and materials for the ${input.template.label.toLowerCase()}${where} as described by ${first}.`,
      input.scope
        ? `The scope is based on the supplied enquiry${photos > 0 ? ` and ${photos} photo${photos === 1 ? "" : "s"}` : ""}${input.scope.inspection_recommended ? ", and remains subject to on-site confirmation" : ""}.`
        : "The scope is based on the enquiry text only; it has not been through readiness analysis.",
    ].join(" "),
    line_items: [...base, ...extras].slice(0, 12),
    inclusions: [
      "Labour by a licensed plumber.",
      "Standard materials and consumables required for the works described.",
      "Clean-up and removal of waste generated by the works.",
      "Testing of the completed work.",
    ],
    exclusions: input.scope?.exclusions?.length
      ? input.scope.exclusions
      : input.template.exclusions,
    assumptions: input.scope?.assumptions?.length
      ? input.scope.assumptions
      : input.template.assumptions,
    terms: standardTerms({ validity_days: 30, deposit_percent: 0 }),
    notes: input.scope?.inspection_recommended
      ? "An on-site inspection was recommended for this job. The price is subject to confirmation once concealed conditions are verified."
      : "",
  };
}

/** The default commercial terms every generated quote carries. */
export function standardTerms(input: { validity_days: number; deposit_percent: number }): string[] {
  const terms = [
    "All prices are in Australian dollars and exclude GST unless stated; GST is shown separately.",
    `This quote is valid for ${input.validity_days} day${input.validity_days === 1 ? "" : "s"} from the date of issue.`,
    "Payment is due on completion of the works unless otherwise agreed in writing.",
    "Works are carried out during normal business hours; after-hours attendance is quoted separately.",
    "Any variation to the scope, including concealed conditions found on site, will be confirmed with you in writing before the additional work proceeds.",
  ];
  if (input.deposit_percent > 0) {
    terms.splice(2, 0, `A deposit of ${input.deposit_percent}% of the total is payable before works commence.`);
  }
  return terms;
}

export interface AssembleQuoteInput {
  quote_number: string;
  issue_date: string;
  valid_until: string;
  validity_days: number;
  deposit_percent: number;
  prepared_by: string;
  business: QuoteBusiness;
  source: QuoteSource;
  suggestion: QuoteSuggestion;
}

/**
 * Turn a (validated) suggestion into the full quote document. Totals are
 * computed separately by ./totals.ts — this only assembles content.
 */
export function assembleQuoteDocument(input: AssembleQuoteInput): QuoteDocument {
  const { source, suggestion } = input;
  return QuoteDocumentSchema.parse({
    quote_number: input.quote_number,
    issue_date: input.issue_date,
    valid_until: input.valid_until,
    validity_days: input.validity_days,
    reference: source.reference,
    job_type_label: source.job_type_label,
    prepared_by: input.prepared_by,
    business: input.business,
    customer: source.customer,
    site_address: source.site_address,
    scope_summary: suggestion.scope_summary,
    line_items: materialiseLineItems(suggestion.line_items),
    inclusions: suggestion.inclusions,
    exclusions: suggestion.exclusions,
    assumptions: suggestion.assumptions,
    terms: suggestion.terms.length ? suggestion.terms : standardTerms(input),
    notes: suggestion.notes,
    deposit_percent: input.deposit_percent,
    gst_rate: 0.1,
    currency: "AUD",
    acceptance_note: QUOTE_ACCEPTANCE_NOTE,
    disclaimer: QUOTE_DISCLAIMER,
  });
}

/** Suggested work arrives unpriced — the operator prices it. */
export function materialiseLineItems(
  items: QuoteSuggestion["line_items"],
): QuoteLineItem[] {
  return items.slice(0, 40).map((item, i) => ({
    id: `li-${i + 1}`,
    description: item.description,
    ...(item.details ? { details: item.details } : {}),
    quantity: item.quantity,
    unit: item.unit,
    unit_price_cents: 0,
    taxable: true,
    suggested: true,
  }));
}
