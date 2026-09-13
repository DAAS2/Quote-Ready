import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { QuoteDocument, QuoteStatus, QuoteTotals } from "./schema";
import { QUOTE_STATUS_LABELS } from "./schema";
import { formatMoney } from "./totals";
import { longDate } from "./numbering";

/* ────────────────────────────────────────────────────────────────────────────
 * .docx quote renderer.
 *
 * Follows `.agents/skills/docx-quote/SKILL.md` exactly:
 * - A4 portrait, 1" (1440 DXA) margins, Arial throughout
 * - values are single-line (never \n) and always wrapped in TextRun
 * - the line-item table sets columnWidths on the Table AND width on each cell
 * - borders live on cells, padding once at table level
 * - shading uses ShadingType.CLEAR (never SOLID — it renders black in Word)
 * - real Word lists (LevelFormat.BULLET), never unicode bullets
 * Money arrives pre-computed in cents; this renderer formats only.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RenderedQuote {
  document: QuoteDocument;
  totals: QuoteTotals;
  status: QuoteStatus;
}

/* A4 = 11906 × 16838 DXA. Usable width with 1" margins = 9026 DXA. */
const USABLE = 9026;
const COLUMNS = { description: 4200, qty: 800, unit: 900, price: 1500, amount: 1626 };

const BODY_FONT = "Arial";
const GREY = "6B7280";
const LINE = "D1D5DB";
const HEAD_FILL = "F3F4F6";
const ACCENT = "0F766E";

const thin = { style: BorderStyle.SINGLE, size: 1, color: LINE };
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

/** Collapse anything heading for a line break — a value is always one line. */
function oneLine(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) {
  return new TextRun({
    text: oneLine(text),
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? 20,
    color: opts.color ?? "111827",
    font: BODY_FONT,
  });
}

function para(
  content: string | TextRun[],
  opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; style?: string } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 120 },
    ...(opts.style ? { style: opts.style } : {}),
    children: typeof content === "string" ? [run(content)] : content,
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text: oneLine(text), font: BODY_FONT })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "quote-bullets", level: 0 },
    spacing: { after: 70 },
    children: [run(text)],
  });
}

function numbered(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "quote-terms", level: 0 },
    spacing: { after: 70 },
    children: [run(text)],
  });
}

function tableCell(
  children: Paragraph[],
  opts: { width: number; fill?: string; borders?: typeof cellBorders | typeof noBorders; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = { width: 0 },
): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders: opts.borders ?? cellBorders,
    verticalAlign: VerticalAlign.CENTER,
    ...(opts.fill ? { shading: { fill: opts.fill, type: ShadingType.CLEAR } } : {}),
    children,
  });
}

function headerCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return tableCell([para([run(text, { bold: true, size: 18 })], { align, after: 0 })], {
    width,
    fill: HEAD_FILL,
    align,
  });
}

function moneyCell(text: string, width: number, bold = false) {
  return tableCell([para([run(text, { bold, size: bold ? 20 : 20 })], { align: AlignmentType.RIGHT, after: 0 })], { width });
}

/* ── sections ────────────────────────────────────────────────────────────── */

function metaTable(doc: QuoteDocument): Table {
  const half = Math.floor(USABLE / 2);
  const left = [
    ["Quote number", doc.quote_number],
    ["Date issued", longDate(doc.issue_date)],
    ["Valid until", longDate(doc.valid_until)],
    ["Reference", doc.reference || "—"],
  ];
  const right = [
    ["Prepared for", doc.customer.name || "—"],
    ["Phone", doc.customer.phone || "—"],
    ["Email", doc.customer.email || "—"],
    ["Service address", doc.site_address || "—"],
  ];
  const rows = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => {
    const l = left[i] ?? ["", ""];
    const r = right[i] ?? ["", ""];
    return new TableRow({
      children: [
        tableCell([para([run(`${l[0]}: `, { bold: true, size: 18 }), run(l[1], { size: 18 })], { after: 0 })], {
          width: half,
          borders: noBorders,
        }),
        tableCell([para([run(`${r[0]}: `, { bold: true, size: 18 }), run(r[1], { size: 18 })], { after: 0 })], {
          width: USABLE - half,
          borders: noBorders,
        }),
      ],
    });
  });
  return new Table({ columnWidths: [half, USABLE - half], margins: { top: 40, bottom: 40, left: 0, right: 120 }, rows });
}

function lineItemTable(doc: QuoteDocument): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Description", COLUMNS.description, AlignmentType.LEFT),
      headerCell("Qty", COLUMNS.qty, AlignmentType.RIGHT),
      headerCell("Unit", COLUMNS.unit, AlignmentType.LEFT),
      headerCell("Unit price (ex GST)", COLUMNS.price, AlignmentType.RIGHT),
      headerCell("Amount (ex GST)", COLUMNS.amount, AlignmentType.RIGHT),
    ],
  });

  const rows = doc.line_items.map((item) => {
    const description: Paragraph[] = [para([run(item.description)], { after: item.details ? 40 : 0 })];
    if (item.details) {
      description.push(para([run(item.details, { size: 16, color: GREY, italics: true })], { after: 0 }));
    }
    const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2);
    const priced = item.unit_price_cents > 0;
    return new TableRow({
      children: [
        tableCell(description, { width: COLUMNS.description }),
        tableCell([para([run(qty)], { align: AlignmentType.RIGHT, after: 0 })], { width: COLUMNS.qty }),
        tableCell([para([run(item.unit)], { after: 0 })], { width: COLUMNS.unit }),
        moneyCell(priced ? formatMoney(item.unit_price_cents) : "TBC", COLUMNS.price),
        moneyCell(priced ? formatMoney(Math.round(item.quantity * item.unit_price_cents)) : "TBC", COLUMNS.amount),
      ],
    });
  });

  if (rows.length === 0) {
    rows.push(
      new TableRow({
        children: [
          tableCell([para([run("Line items to be confirmed before this quote is issued.", { italics: true, color: GREY })], { after: 0 })], {
            width: USABLE,
          }),
        ],
      }),
    );
  }

  return new Table({
    columnWidths: [COLUMNS.description, COLUMNS.qty, COLUMNS.unit, COLUMNS.price, COLUMNS.amount],
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    rows: [header, ...rows],
  });
}

function totalsTable(doc: QuoteDocument, totals: QuoteTotals): Table {
  const labelWidth = USABLE - COLUMNS.amount - 400;
  const valueWidth = COLUMNS.amount + 400;
  const line = (label: string, value: string, opts: { bold?: boolean; fill?: string } = {}) =>
    new TableRow({
      children: [
        tableCell([para([run(label, { bold: opts.bold })], { align: AlignmentType.RIGHT, after: 0 })], {
          width: labelWidth,
          borders: noBorders,
          fill: opts.fill,
        }),
        tableCell([para([run(value, { bold: opts.bold })], { align: AlignmentType.RIGHT, after: 0 })], {
          width: valueWidth,
          borders: noBorders,
          fill: opts.fill,
        }),
      ],
    });

  const rows = [
    line("Subtotal (ex GST)", formatMoney(totals.subtotal_cents)),
    line(`GST (${Math.round(doc.gst_rate * 100)}%)`, formatMoney(totals.gst_cents)),
    line("Total (inc GST)", formatMoney(totals.total_cents), { bold: true, fill: "ECFDF5" }),
  ];
  if (doc.deposit_percent > 0) {
    rows.push(line(`Deposit (${doc.deposit_percent}%)`, `− ${formatMoney(totals.deposit_cents)}`));
    rows.push(line("Balance on completion", formatMoney(totals.balance_cents), { bold: true }));
  }

  return new Table({ columnWidths: [labelWidth, valueWidth], margins: { top: 40, bottom: 40, left: 0, right: 120 }, rows });
}

function signatureTable(): Table {
  const half = Math.floor(USABLE / 2);
  const bottomOnly = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
  const cell = (label: string, width: number) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: bottomOnly,
      children: [para([run(" ")], { after: 0 })],
    });
  return new Table({
    columnWidths: [half - 300, 300, USABLE - half - 300],
    margins: { top: 200, bottom: 40, left: 0, right: 120 },
    rows: [
      new TableRow({
        children: [
          cell("Customer signature", half - 300),
          tableCell([para([run(" ")], { after: 0 })], { width: 300, borders: noBorders }),
          cell("Date", USABLE - half - 300),
        ],
      }),
      new TableRow({
        children: [
          tableCell([para([run("Customer signature", { size: 16, color: GREY })], { after: 0 })], {
            width: half - 300,
            borders: noBorders,
          }),
          tableCell([para([run(" ")], { after: 0 })], { width: 300, borders: noBorders }),
          tableCell([para([run("Date", { size: 16, color: GREY })], { after: 0 })], {
            width: USABLE - half - 300,
            borders: noBorders,
          }),
        ],
      }),
    ],
  });
}

/* ── entry point ─────────────────────────────────────────────────────────── */

export async function renderQuoteDocx(quote: RenderedQuote): Promise<Buffer> {
  const { document: doc, totals, status } = quote;
  const businessLine = [
    doc.business.name || "Your business",
    doc.business.abn ? `ABN ${doc.business.abn}` : null,
    doc.business.licence ? `Lic. ${doc.business.licence}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const contactLine = [doc.business.phone, doc.business.email, doc.business.address]
    .filter((v) => v && v.trim().length > 0)
    .join("  ·  ");

  const children: Array<Paragraph | Table> = [
    heading(doc.customer.name ? `QUOTE — ${doc.job_type_label}` : "QUOTE", HeadingLevel.HEADING_1),
    para(
      [
        run(`Quote ${doc.quote_number}`, { bold: true, size: 20 }),
        run(`   ·   Status: ${QUOTE_STATUS_LABELS[status]}`, { size: 18, color: GREY }),
      ],
      { after: 200 },
    ),
    metaTable(doc),
    para("", { after: 100 }),

    heading("Scope of works", HeadingLevel.HEADING_2),
    para(doc.scope_summary || "Scope to be confirmed."),

    heading("Itemised work", HeadingLevel.HEADING_2),
    lineItemTable(doc),
    para("", { after: 60 }),
    totalsTable(doc, totals),
    para(
      [run("All amounts are in Australian dollars (AUD). Unit prices are exclusive of GST.", { size: 16, color: GREY, italics: true })],
      { after: 160 },
    ),
  ];

  const section = (title: string, items: string[]) => {
    if (items.length === 0) return;
    children.push(heading(title, HeadingLevel.HEADING_2));
    for (const item of items) children.push(bullet(item));
  };

  section("What this quote includes", doc.inclusions);
  section("Not included (exclusions)", doc.exclusions);
  section("Assumptions", doc.assumptions);

  if (doc.terms.length > 0) {
    children.push(heading("Payment terms & conditions", HeadingLevel.HEADING_2));
    for (const term of doc.terms) children.push(numbered(term));
  }

  if (doc.notes.trim()) {
    children.push(heading("Notes", HeadingLevel.HEADING_2));
    children.push(para(doc.notes));
  }

  children.push(heading("Acceptance", HeadingLevel.HEADING_2));
  children.push(para(doc.acceptance_note));
  children.push(signatureTable());
  children.push(para("", { after: 60 }));
  children.push(
    para([run(doc.disclaimer, { size: 15, color: GREY, italics: true })], { after: 0 }),
  );

  const document = new Document({
    styles: {
      default: { document: { run: { font: BODY_FONT, size: 20 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: "111827", font: BODY_FONT },
          paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 23, bold: true, color: ACCENT, font: BODY_FONT },
          paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "quote-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 600, hanging: 300 } } },
            },
          ],
        },
        {
          reference: "quote-terms",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 600, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [run(businessLine, { size: 15, color: GREY })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  run(`${contactLine ? `${contactLine}  ·  ` : ""}Page `, { size: 15, color: GREY }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GREY, font: BODY_FONT }),
                  run(" of ", { size: 15, color: GREY }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: GREY, font: BODY_FONT }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
