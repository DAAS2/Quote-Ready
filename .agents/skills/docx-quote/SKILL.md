---
name: docx-quote
description: Generate industry-standard trade quote documents (.docx and .pdf) from a QuoteReady job scope. Covers the required quote sections for an Australian residential trade business, the content rules for the drafting model (never price, never diagnose), and the docx-js formatting rules that keep the generated file valid and professionally laid out. Use when preparing, revising, or reviewing a customer-facing quote.
license: Proprietary — internal QuoteReady skill.
---

# DOCX quote generation

This skill is the contract between three things:

1. **Gemini** — drafts the quote *content* (scope summary, unpriced line items,
   inclusions, exclusions, assumptions, terms). It never produces a price.
2. **The renderers** — `lib/quotes/render-docx.ts` (`docx`) and
   `lib/quotes/render-pdf.ts` (`pdf-lib`) turn the validated
   `QuoteDocument` into a real file.
3. **The operator** — reviews everything, sets every price, and issues it.

A quote is a commercial document. Getting the sections right matters more than
looking clever. Keep the language plain, specific and honest.

---

## 1. Required sections (industry standard, AU residential trade)

A quote missing any of these reads as amateur and invites disputes.

| # | Section | Content |
|---|---|---|
| 1 | **Header** | Business name, ABN, trade licence number, phone, email, address |
| 2 | **Document title** | `QUOTE` + quote number (`Q-2026-0001`), job reference |
| 3 | **Dates** | Date issued · Valid until (default 30 days from issue) |
| 4 | **Customer block** | Customer name, phone, email, site/service address |
| 5 | **Scope summary** | 2–4 sentences describing the job *as understood*. Explicitly state that it is based on the information supplied. |
| 6 | **Itemised work** | Table: Description (+ detail line), Qty, Unit, Unit price (ex GST), Amount. One row per distinct piece of work. |
| 7 | **Money summary** | Subtotal (ex GST) · GST 10% · **Total inc GST** · optional deposit and balance. |
| 8 | **Inclusions** | What the price covers. |
| 9 | **Exclusions** | What it does *not* cover — carried from the scope pack. This is the single biggest dispute preventer. |
| 10 | **Assumptions** | Conditions the price depends on — carried from the scope pack. |
| 11 | **Payment terms** | Deposit, accepted payment methods, invoice timing. |
| 12 | **Validity** | "This quote is valid for N days from the date issued." |
| 13 | **Acceptance block** | Signature and date lines + the acceptance note. |
| 14 | **Disclaimer** | Not a diagnosis; concealed conditions and variations confirmed in writing before work proceeds. |

### Money rules

- Store and compute money in **integer cents**. Never floats.
- Unit prices are entered **ex GST**; GST is applied once, on the taxable
  subtotal, rounded to the nearest cent.
- `total = subtotal + gst`, `balance = total − deposit`.
- Always print the currency (`AUD`) and the GST line. A trade quote without a
  visible GST breakdown is not usable as a tax document later.
- **The model must never fill a price.** Suggested line items arrive with
  `unit_price_cents = 0`; the operator sets quantity and price.

---

## 2. Content rules for the drafting model

1. **Never produce a price, price range, or "typical cost".** If asked for
   anything numeric and commercial, omit the field.
2. **Never diagnose.** Describe work in terms of what will be done
   ("replace the mixer cartridge"), not what is wrong
   ("the cartridge has failed").
3. **Ground every line item in the scope.** Use the known facts, symptoms,
   template parts/labour and the voice-note evidence. Do not invent work.
4. **Carry the scope's honesty through.** If an inspection is recommended,
   say the price is subject to on-site confirmation. Include the exclusions
   and assumptions verbatim where they are already well written.
5. **Australian English**, plain trade language a homeowner understands.
   No marketing fluff, no "utilise", no emoji.
6. **Line item descriptions**: imperative and specific —
   `Replace mixer cartridge — supply and install`.
   `details` holds the qualifier — `Wall-mounted mixer, bathroom; isolation valve accessible.`
7. **Cap the list.** 3–12 line items. More means the scope is not clear enough
   to quote yet — say so in the notes instead.
8. **No line breaks inside a value.** The renderers place each value in its own
   paragraph; a `\n` in a field corrupts the layout. Use separate array items.
9. **Avoid smart punctuation in generated values** — use straight quotes and
   hyphens. The docx layer escapes what it must, but ASCII is safer.

---

## 3. docx-js formatting rules (mandatory)

The `.docx` is built with the open-source `docx` package
(<https://github.com/dolanmiu/docx>). These rules are non-negotiable — each one
prevents a class of corrupted or ugly output.

### Structure

- **Never use `\n` for line breaks.** One value per `Paragraph`; add another
  `Paragraph` for the next line.
- **Always wrap text in `TextRun`.** `Paragraph` has no `text` property.
- **`PageBreak` must live inside a `Paragraph`**:
  `new Paragraph({ children: [new PageBreak()] })`. A standalone `PageBreak`
  produces invalid XML that Word refuses to open.
- **`ImageRun` requires an explicit `type`** (`"png" | "jpg" | "jpeg" | "gif" | "bmp" | "svg"`)
  plus `altText` with `title`, `description` and `name`.

### Styles

- Override Word's built-in styles by their **exact ids** — `"Title"`,
  `"Heading1"`, `"Heading2"` — and set `outlineLevel` (0 for H1, 1 for H2) so
  headings are navigable.
- Set a default document font via `styles.default.document.run.font`.
  Arial for headers and body is the safest universal pairing; keep headings
  black or grey, not coloured.
- Prefer named styles over inline formatting so the document stays consistent.
- Standard margins: `1440` DXA (1 inch) on every side.

### Tables (the line-item table is the whole point)

- Set **both** `columnWidths: [...]` on the `Table` **and**
  `width: { size, type: WidthType.DXA }` on every `TableCell`.
- Letter page with 1" margins = **9360 DXA** usable width.
  Quote table columns: `[4200, 900, 1000, 1600, 1660]` = description, qty,
  unit, unit price, amount.
- Apply borders to individual `TableCell`s, never to the `Table`.
- Set cell padding once at table level: `margins: { top, bottom, left, right }`.
- Cell shading **must** use `type: ShadingType.CLEAR`. `ShadingType.SOLID`
  renders as a solid black block in Word.
- Every `TableCell` needs at least one `Paragraph`.
- Repeat the header row on later pages with `tableHeader: true`.

### Lists and numbering

- **Never fake bullets with unicode characters.** Use the numbering config
  with `format: LevelFormat.BULLET` (the constant, not the string `"bullet"`)
  and `text: "•"`.
- Each `reference` is an **independent list**. Different reference restarts at
  1; same reference continues. Give every numbered section its own reference.

### Headers, footers, page numbers

- Put the business name / quote number in the header and
  `Page X of Y` in the footer via `PageNumber.CURRENT` /
  `PageNumber.TOTAL_PAGES`.

### Output

- Node: `Packer.toBuffer(doc)` → `Buffer`, then return it as a file download.
- Browser: `Packer.toBlob(doc)`.

---

## 4. PDF parity rules (`pdf-lib`)

The PDF is generated directly (no browser, no LibreOffice) so it renders
identically in every environment.

- Use the **same** `QuoteDocument` + `QuoteTotals` as the docx renderer. One
  model, two renderers — never fork the content.
- Embed a standard font (`Helvetica`, `Helvetica-Bold`) — no external font
  downloads, so generation is deterministic and offline-safe.
- A4 portrait, 40pt margins. Wrap long text by measuring with
  `font.widthOfTextAtSize`; never let a cell overflow the page.
- If content flows past the first page, add continuation pages and repeat the
  column header row.
- Keep the same section order as the docx so the two downloads are
  interchangeable.
- Sanitise text to WinAnsi-safe characters (curly quotes → straight, `—` → `-`,
  `×` → `x`) before drawing — `pdf-lib` throws on characters outside the
  embedded font's encoding.

---

## 5. References

- `docx-js.md` — the full upstream tutorial this skill condenses
  (styles, tables, numbering, TOC, images, page setup).
- `ooxml.md` — raw OOXML reference for editing an existing `.docx`
  (tracked changes / redlining, comments, unpack → edit → pack).
  Only needed when *editing* a document rather than creating one.
- Full skill bundle: <https://github.com/ComposioHQ/awesome-claude-skills/tree/master/document-skills/docx>

> Editing an existing `.docx` (tracked changes, comments) is out of scope for
> quote generation. Quotes are always generated fresh from the `QuoteDocument`;
> revisions produce a new version and are recorded in the job audit trail.
