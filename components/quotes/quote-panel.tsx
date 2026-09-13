"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildQuoteAdvisory, type QuoteAdvisory } from "@/lib/quotes/advisory";
import {
  QUOTE_UNITS,
  QUOTE_UNIT_LABELS,
  QUOTE_STATUS_LABELS,
  type QuoteDocument,
  type QuoteLineItem,
  type QuoteRecord,
  type QuoteStatus,
  type QuoteUnit,
} from "@/lib/quotes/schema";
import { computeTotals, formatMoney, hasAnyPrice } from "@/lib/quotes/totals";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote panel.
 *
 * Self-contained so the job page does not have to thread quote state through
 * the (very large) job detail view. Quote preparation is never hard-blocked:
 * the operator always sees exactly what is still unresolved and can proceed,
 * which mirrors the "scope before you price" thesis without taking the
 * commercial decision away from the tradie. Prices are only ever entered here,
 * by a human.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface QuotePanelProps {
  jobId: string;
  customerName: string;
  status: string;
  readinessScore: number | null;
  readinessBand: string | null;
  safetyFlag: boolean;
  inspectionRecommended: boolean;
  missingFields: Array<{ key: string; label: string; critical: boolean }>;
}

interface EditableLine {
  id: string;
  description: string;
  details: string;
  unit: QuoteUnit;
  taxable: boolean;
  qtyText: string;
  priceText: string;
}

const SEVERITY_STYLES: Record<string, { wrap: string; icon: string; tone: string }> = {
  safety: {
    wrap: "bg-[#FEF2F2] border border-[#FECACA]",
    icon: "emergency",
    tone: "text-[#B91C1C]",
  },
  attention: {
    wrap: "bg-[#FFFBEB] border border-[#FDE68A]",
    icon: "warning",
    tone: "text-[#92400E]",
  },
  info: {
    wrap: "bg-surface-container-low border border-outline-variant",
    icon: "info",
    tone: "text-on-surface-variant",
  },
};

function priceToCents(text: string): number {
  const n = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function centsToPrice(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}

export function QuotePanel(props: QuotePanelProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [advisoryOpen, setAdvisoryOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    quoteNumber: string;
    document: QuoteDocument;
    status: QuoteStatus;
    lines: EditableLine[];
  } | null>(null);

  const advisory: QuoteAdvisory = buildQuoteAdvisory({
    status: props.status,
    readiness_score: props.readinessScore,
    readiness_band: props.readinessBand,
    safety_flag: props.safetyFlag,
    inspection_recommended: props.inspectionRecommended,
    missing_fields: props.missingFields,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${props.jobId}/quote`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not load quotes.");
      setQuotes((data.quotes ?? []) as QuoteRecord[]);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [props.jobId]);

  useEffect(() => {
    // mount + job-change fetch: state lands after the await, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function prepareQuote() {
    setBusy("create");
    try {
      const res = await fetch(`/api/jobs/${props.jobId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validity_days: 30, deposit_percent: 0, acknowledge: acknowledged }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not prepare the quote.");
      toast.success(
        `Draft quote ${data.quote_number} prepared (${data.drafted_by === "ai" ? "AI-drafted" : "scope-derived"}). Add your prices.`,
      );
      setAdvisoryOpen(false);
      setAcknowledged(false);
      await load();
      router.refresh();
      const created = await fetch(`/api/quotes/${data.id}`).then((r) => r.json()).catch(() => null);
      if (created?.quote) openEditor(created.quote as QuoteRecord);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function openEditor(quote: QuoteRecord) {
    setEditing({
      id: quote.id,
      quoteNumber: quote.quote_number,
      document: quote.document,
      status: quote.status,
      lines: quote.document.line_items.map((item) => ({
        id: item.id,
        description: item.description,
        details: item.details ?? "",
        unit: item.unit,
        taxable: item.taxable,
        qtyText: String(item.quantity),
        priceText: centsToPrice(item.unit_price_cents),
      })),
    });
  }

  function toLineItems(lines: EditableLine[]): QuoteLineItem[] {
    return lines
      .filter((line) => line.description.trim().length > 0)
      .map((line) => ({
        id: line.id,
        description: line.description.trim(),
        ...(line.details.trim() ? { details: line.details.trim() } : {}),
        quantity: Math.max(0.01, Number.parseFloat(line.qtyText) || 1),
        unit: line.unit,
        unit_price_cents: priceToCents(line.priceText),
        taxable: line.taxable,
        suggested: true,
      }));
  }

  const livePreview = editing
    ? computeTotals({
        line_items: toLineItems(editing.lines),
        gst_rate: editing.document.gst_rate,
        deposit_percent: editing.document.deposit_percent,
      })
    : null;

  async function saveEditor() {
    if (!editing) return;
    setBusy("save");
    try {
      const document: QuoteDocument = { ...editing.document, line_items: toLineItems(editing.lines) };
      const res = await fetch(`/api/quotes/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, status: editing.status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the quote.");
      toast.success(`Quote ${editing.quoteNumber} saved.`);
      setEditing(null);
      await load();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function discard(quote: QuoteRecord) {
    setBusy(`discard-${quote.id}`);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not discard the quote.");
      toast.success(`Draft quote ${quote.quote_number} discarded.`);
      await load();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function setLine(index: number, patch: Partial<EditableLine>) {
    setEditing((current) =>
      current
        ? { ...current, lines: current.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) }
        : current,
    );
  }

  function addLine() {
    setEditing((current) =>
      current
        ? {
            ...current,
            lines: [
              ...current.lines,
              {
                id: `li-${current.lines.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
                description: "",
                details: "",
                unit: "each" as QuoteUnit,
                taxable: true,
                qtyText: "1",
                priceText: "",
              },
            ],
          }
        : current,
    );
  }

  function removeLine(index: number) {
    setEditing((current) =>
      current ? { ...current, lines: current.lines.filter((_, i) => i !== index) } : current,
    );
  }

  function setSection(key: "inclusions" | "exclusions" | "assumptions" | "terms", value: string) {
    setEditing((current) =>
      current
        ? {
            ...current,
            document: {
              ...current.document,
              [key]: value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            },
          }
        : current,
    );
  }

  return (
    <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-primary-container/20 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">description</span>
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline-md text-headline-md text-on-surface">Quote documents</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Industry-standard quote as a Word document or PDF. You set every price.
            </p>
          </div>
        </div>
        <button
          className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60 self-start sm:self-auto"
          onClick={() => setAdvisoryOpen(true)}
          disabled={busy !== null}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Prepare quote</span>
        </button>
      </div>

      {/* Readiness warning strip — always visible, never blocking */}
      <div className="rounded-lg bg-surface-container-low px-space-md py-3 flex items-start gap-2.5">
        <span
          className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${advisory.safety ? "text-[#B91C1C]" : advisory.ready ? "text-primary" : "text-[#D97706]"}`}
        >
          {advisory.safety ? "emergency" : advisory.ready ? "check_circle" : "info"}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-label-md text-label-md text-on-surface">{advisory.summary}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {advisory.ready
              ? "The scope is complete enough to quote without caveats."
              : `You can still prepare the quote — it will carry ${advisory.missing_labels.length} unresolved item${advisory.missing_labels.length === 1 ? "" : "s"} as assumptions and exclusions.`}
          </span>
        </div>
      </div>

      {/* Existing quotes */}
      {loading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No quotes yet. Prepare one and QuoteReady will draft the line items and exclusions from this
          scope — ready for you to price.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {quotes.map((quote) => {
            const priced = hasAnyPrice(quote.document);
            return (
              <div
                key={quote.id}
                className="rounded-xl bg-surface-container-low p-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">request_quote</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                        {quote.quote_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-data-mono text-label-sm">
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                      {!priced && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-label-sm text-label-sm">
                          Pricing required
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {quote.document.line_items.length} line item
                      {quote.document.line_items.length === 1 ? "" : "s"} · valid until{" "}
                      {quote.document.valid_until}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-data-mono text-label-lg text-on-surface font-semibold mr-1">
                    {priced ? formatMoney(quote.totals.total_cents) : "—"}
                  </span>
                  <button
                    className="h-9 px-3 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                    onClick={() => openEditor(quote)}
                    type="button"
                  >
                    Edit
                  </button>
                  <a
                    className="h-9 px-3 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center gap-1.5"
                    href={`/api/quotes/${quote.id}/download?format=docx`}
                    download
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    DOCX
                  </a>
                  <a
                    className="h-9 px-3 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center gap-1.5"
                    href={`/api/quotes/${quote.id}/download?format=pdf`}
                    download
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    PDF
                  </a>
                  {quote.status === "draft" && (
                    <button
                      className="h-9 px-3 rounded-lg text-[#B91C1C] font-label-md text-label-md hover:bg-[#FEF2F2] transition-colors disabled:opacity-60"
                      onClick={() => discard(quote)}
                      disabled={busy === `discard-${quote.id}`}
                      type="button"
                    >
                      Discard
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Advisory dialog ── */}
      {advisoryOpen && (
        <div className="fixed inset-0 z-50 bg-[#102A43]/50 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-[640px] w-full bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-auto">
            <div className="p-6 pb-5 border-b border-[#E5E7EB] flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">request_quote</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-xl text-[#102A43] tracking-tight">Prepare a quote</h3>
                  <p className="text-sm text-[#4B5563] mt-0.5">
                    QuoteReady drafts the content. Prices stay blank until you enter them.
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
                onClick={() => setAdvisoryOpen(false)}
                type="button"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Before you send anything to the customer
              </span>
              {advisory.warnings.length === 0 ? (
                <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#15803D] text-[20px] shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <p className="text-sm text-[#166534]">
                    Nothing outstanding — this scope is ready for estimate preparation.
                  </p>
                </div>
              ) : (
                advisory.warnings.map((warning) => {
                  const style = SEVERITY_STYLES[warning.severity] ?? SEVERITY_STYLES.info!;
                  return (
                    <div key={warning.id} className={`rounded-lg p-3.5 flex items-start gap-2.5 ${style.wrap}`}>
                      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${style.tone}`}>
                        {style.icon}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-sm font-semibold ${style.tone}`}>{warning.title}</span>
                        <p className="text-sm text-[#374151] leading-snug">{warning.body}</p>
                      </div>
                    </div>
                  );
                })
              )}

              {advisory.requires_acknowledgement && (
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span className="text-sm text-[#374151]">
                    I understand these gaps and want to prepare the quote anyway. I will confirm the
                    outstanding details and set every price myself.
                  </span>
                </label>
              )}
            </div>

            <div className="p-6 bg-white border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                className="h-10 px-4 rounded-lg border border-[#D1D5DB] text-sm font-semibold text-[#374151] hover:bg-gray-50 transition-colors w-full sm:w-auto"
                onClick={() => setAdvisoryOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 px-5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-60 w-full sm:w-auto justify-center"
                onClick={prepareQuote}
                disabled={busy === "create" || (advisory.requires_acknowledgement && !acknowledged)}
                type="button"
              >
                <span>{busy === "create" ? "Drafting…" : "Generate draft quote"}</span>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Operator editor ── */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-[#102A43]/50 backdrop-blur-sm flex items-start justify-center p-4 md:p-6 overflow-y-auto">
          <div className="max-w-[900px] w-full bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-auto">
            <div className="p-5 pb-4 border-b border-[#E5E7EB] flex items-start justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">edit_document</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg text-[#102A43]">
                    Edit quote {editing.quoteNumber}
                  </h3>
                  <p className="text-xs text-[#4B5563]">
                    Prices are exclusive of GST. Totals update as you type.
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
                onClick={() => setEditing(null)}
                type="button"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              {/* Scope summary */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  Scope summary
                </label>
                <textarea
                  className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                  value={editing.document.scope_summary}
                  onChange={(e) =>
                    setEditing((c) =>
                      c ? { ...c, document: { ...c.document, scope_summary: e.target.value } } : c,
                    )
                  }
                />
              </div>

              {/* Line items */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Line items
                  </label>
                  <button
                    className="h-8 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center gap-1"
                    onClick={addLine}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add item
                  </button>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-[#F3F4F6] text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2">Unit</div>
                    <div className="col-span-2 text-right">Unit price (ex GST)</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {editing.lines.map((line, index) => {
                    const amount = Math.round((Number.parseFloat(line.qtyText) || 0) * priceToCents(line.priceText));
                    return (
                      <div
                        key={line.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-3 border-t border-[#F3F4F6] items-start"
                      >
                        <div className="md:col-span-5 flex flex-col gap-1.5">
                          <input
                            className="w-full h-9 rounded-lg border border-[#D1D5DB] px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                            placeholder="e.g. Replace mixer cartridge — supply and install"
                            value={line.description}
                            onChange={(e) => setLine(index, { description: e.target.value })}
                          />
                          <input
                            className="w-full h-8 rounded-lg border border-[#E5E7EB] px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                            placeholder="Detail line (access, fixture, qualifier)"
                            value={line.details}
                            onChange={(e) => setLine(index, { details: e.target.value })}
                          />
                        </div>
                        <input
                          className="md:col-span-1 h-9 rounded-lg border border-[#D1D5DB] px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                          inputMode="decimal"
                          value={line.qtyText}
                          onChange={(e) => setLine(index, { qtyText: e.target.value })}
                        />
                        <select
                          className="md:col-span-2 h-9 rounded-lg border border-[#D1D5DB] px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                          value={line.unit}
                          onChange={(e) => setLine(index, { unit: e.target.value as QuoteUnit })}
                        >
                          {QUOTE_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {QUOTE_UNIT_LABELS[unit]}
                            </option>
                          ))}
                        </select>
                        <input
                          className="md:col-span-2 h-9 rounded-lg border border-[#D1D5DB] px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={line.priceText}
                          onChange={(e) => setLine(index, { priceText: e.target.value })}
                        />
                        <div className="md:col-span-2 flex items-center justify-end gap-2">
                          <span className="font-data-mono text-sm text-on-surface">
                            {line.priceText ? formatMoney(amount) : "—"}
                          </span>
                          <button
                            className="p-1.5 rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                            onClick={() => removeLine(index)}
                            type="button"
                            aria-label="Remove line item"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live totals */}
                {livePreview && (
                  <div className="self-end w-full md:w-[300px] rounded-lg bg-surface-container-low p-3 flex flex-col gap-1.5">
                    <Row label="Subtotal (ex GST)" value={formatMoney(livePreview.subtotal_cents)} />
                    <Row label={`GST (${Math.round(editing.document.gst_rate * 100)}%)`} value={formatMoney(livePreview.gst_cents)} />
                    <Row label="Total (inc GST)" value={formatMoney(livePreview.total_cents)} strong />
                  </div>
                )}
              </div>

              {/* Commercial sections */}
              {(
                [
                  ["inclusions", "What this quote includes"],
                  ["exclusions", "Not included (exclusions)"],
                  ["assumptions", "Assumptions"],
                  ["terms", "Payment terms (one per line)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">{label}</label>
                  <textarea
                    className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                    value={editing.document[key].join("\n")}
                    onChange={(e) => setSection(key, e.target.value)}
                  />
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Deposit %
                  </label>
                  <input
                    className="h-9 rounded-lg border border-[#D1D5DB] px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                    inputMode="numeric"
                    value={String(editing.document.deposit_percent)}
                    onChange={(e) =>
                      setEditing((c) =>
                        c
                          ? {
                              ...c,
                              document: {
                                ...c.document,
                                deposit_percent: Math.min(100, Math.max(0, Number.parseFloat(e.target.value) || 0)),
                              },
                            }
                          : c,
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Validity (days)
                  </label>
                  <input
                    className="h-9 rounded-lg border border-[#D1D5DB] px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                    inputMode="numeric"
                    value={String(editing.document.validity_days)}
                    onChange={(e) =>
                      setEditing((c) =>
                        c
                          ? {
                              ...c,
                              document: {
                                ...c.document,
                                validity_days: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                              },
                            }
                          : c,
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Status
                  </label>
                  <select
                    className="h-9 rounded-lg border border-[#D1D5DB] px-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                    value={editing.status}
                    onChange={(e) =>
                      setEditing((c) => (c ? { ...c, status: e.target.value as QuoteStatus } : c))
                    }
                  >
                    {(["draft", "issued", "accepted", "declined"] as const).map((status) => (
                      <option key={status} value={status}>
                        {QUOTE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                  value={editing.document.notes}
                  onChange={(e) =>
                    setEditing((c) => (c ? { ...c, document: { ...c.document, notes: e.target.value } } : c))
                  }
                />
              </div>
            </div>

            <div className="p-5 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="flex items-start gap-1.5 text-xs text-[#6B7280] max-w-[420px]">
                <span className="material-symbols-outlined text-[16px] text-outline shrink-0 mt-0.5">info</span>
                <span>
                  QuoteReady never prices a job and never sends anything. Download the file and issue it
                  through your usual channel.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  className="h-10 px-4 rounded-lg border border-[#D1D5DB] text-sm font-semibold text-[#374151] hover:bg-gray-50 transition-colors"
                  onClick={() => setEditing(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-10 px-5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-60"
                  onClick={saveEditor}
                  disabled={busy === "save"}
                  type="button"
                >
                  <span>{busy === "save" ? "Saving…" : "Save quote"}</span>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`font-body-sm text-body-sm ${strong ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
        {label}
      </span>
      <span className={`font-data-mono ${strong ? "text-label-lg text-on-surface font-bold" : "text-label-md text-on-surface"}`}>
        {value}
      </span>
    </div>
  );
}
