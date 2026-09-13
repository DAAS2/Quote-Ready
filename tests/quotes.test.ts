import { describe, expect, it } from "vitest";
import { JOB_TEMPLATES } from "@/lib/rules/job-templates";
import {
  QuoteDocumentSchema,
  type QuoteDocument,
  type QuoteLineItem,
} from "@/lib/quotes/schema";
import {
  buildFallbackSuggestion,
  assembleQuoteDocument,
  standardTerms,
  type QuoteSource,
} from "@/lib/quotes/content";
import { computeTotals, formatMoney, hasAnyPrice, lineTotalCents } from "@/lib/quotes/totals";
import { addDaysIso, longDate, nextQuoteNumber, nextQuoteNumberForYear } from "@/lib/quotes/numbering";
import { buildQuoteAdvisory } from "@/lib/quotes/advisory";
import { renderQuoteDocx } from "@/lib/quotes/render-docx";
import { renderQuotePdf, sanitizePdfText } from "@/lib/quotes/render-pdf";

/* ── fixtures ────────────────────────────────────────────────────────────── */

function line(overrides: Partial<QuoteLineItem> = {}): QuoteLineItem {
  return {
    id: "li-1",
    description: "Replace mixer cartridge — supply and install",
    quantity: 1,
    unit: "each",
    unit_price_cents: 0,
    taxable: true,
    suggested: true,
    ...overrides,
  };
}

function doc(overrides: Partial<QuoteDocument> = {}): QuoteDocument {
  return QuoteDocumentSchema.parse({
    quote_number: "Q-2026-0001",
    issue_date: "2026-09-13",
    valid_until: "2026-10-13",
    reference: "JOB-ABC12345",
    job_type_label: "Leaking tap / mixer",
    prepared_by: "Alex Miller",
    business: { name: "Melbourne Metro Plumbing", licence: "48291", phone: "03 9000 0000" },
    customer: { name: "Jordan Lee", phone: "0400 000 000" },
    site_address: "Brunswick, VIC 3056",
    scope_summary: "Supply labour and materials for the leaking tap.",
    line_items: [line()],
    ...overrides,
  });
}

const source: QuoteSource = {
  reference: "JOB-ABC12345",
  customer: { name: "Jordan Lee", phone: "0400 000 000", email: "" },
  site_address: "Brunswick, VIC 3056",
  job_type: "leaking_tap",
  job_type_label: "Leaking tap / mixer",
  enquiry_text: "Bathroom mixer is dripping constantly.",
  scope: null,
  template: JOB_TEMPLATES.leaking_tap,
};

/* ── money ───────────────────────────────────────────────────────────────── */

describe("quote totals", () => {
  it("rounds a line total to the nearest cent", () => {
    expect(lineTotalCents({ quantity: 1.5, unit_price_cents: 12_345 })).toBe(18_518);
  });

  it("applies GST once, on the taxable subtotal only", () => {
    const totals = computeTotals({
      line_items: [
        line({ unit_price_cents: 20_000 }),
        line({ id: "li-2", unit_price_cents: 10_000, taxable: false }),
      ],
      gst_rate: 0.1,
      deposit_percent: 0,
    });
    expect(totals.subtotal_cents).toBe(30_000);
    expect(totals.gst_cents).toBe(2_000);
    expect(totals.total_cents).toBe(32_000);
  });

  it("computes deposit and balance without losing a cent", () => {
    const totals = computeTotals({
      line_items: [line({ unit_price_cents: 33_333 })],
      gst_rate: 0.1,
      deposit_percent: 50,
    });
    expect(totals.total_cents).toBe(36_666);
    expect(totals.deposit_cents).toBe(18_333);
    expect(totals.balance_cents).toBe(18_333);
  });

  it("treats an unpriced quote as zero, and reports it as unpriced", () => {
    const quote = doc();
    expect(computeTotals(quote).total_cents).toBe(0);
    expect(hasAnyPrice(quote)).toBe(false);
    expect(hasAnyPrice(doc({ line_items: [line({ unit_price_cents: 100 })] }))).toBe(true);
  });

  it("formats AUD", () => {
    expect(formatMoney(123_456)).toBe("$1,234.56");
  });
});

/* ── numbering ───────────────────────────────────────────────────────────── */

describe("quote numbering", () => {
  it("starts at 1 and increments for the current year", () => {
    expect(nextQuoteNumberForYear([], 2026)).toBe("Q-2026-0001");
    expect(nextQuoteNumberForYear(["Q-2026-0001", "Q-2026-0002"], 2026)).toBe("Q-2026-0003");
  });

  it("ignores other years and malformed numbers", () => {
    expect(nextQuoteNumberForYear(["Q-2025-0099", "garbage", "INV-1"], 2026)).toBe("Q-2026-0001");
  });

  it("uses the supplied date and adds the validity window", () => {
    expect(nextQuoteNumber([], new Date("2027-01-04T00:00:00Z"))).toBe("Q-2027-0001");
    expect(addDaysIso("2026-09-13", 30)).toBe("2026-10-13");
    expect(longDate("2026-10-13")).toBe("13 October 2026");
  });
});

/* ── advisory (warn, never block) ────────────────────────────────────────── */

describe("quote advisory", () => {
  it("never blocks, even with a safety flag and missing critical fields", () => {
    const advisory = buildQuoteAdvisory({
      status: "needs_information",
      readiness_score: 30,
      readiness_band: "needs_information",
      safety_flag: true,
      inspection_recommended: true,
      missing_fields: [{ key: "fixture_type", label: "Fixture type", critical: true }],
    });
    expect(advisory.allowed).toBe(true);
    expect(advisory.requires_acknowledgement).toBe(true);
    expect(advisory.warnings[0]!.severity).toBe("safety");
    expect(advisory.missing_critical_labels).toEqual(["Fixture type"]);
  });

  it("is quiet on a ready, safety-free job", () => {
    const advisory = buildQuoteAdvisory({
      status: "ready_for_estimate",
      readiness_score: 82,
      readiness_band: "ready_for_estimate",
      safety_flag: false,
      inspection_recommended: false,
      missing_fields: [],
    });
    expect(advisory.warnings).toHaveLength(0);
    expect(advisory.requires_acknowledgement).toBe(false);
    expect(advisory.ready).toBe(true);
  });
});

/* ── content assembly ────────────────────────────────────────────────────── */

describe("quote content", () => {
  it("suggests line items with no prices at all", () => {
    const suggestion = buildFallbackSuggestion({
      job_type: "leaking_tap",
      scope: null,
      template: JOB_TEMPLATES.leaking_tap,
      customer_name: "Jordan Lee",
    });
    expect(suggestion.line_items.length).toBeGreaterThan(0);
    // the suggestion model has no price field at all, and nothing carries a figure
    expect(suggestion.line_items.every((i) => !("unit_price_cents" in i))).toBe(true);
    expect(/\$\s?\d/.test(JSON.stringify(suggestion))).toBe(false);

    const assembled = assembleQuoteDocument({
      quote_number: "Q-2026-0001",
      issue_date: "2026-09-13",
      valid_until: "2026-10-13",
      validity_days: 30,
      deposit_percent: 0,
      prepared_by: "Alex Miller",
      business: { name: "Melbourne Metro Plumbing", abn: "", licence: "48291", phone: "", email: "", address: "" },
      source,
      suggestion,
    });
    expect(assembled.line_items.every((i) => i.unit_price_cents === 0)).toBe(true);
    expect(assembled.exclusions.length).toBeGreaterThan(0);
    expect(computeTotals(assembled).total_cents).toBe(0);
  });

  it("includes the deposit term only when a deposit is set", () => {
    const without = standardTerms({ validity_days: 30, deposit_percent: 0 });
    const withDeposit = standardTerms({ validity_days: 30, deposit_percent: 25 });
    expect(without.some((t) => t.toLowerCase().includes("deposit"))).toBe(false);
    expect(withDeposit.some((t) => t.includes("25%"))).toBe(true);
  });

  it("rejects an unknown unit", () => {
    const parsed = QuoteDocumentSchema.safeParse({
      ...doc(),
      line_items: [{ ...line(), unit: "bucket" }],
    });
    expect(parsed.success).toBe(false);
  });
});

/* ── renderers ───────────────────────────────────────────────────────────── */

describe("quote renderers", () => {
  const document = doc({
    line_items: [
      line({ unit_price_cents: 18_500, details: "Wall-mounted mixer; isolation valve accessible." }),
      line({ id: "li-2", description: "Test and flush", quantity: 1, unit: "job", unit_price_cents: 9_500 }),
    ],
  });
  const rendered = { document, totals: computeTotals(document), status: "draft" as const };

  it("produces a valid .docx (zip container)", async () => {
    const buffer = await renderQuoteDocx(rendered);
    expect(buffer.byteLength).toBeGreaterThan(2_000);
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("produces a valid PDF", async () => {
    const bytes = await renderQuotePdf(rendered);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("emits a docx for an unpriced quote without throwing", async () => {
    const unpriced = doc();
    const buffer = await renderQuoteDocx({
      document: unpriced,
      totals: computeTotals(unpriced),
      status: "draft",
    });
    expect(buffer.byteLength).toBeGreaterThan(1_000);
  });

  it("sanitises characters the embedded PDF fonts cannot encode", () => {
    expect(sanitizePdfText("“Curly” — quotes… 3 × 2")).toBe('"Curly" - quotes... 3 x 2');
    expect(sanitizePdfText("emoji 🚿 and 中文")).toBe("emoji  and ");
    expect(sanitizePdfText("line\nbreak")).toBe("line break");
  });
});
