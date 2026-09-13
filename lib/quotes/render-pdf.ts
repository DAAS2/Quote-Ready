import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { QuoteDocument, QuoteStatus, QuoteTotals } from "./schema";
import { QUOTE_STATUS_LABELS } from "./schema";
import { formatMoney } from "./totals";
import { longDate } from "./numbering";
import type { RenderedQuote } from "./render-docx";

/* ────────────────────────────────────────────────────────────────────────────
 * PDF quote renderer (pdf-lib).
 *
 * No browser, no LibreOffice — the PDF is laid out directly so it renders
 * identically everywhere and can be unit-tested. It uses the same
 * QuoteDocument + QuoteTotals and the same section order as the .docx
 * renderer, so the two downloads are interchangeable.
 *
 * Standard embedded fonts only (deterministic, offline-safe). All text is
 * sanitised to WinAnsi-safe characters first — pdf-lib throws on anything
 * outside the font's encoding.
 * ──────────────────────────────────────────────────────────────────────────── */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 40;
const WIDTH = A4[0];
const HEIGHT = A4[1];
const USABLE = WIDTH - MARGIN * 2;
const BOTTOM = 52;

const INK = rgb(0.07, 0.09, 0.13);
const GREY = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.82, 0.84, 0.87);
const ACCENT = rgb(0.06, 0.46, 0.43);
const HEAD_FILL = rgb(0.95, 0.96, 0.97);
const TOTAL_FILL = rgb(0.93, 0.99, 0.96);

const COLUMNS = { description: 235, qty: 32, unit: 43, price: 90, amount: 115 };
const DESC_X = MARGIN;
const QTY_X = DESC_X + COLUMNS.description;
const UNIT_X = QTY_X + COLUMNS.qty;
const PRICE_X = UNIT_X + COLUMNS.unit;
const AMOUNT_X = PRICE_X + COLUMNS.price;

/** WinAnsi-safe text. Anything the embedded fonts cannot encode is mapped or dropped. */
export function sanitizePdfText(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const mapped = String(value)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u00D7/g, "x")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ");
  return mapped.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

class QuotePdf {
  readonly pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;

  constructor(
    private readonly pdf: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage(A4);
    this.pages.push(this.page);
    this.y = HEIGHT - MARGIN;
  }

  setY(value: number) {
    this.y = value;
  }

  /** Add a page when a block of `height` would overflow. */
  reserve(height: number): boolean {
    if (this.y - height < BOTTOM) {
      this.newPage();
      return true;
    }
    return false;
  }

  draw(value: string, opts: { x: number; y: number; size?: number; bold?: boolean; italic?: boolean; color?: ReturnType<typeof rgb> }) {
    const content = sanitizePdfText(value);
    if (!content) return;
    const size = opts.size ?? 10;
    const font = opts.bold ? this.fonts.bold : opts.italic ? this.fonts.italic : this.fonts.regular;
    this.page.drawText(content, { x: opts.x, y: opts.y, size, font, color: opts.color ?? INK });
  }

  /** Right-aligned draw within a column. */
  drawRight(value: string, x: number, width: number, y: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
    const content = sanitizePdfText(value);
    if (!content) return;
    const size = opts.size ?? 10;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const w = font.widthOfTextAtSize(content, size);
    this.page.drawText(content, { x: x + width - w, y, size, font, color: opts.color ?? INK });
  }

  line(
    value: string,
    opts: { x?: number; size?: number; bold?: boolean; italic?: boolean; color?: ReturnType<typeof rgb>; after?: number; align?: "right" | "center" } = {},
  ) {
    const size = opts.size ?? 10;
    const content = sanitizePdfText(value);
    if (content) {
      const font = opts.bold ? this.fonts.bold : opts.italic ? this.fonts.italic : this.fonts.regular;
      const w = font.widthOfTextAtSize(content, size);
      let x = opts.x ?? MARGIN;
      if (opts.align === "right") x = WIDTH - MARGIN - w;
      else if (opts.align === "center") x = MARGIN + (USABLE - w) / 2;
      this.page.drawText(content, { x, y: this.y, size, font, color: opts.color ?? INK });
    }
    this.y -= size * 1.35 + (opts.after ?? 0);
  }

  paragraph(
    value: string,
    opts: { x?: number; width?: number; size?: number; bold?: boolean; italic?: boolean; color?: ReturnType<typeof rgb>; after?: number } = {},
  ): number {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.fonts.bold : opts.italic ? this.fonts.italic : this.fonts.regular;
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? USABLE;
    const lines = wrap(sanitizePdfText(value), font, size, width);
    for (const text of lines) {
      this.reserve(size * 1.35);
      this.page.drawText(text, { x, y: this.y, size, font, color: opts.color ?? INK });
      this.y -= size * 1.35;
    }
    this.y -= opts.after ?? 0;
    return lines.length;
  }

  section(title: string) {
    this.reserve(30);
    this.y -= 6;
    this.line(title, { size: 11.5, bold: true, color: ACCENT, after: 4 });
  }

  bullet(value: string) {
    this.reserve(16);
    this.draw("\u2022", { x: MARGIN + 2, y: this.y, size: 10, color: GREY });
    this.paragraph(value, { x: MARGIN + 14, width: USABLE - 14, after: 2 });
  }

  numbered(index: number, value: string) {
    this.reserve(16);
    this.draw(`${index}.`, { x: MARGIN + 2, y: this.y, size: 10 });
    this.paragraph(value, { x: MARGIN + 18, width: USABLE - 18, after: 2 });
  }

  rule(y: number, xStart = MARGIN, xEnd = WIDTH - MARGIN, color = LINE, thickness = 0.75) {
    this.page.drawLine({ start: { x: xStart, y }, end: { x: xEnd, y }, thickness, color });
  }

  fill(x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x, y, width, height, color });
  }
}

/* ── blocks ──────────────────────────────────────────────────────────────── */

function drawHeaderBlock(q: QuotePdf, doc: QuoteDocument, status: QuoteStatus) {
  q.line(doc.business.name || "Your business", { size: 16, bold: true, after: 1 });
  const identity = [doc.business.abn ? `ABN ${doc.business.abn}` : "", doc.business.licence ? `Lic. ${doc.business.licence}` : ""]
    .filter(Boolean)
    .join("  ·  ");
  if (identity) q.line(identity, { size: 8.5, color: GREY, after: 1 });
  const contact = [doc.business.phone, doc.business.email, doc.business.address].filter((v) => v && v.trim());
  if (contact.length) q.line(contact.join("  ·  "), { size: 8.5, color: GREY, after: 4 });
  q.rule(q.y, MARGIN, WIDTH - MARGIN, ACCENT, 1.25);
  q.line("", { after: 8 });
  q.line("QUOTE", { size: 22, bold: true, after: 1 });
  q.line(`${doc.quote_number}  ·  Status: ${QUOTE_STATUS_LABELS[status]}`, { size: 9, color: GREY, after: 10 });
}

function drawMeta(q: QuotePdf, doc: QuoteDocument) {
  const colX = MARGIN + USABLE / 2 + 10;
  const left: Array<[string, string]> = [
    ["Quote number", doc.quote_number],
    ["Date issued", longDate(doc.issue_date)],
    ["Valid until", longDate(doc.valid_until)],
    ["Reference", doc.reference || "-"],
  ];
  const right: Array<[string, string]> = [
    ["Prepared for", doc.customer.name || "-"],
    ["Phone", doc.customer.phone || "-"],
    ["Email", doc.customer.email || "-"],
    ["Service address", doc.site_address || "-"],
  ];
  const rows = Math.max(left.length, right.length);
  for (let i = 0; i < rows; i++) {
    const l = left[i] ?? ["", ""];
    const r = right[i] ?? ["", ""];
    q.draw(`${l[0]}: ${l[1]}`, { x: MARGIN, y: q.y, size: 9.5 });
    q.draw(`${r[0]}: ${r[1]}`, { x: colX, y: q.y, size: 9.5 });
    q.y -= 15;
  }
  q.y -= 4;
}

function drawTableHeader(q: QuotePdf) {
  const height = 18;
  q.reserve(height + 4);
  q.fill(MARGIN, q.y - 5, USABLE, height, HEAD_FILL);
  const baseline = q.y;
  const size = 8.5;
  const bold = (text: string, x: number, alignRight = false, width = 0) => {
    if (alignRight) q.drawRight(text, x, width, baseline, { size, bold: true });
    else q.draw(text, { x, y: baseline, size, bold: true });
  };
  bold("Description", DESC_X + 3);
  bold("Qty", QTY_X, true, COLUMNS.qty - 3);
  bold("Unit", UNIT_X + 3);
  bold("Unit price (ex GST)", PRICE_X, true, COLUMNS.price - 3);
  bold("Amount (ex GST)", AMOUNT_X, true, COLUMNS.amount - 3);
  q.y = baseline - height + 4;
}

function drawLineItems(q: QuotePdf, doc: QuoteDocument) {
  drawTableHeader(q);
  if (doc.line_items.length === 0) {
    q.paragraph("Line items to be confirmed before this quote is issued.", { italic: true, color: GREY, after: 6 });
    return;
  }

  for (const item of doc.line_items) {
    const descLines = wrap(sanitizePdfText(item.description), q.fonts.regular, 9.5, COLUMNS.description - 6);
    const detailLines = item.details ? wrap(sanitizePdfText(item.details), q.fonts.italic, 8.5, COLUMNS.description - 6) : [];
    const rowHeight = Math.max(19, descLines.length * 13 + detailLines.length * 11 + 8);
    if (q.reserve(rowHeight + 4)) drawTableHeader(q);

    const top = q.y;
    let y = top;
    for (const text of descLines) {
      q.draw(text, { x: DESC_X + 3, y, size: 9.5 });
      y -= 13;
    }
    for (const text of detailLines) {
      q.draw(text, { x: DESC_X + 3, y, size: 8.5, italic: true, color: GREY });
      y -= 11;
    }

    const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2);
    const priced = item.unit_price_cents > 0;
    q.drawRight(qty, QTY_X, COLUMNS.qty - 3, top, { size: 9.5 });
    q.draw(item.unit, { x: UNIT_X + 3, y: top, size: 9.5 });
    q.drawRight(priced ? formatMoney(item.unit_price_cents) : "TBC", PRICE_X, COLUMNS.price - 3, top, { size: 9.5 });
    q.drawRight(
      priced ? formatMoney(Math.round(item.quantity * item.unit_price_cents)) : "TBC",
      AMOUNT_X,
      COLUMNS.amount - 3,
      top,
      { size: 9.5 },
    );

    q.rule(top - rowHeight + 5, MARGIN, WIDTH - MARGIN, LINE, 0.5);
    q.y = top - rowHeight - 1;
  }
}

function drawTotals(q: QuotePdf, doc: QuoteDocument, totals: QuoteTotals) {
  const boxWidth = 250;
  const x = WIDTH - MARGIN - boxWidth;
  const rows: Array<{ label: string; value: string; bold: boolean; highlight: boolean }> = [
    { label: "Subtotal (ex GST)", value: formatMoney(totals.subtotal_cents), bold: false, highlight: false },
    { label: `GST (${Math.round(doc.gst_rate * 100)}%)`, value: formatMoney(totals.gst_cents), bold: false, highlight: false },
    { label: "Total (inc GST)", value: formatMoney(totals.total_cents), bold: true, highlight: true },
  ];
  if (doc.deposit_percent > 0) {
    rows.push({ label: `Deposit (${doc.deposit_percent}%)`, value: `- ${formatMoney(totals.deposit_cents)}`, bold: false, highlight: false });
    rows.push({ label: "Balance on completion", value: formatMoney(totals.balance_cents), bold: true, highlight: false });
  }

  const rowHeight = 17;
  q.reserve(rows.length * rowHeight + 8);
  for (const row of rows) {
    if (row.highlight) q.fill(x - 6, q.y - 5, boxWidth + 6, rowHeight, TOTAL_FILL);
    q.draw(row.label, { x, y: q.y, size: row.bold ? 10.5 : 9.5, bold: row.bold });
    q.drawRight(row.value, x, boxWidth, q.y, { size: row.bold ? 10.5 : 9.5, bold: row.bold });
    q.y -= rowHeight;
  }
  q.y -= 6;
}

/* ── entry point ─────────────────────────────────────────────────────────── */

export async function renderQuotePdf(quote: RenderedQuote): Promise<Uint8Array> {
  const { document: doc, totals, status } = quote;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Quote ${doc.quote_number}`);
  pdf.setAuthor(doc.business.name || "QuoteReady");
  pdf.setSubject(`Quote for ${doc.customer.name} — ${doc.job_type_label}`);
  pdf.setCreator("QuoteReady");

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const q = new QuotePdf(pdf, fonts);

  drawHeaderBlock(q, doc, status);
  drawMeta(q, doc);

  q.section("Scope of works");
  q.paragraph(doc.scope_summary || "Scope to be confirmed.", { after: 4 });

  q.section("Itemised work");
  drawLineItems(q, doc);
  q.y -= 8;
  drawTotals(q, doc, totals);
  q.line("All amounts are in Australian dollars (AUD). Unit prices are exclusive of GST.", {
    size: 8,
    italic: true,
    color: GREY,
    after: 4,
  });

  const section = (title: string, items: string[]) => {
    if (items.length === 0) return;
    q.section(title);
    for (const item of items) q.bullet(item);
  };
  section("What this quote includes", doc.inclusions);
  section("Not included (exclusions)", doc.exclusions);
  section("Assumptions", doc.assumptions);

  if (doc.terms.length > 0) {
    q.section("Payment terms & conditions");
    doc.terms.forEach((term, i) => q.numbered(i + 1, term));
  }

  if (doc.notes.trim()) {
    q.section("Notes");
    q.paragraph(doc.notes, { after: 4 });
  }

  q.section("Acceptance");
  q.paragraph(doc.acceptance_note, { after: 18 });

  q.reserve(80);
  const sigY = q.y;
  q.rule(sigY, MARGIN, MARGIN + USABLE / 2 - 20, GREY, 0.75);
  q.rule(sigY, MARGIN + USABLE / 2 + 20, WIDTH - MARGIN, GREY, 0.75);
  q.y = sigY - 11;
  q.draw("Customer signature", { x: MARGIN, y: q.y, size: 8, color: GREY });
  q.draw("Date", { x: MARGIN + USABLE / 2 + 20, y: q.y, size: 8, color: GREY });
  q.y -= 20;
  q.paragraph(doc.disclaimer, { size: 7.5, italic: true, color: GREY, after: 0 });

  /* footers — the total page count is only known now */
  const contactFooter = [doc.business.phone, doc.business.email].filter(Boolean).join("  ·  ");
  q.pages.forEach((page, index) => {
    const label = `${contactFooter ? `${contactFooter}   ·   ` : ""}Page ${index + 1} of ${q.pages.length}`;
    const content = sanitizePdfText(label);
    const size = 8;
    const width = fonts.regular.widthOfTextAtSize(content, size);
    page.drawText(content, { x: MARGIN + (USABLE - width) / 2, y: 28, size, font: fonts.regular, color: GREY });
  });

  return pdf.save();
}
