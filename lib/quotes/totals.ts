import type { QuoteDocument, QuoteLineItem, QuoteTotals } from "./schema";

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic quote arithmetic.
 *
 * All money is integer cents. Prices are entered ex-GST (standard for
 * Australian trade quotes) and GST is applied once, on the taxable subtotal,
 * rounded to the nearest cent — matching how the totals appear on the
 * rendered document.
 * ──────────────────────────────────────────────────────────────────────────── */

/** line total = quantity × unit price, rounded to the nearest cent. */
export function lineTotalCents(item: Pick<QuoteLineItem, "quantity" | "unit_price_cents">): number {
  const qty = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
  const unit = Number.isFinite(item.unit_price_cents) ? Math.max(0, item.unit_price_cents) : 0;
  return Math.round(qty * unit);
}

export function computeTotals(
  doc: Pick<QuoteDocument, "line_items" | "gst_rate" | "deposit_percent">,
): QuoteTotals {
  let subtotal = 0;
  let taxable = 0;
  for (const item of doc.line_items) {
    const total = lineTotalCents(item);
    subtotal += total;
    if (item.taxable) taxable += total;
  }
  const rate = Number.isFinite(doc.gst_rate) ? Math.max(0, doc.gst_rate) : 0;
  const gst = Math.round(taxable * rate);
  const total = subtotal + gst;
  const depositPct = Number.isFinite(doc.deposit_percent) ? Math.max(0, doc.deposit_percent) : 0;
  const deposit = Math.round((total * depositPct) / 100);
  return {
    subtotal_cents: subtotal,
    gst_cents: gst,
    total_cents: total,
    deposit_cents: deposit,
    balance_cents: total - deposit,
  };
}

/** `$1,234.56` — AUD formatting for documents and UI. */
export function formatMoney(cents: number, currency: string = "AUD"): string {
  const value = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * The quote is worth nothing until someone has put a price on it. Used by the
 * UI and API to label a freshly AI-suggested quote as "pricing required"
 * rather than "$0.00".
 */
export function hasAnyPrice(doc: Pick<QuoteDocument, "line_items">): boolean {
  return doc.line_items.some((i) => i.unit_price_cents > 0);
}
