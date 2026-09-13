import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote domain schemas.
 *
 * A quote is a *customer-facing commercial document*, so the model here is
 * deliberately conservative:
 * - money is always integer cents (never floats) — see ./totals.ts
 * - prices are NEVER produced by the AI: suggested line items arrive with
 *   unit_price_cents = 0 and the operator sets them by hand
 * - every section a real tradie quote needs is present: scope, itemised work,
 *   inclusions/exclusions/assumptions, terms, validity and an acceptance block
 *
 * Formatting rules for the rendered documents (docx/pdf) live in the
 * `.agents/skills/docx-quote/SKILL.md` skill, which is also injected into the
 * Gemini content prompt.
 * ──────────────────────────────────────────────────────────────────────────── */

export const QUOTE_UNITS = ["each", "hr", "job", "callout", "m", "item"] as const;
export const QuoteUnitEnum = z.enum(QUOTE_UNITS);
export type QuoteUnit = z.infer<typeof QuoteUnitEnum>;

export const QUOTE_UNIT_LABELS: Record<QuoteUnit, string> = {
  each: "each",
  hr: "hr",
  job: "job",
  callout: "call-out",
  m: "m",
  item: "item",
};

export const QuoteStatusEnum = z.enum([
  "draft",
  "issued",
  "accepted",
  "declined",
  "expired",
]);
export type QuoteStatus = z.infer<typeof QuoteStatusEnum>;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const QuoteLineItemSchema = z.object({
  id: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  /** a second line of clarification (scope, access, exclusions) */
  details: z.string().max(400).optional(),
  quantity: z.number().positive().max(10_000),
  unit: QuoteUnitEnum.default("each"),
  /** ex-GST unit price in cents — operator-entered, never AI-generated */
  unit_price_cents: z.number().int().min(0).max(100_000_000).default(0),
  taxable: z.boolean().default(true),
  /** true when the row originated from the AI scope suggestion */
  suggested: z.boolean().default(false),
});
export type QuoteLineItem = z.infer<typeof QuoteLineItemSchema>;

export const QuoteBusinessSchema = z.object({
  name: z.string().max(160).default(""),
  abn: z.string().max(30).default(""),
  licence: z.string().max(60).default(""),
  phone: z.string().max(40).default(""),
  email: z.string().max(160).default(""),
  address: z.string().max(200).default(""),
});
export type QuoteBusiness = z.infer<typeof QuoteBusinessSchema>;

export const QuoteCustomerSchema = z.object({
  name: z.string().max(160).default(""),
  phone: z.string().max(40).default(""),
  email: z.string().max(160).default(""),
});
export type QuoteCustomer = z.infer<typeof QuoteCustomerSchema>;

export const QUOTE_ACCEPTANCE_NOTE =
  "To proceed, sign and date this quote and return it to us. This quote is an offer to supply the work described; it becomes an agreement once accepted in writing by both parties.";

export const QUOTE_DISCLAIMER =
  "This quote is based on the information available at the time of preparation and on the stated assumptions. Concealed conditions, additional faults or scope changes identified on site may vary the price; any variation will be confirmed with you in writing before work proceeds. Nothing here is a diagnosis of a fault.";

export const QuoteDocumentSchema = z.object({
  /* ── identity ── */
  quote_number: z.string().min(1).max(40),
  issue_date: z.string().min(1).max(40),
  valid_until: z.string().min(1).max(40),
  validity_days: z.number().int().min(0).max(365).default(30),
  /** link back to the job reference shown on the workspace */
  reference: z.string().max(60).default(""),
  job_type_label: z.string().max(120).default(""),
  prepared_by: z.string().max(120).default(""),

  /* ── parties ── */
  business: QuoteBusinessSchema.prefault({}),
  customer: QuoteCustomerSchema.prefault({}),
  site_address: z.string().max(240).default(""),

  /* ── scope of works ── */
  scope_summary: z.string().max(2000).default(""),
  line_items: z.array(QuoteLineItemSchema).max(60).default([]),

  /* ── commercial sections ── */
  inclusions: z.array(z.string().max(240)).max(20).default([]),
  exclusions: z.array(z.string().max(240)).max(20).default([]),
  assumptions: z.array(z.string().max(240)).max(20).default([]),
  terms: z.array(z.string().max(300)).max(20).default([]),
  notes: z.string().max(1200).default(""),

  /* ── money ── */
  deposit_percent: z.number().min(0).max(100).default(0),
  gst_rate: z.number().min(0).max(0.5).default(0.1),
  currency: z.literal("AUD").default("AUD"),

  /* ── legal padding ── */
  acceptance_note: z.string().max(600).default(QUOTE_ACCEPTANCE_NOTE),
  disclaimer: z.string().max(800).default(QUOTE_DISCLAIMER),
});
export type QuoteDocument = z.infer<typeof QuoteDocumentSchema>;

/* ── Gemini output: unpriced scope-derived content only ──────────────────── */

export const QuoteSuggestionSchema = z.object({
  scope_summary: z.string().min(1).max(1200),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        details: z.string().max(400).optional(),
        quantity: z.number().positive().max(1000).default(1),
        unit: QuoteUnitEnum.default("each"),
      }),
    )
    .max(24)
    .default([]),
  inclusions: z.array(z.string().max(240)).max(15).default([]),
  exclusions: z.array(z.string().max(240)).max(15).default([]),
  assumptions: z.array(z.string().max(240)).max(15).default([]),
  terms: z.array(z.string().max(300)).max(15).default([]),
  notes: z.string().max(1000).default(""),
});
export type QuoteSuggestion = z.infer<typeof QuoteSuggestionSchema>;

/* ── persisted row (the document + its commercial state) ─────────────────── */

export interface QuoteTotals {
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
}

export interface QuoteRecord {
  id: string;
  job_id: string;
  quote_number: string;
  status: QuoteStatus;
  document: QuoteDocument;
  totals: QuoteTotals;
  /** human-readable customer / job labels for list views */
  customer_name: string;
  job_type_label: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteRecordInput {
  job_id: string;
  quote_number: string;
  document: QuoteDocument;
  totals: QuoteTotals;
  status?: QuoteStatus;
}
