/* ────────────────────────────────────────────────────────────────────────────
 * Quote advisory.
 *
 * QuoteReady's whole thesis is "scope before you price", but a tradie is the
 * one who owns the commercial decision — so quote preparation is never hard
 * blocked. Instead every job gets an honest, severity-ranked advisory that
 * says exactly what is still unresolved before the document leaves the
 * business. Safety is surfaced first and always loudest.
 * ──────────────────────────────────────────────────────────────────────────── */

export type QuoteWarningSeverity = "safety" | "attention" | "info";

export interface QuoteWarning {
  id: string;
  severity: QuoteWarningSeverity;
  title: string;
  body: string;
}

export interface QuoteAdvisoryInput {
  status: string;
  readiness_score: number | null;
  readiness_band: string | null;
  safety_flag: boolean;
  inspection_recommended: boolean;
  missing_fields: Array<{ key: string; label: string; critical: boolean; why?: string }>;
  /** optional — used for labelling only, never for gating */
  risk_flags?: Array<{ label: string }>;
}

export interface QuoteAdvisory {
  /** never false — the operator decides; this exists so the UI can explain itself */
  allowed: boolean;
  safety: boolean;
  inspection_recommended: boolean;
  ready: boolean;
  /** true when the operator should tick an acknowledgement before generating */
  requires_acknowledgement: boolean;
  summary: string;
  warnings: QuoteWarning[];
  missing_labels: string[];
  missing_critical_labels: string[];
}

export function buildQuoteAdvisory(input: QuoteAdvisoryInput): QuoteAdvisory {
  const warnings: QuoteWarning[] = [];
  const missingAll = input.missing_fields.map((m) => m.label);
  const missingCritical = input.missing_fields.filter((m) => m.critical).map((m) => m.label);
  const ready = input.readiness_band === "ready_for_estimate" && !input.safety_flag;

  if (input.safety_flag) {
    warnings.push({
      id: "safety",
      severity: "safety",
      title: "Safety escalation is active on this job",
      body: "The enquiry contains a safety indication. Do not treat this as a diagnosis and do not present a fixed price as final until the concern is addressed on site by a licensed trade.",
    });
  }

  if (input.inspection_recommended) {
    warnings.push({
      id: "inspection",
      severity: "attention",
      title: "Inspection was recommended before pricing",
      body: "Unresolved risk signals mean a remote price can move. Quote it as an estimate and state clearly that the price is subject to on-site confirmation.",
    });
  }

  if (missingCritical.length > 0) {
    warnings.push({
      id: "missing_critical",
      severity: "attention",
      title: `${missingCritical.length} required detail${missingCritical.length === 1 ? "" : "s"} still missing`,
      body: `Without ${listPhrase(missingCritical)} the scope can change on the day, which is how jobs end up underquoted. You can still prepare the quote — confirm these with the customer first if you can.`,
    });
  } else if (missingAll.length > 0) {
    warnings.push({
      id: "missing",
      severity: "info",
      title: `${missingAll.length} optional detail${missingAll.length === 1 ? "" : "s"} outstanding`,
      body: `Not blocking, but worth confirming: ${listPhrase(missingAll)}.`,
    });
  }

  if (input.readiness_band && input.readiness_band !== "ready_for_estimate" && !input.safety_flag) {
    warnings.push({
      id: "readiness",
      severity: "info",
      title: `Readiness is ${input.readiness_score ?? 0}% (${input.readiness_band.replace(/_/g, " ")})`,
      body: "The quote will include the current assumptions and exclusions so the customer can see what it is — and is not — based on.",
    });
  }

  if (input.status === "new") {
    warnings.push({
      id: "not_analysed",
      severity: "attention",
      title: "This enquiry has not been analysed yet",
      body: "Without an analysis the line items can only come from the raw enquiry text. Run the analysis first for a scope-derived suggestion.",
    });
  }

  const requiresAcknowledgement = input.safety_flag || missingCritical.length > 0 || input.status === "new";

  return {
    allowed: true,
    safety: input.safety_flag,
    inspection_recommended: input.inspection_recommended,
    ready,
    requires_acknowledgement: requiresAcknowledgement,
    summary: ready
      ? "Scope is ready for estimate preparation."
      : "You can prepare this quote now — review the notes below first.",
    warnings,
    missing_labels: missingAll,
    missing_critical_labels: missingCritical,
  };
}

function listPhrase(items: string[]): string {
  const capped = items.slice(0, 4);
  if (capped.length === 1) return capped[0]!;
  return `${capped.slice(0, -1).join(", ")} and ${capped[capped.length - 1]}`;
}
