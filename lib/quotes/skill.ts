import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ────────────────────────────────────────────────────────────────────────────
 * The docx-quote skill.
 *
 * The canonical skill lives at `.agents/skills/docx-quote/SKILL.md` — one file,
 * used by the drafting model (injected into its system prompt) and by any agent
 * working on this repository. It is read from disk and cached for the process.
 *
 * If the file cannot be read (for example a deployment that did not trace the
 * `.agents` directory), we fall back to a condensed copy of the content rules
 * rather than failing a quote generation.
 * ──────────────────────────────────────────────────────────────────────────── */

const SKILL_PATH = join(".agents", "skills", "docx-quote", "SKILL.md");

let cached: string | null = null;

export function quoteDocxSkill(): string {
  if (cached !== null) return cached;
  try {
    cached = readFileSync(join(process.cwd(), SKILL_PATH), "utf8").trim();
  } catch {
    cached = FALLBACK_SKILL;
  }
  return cached;
}

/** Convenience: the skill minus the YAML frontmatter, ready to inject. */
export function quoteDocxSkillBody(): string {
  return quoteDocxSkill().replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

/** Exposed for tests — clears the process cache. */
export function __resetQuoteSkillCache(): void {
  cached = null;
}

const FALLBACK_SKILL = `# DOCX quote generation

Required sections for an Australian residential trade quote, in order:
business header (name, ABN, licence, phone, email); QUOTE title with quote
number and job reference; date issued and valid-until (default 30 days);
customer block (name, phone, email, site address); scope summary; itemised
work table (description, qty, unit, unit price ex GST, amount); money summary
(subtotal, GST 10%, total inc GST, optional deposit and balance); inclusions;
exclusions; assumptions; payment terms; validity; acceptance block with
signature and date; disclaimer.

Rules: never produce a price or price range — suggested line items leave
unit_price_cents at 0 and the operator sets it. Never diagnose. Ground every
line item in the scope. Australian English, plain trade language, 3-12 line
items. No line breaks inside a field value. Avoid smart punctuation.

docx-js rules: never use \\n for line breaks (use separate Paragraphs); always
wrap text in TextRun; PageBreak must live inside a Paragraph; set both
columnWidths on the table and width on every cell (Letter usable width = 9360
DXA); apply borders to cells not tables; table cell shading must use
ShadingType.CLEAR; never fake bullets with unicode (use the numbering config
with LevelFormat.BULLET).`;
