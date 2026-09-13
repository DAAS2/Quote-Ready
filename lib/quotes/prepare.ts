import type { JobDetail } from "@/lib/data/types";
import type { JobTemplate } from "@/lib/rules/job-templates";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import type { ServerProfile } from "@/lib/data/org";
import { suggestQuoteContent } from "@/lib/ai/quote";
import { GeminiError } from "@/lib/ai/gemini";
import { assembleQuoteDocument, buildFallbackSuggestion } from "./content";
import type { QuoteSource } from "./content";
import { addDaysIso, longDate } from "./numbering";
import { computeTotals } from "./totals";
import type { QuoteBusiness, QuoteDocument, QuoteSuggestion, QuoteTotals } from "./schema";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote preparation.
 *
 * Flow: job + scope + template → (Gemini suggestion | deterministic fallback)
 *       → assembled QuoteDocument → totals.
 *
 * The model drafts content only. If it is unavailable, misbehaves, or is not
 * configured, the deterministic fallback builds a complete, honest document so
 * quote preparation never dead-ends. Either way the operator prices it.
 * ──────────────────────────────────────────────────────────────────────────── */

const DEFAULT_VALIDITY_DAYS = 30;
const DEFAULT_DEPOSIT_PERCENT = 0;

/** Business identity for the quote header, from the profile when signed in. */
export function resolveQuoteBusiness(profile: ServerProfile | null): QuoteBusiness {
  return {
    name: profile?.business_name?.trim() || "Melbourne Metro Plumbing",
    abn: "",
    licence: "48291",
    phone: "",
    email: profile?.email ?? "",
    address: profile?.service_area ?? "",
  };
}

export function resolvePreparedBy(profile: ServerProfile | null): string {
  return profile?.full_name?.trim() || "Alex Miller";
}

export interface PrepareQuoteInput {
  job: JobDetail;
  template: JobTemplate;
  quoteNumber: string;
  business: QuoteBusiness;
  preparedBy: string;
  validityDays?: number;
  depositPercent?: number;
  issueDate?: string;
}

export interface PreparedQuote {
  document: QuoteDocument;
  totals: QuoteTotals;
  suggestion: QuoteSuggestion;
  /** honest label for the audit trail and the UI */
  drafted_by: "ai" | "fallback";
}

export async function prepareQuote(input: PrepareQuoteInput): Promise<PreparedQuote> {
  const { job, template } = input;
  const scope = job.scope;

  const source: QuoteSource = {
    reference: job.id ? `JOB-${job.id.slice(0, 8)}` : "",
    customer: {
      name: job.customer.full_name,
      phone: job.customer.phone ?? "",
      email: job.customer.email ?? "",
    },
    site_address: job.customer.suburb ?? "",
    job_type: job.job_type,
    job_type_label: JOB_TYPE_LABELS[job.job_type],
    enquiry_text: job.enquiry_text ?? "",
    scope,
    template,
  };

  let suggestion: QuoteSuggestion;
  let draftedBy: PreparedQuote["drafted_by"] = "fallback";
  try {
    suggestion = await suggestQuoteContent({
      job_type_label: JOB_TYPE_LABELS[job.job_type],
      customer_name: job.customer.full_name,
      customer_suburb: job.customer.suburb,
      enquiry_text: job.enquiry_text ?? "",
      scope,
      template: {
        label: template.label,
        assumptions: template.assumptions,
        exclusions: template.exclusions,
        questions: template.questions,
      },
    });
    draftedBy = "ai";
  } catch (error) {
    if (!(error instanceof GeminiError)) {
      console.warn("[QuoteReady] quote drafting failed unexpectedly:", (error as Error).message);
    }
    suggestion = buildFallbackSuggestion({
      job_type: job.job_type,
      scope,
      template,
      customer_name: job.customer.full_name,
    });
  }

  const validityDays = input.validityDays ?? DEFAULT_VALIDITY_DAYS;
  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  const issueDate = input.issueDate ?? new Date().toISOString().slice(0, 10);

  const document = assembleQuoteDocument({
    quote_number: input.quoteNumber,
    issue_date: issueDate,
    valid_until: addDaysIso(issueDate, validityDays),
    validity_days: validityDays,
    deposit_percent: depositPercent,
    prepared_by: input.preparedBy,
    business: input.business,
    source,
    suggestion,
  });

  return { document, totals: computeTotals(document), suggestion, drafted_by: draftedBy };
}

/** Human label used in the audit trail, e.g. "valid until 13 October 2026". */
export function validityLabel(doc: QuoteDocument): string {
  return `valid until ${longDate(doc.valid_until)}`;
}
