"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { INSPECTION_RISK_FLAGS, JOB_TEMPLATES, type JobTemplate } from "@/lib/rules/job-templates";
import type { JobType } from "@/lib/ai/schemas";
import type { TemplateRow } from "@/lib/data/types";

/* ────────────────────────────────────────────────────────────────────────────
 * Templates manager — create/edit/delete service templates. The deterministic
 * engine (and the AI grading that feeds it) uses these for every enquiry
 * filed under them; marking one "default" overrides the built-in for its
 * base job type. Styled in the Calm Trade Precision system.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Engine-supported fact keys a template can require (labelled). */
const FACT_KEYS: Array<{ key: string; label: string }> = [
  { key: "location_in_property", label: "Location in property" },
  { key: "fixture_type", label: "Fixture type" },
  { key: "system_type", label: "System type" },
  { key: "system_age", label: "System age" },
  { key: "symptoms", label: "Symptoms / issue type" },
  { key: "urgency", label: "Urgency" },
  { key: "property_access", label: "Property access" },
  { key: "water_isolation_access", label: "Water isolation access" },
  { key: "water_damage", label: "Water damage" },
  { key: "customer_availability", label: "Customer availability" },
];

const BASE_TYPES: Array<{ value: JobType; label: string }> = [
  { value: "leaking_tap", label: "Leaking tap / mixer" },
  { value: "toilet_repair", label: "Toilet repair / replacement" },
  { value: "hot_water_system", label: "Hot-water-system issue" },
];

const RISK_FLAGS = Object.entries(INSPECTION_RISK_FLAGS).map(([key, v]) => ({
  key,
  label: v.label,
}));

interface FieldDraft {
  key: string;
  label: string;
  critical: boolean;
  ask_customer: boolean;
  why: string;
}

interface ConditionDraft {
  kind: "risk_flag" | "fact_unknown";
  riskFlag: string;
  factKey: string;
  label: string;
}

interface EditorState {
  id?: string;
  base_type: JobType;
  name: string;
  blurb: string;
  is_default: boolean;
  minPhotos: number;
  fields: FieldDraft[];
  conditions: ConditionDraft[];
  assumptions: string[];
  exclusions: string[];
  questions: Record<string, string>;
  editingBuiltin: boolean;
}

function builtInEditorState(base: JobType): EditorState {
  const t = JOB_TEMPLATES[base];
  return {
    base_type: base,
    name: `${t.label} (customised)`,
    blurb: t.blurb,
    is_default: true,
    minPhotos: t.min_photos_for_good_evidence,
    fields: t.required_fields.map((f) => ({
      key: f.key,
      label: f.label,
      critical: f.critical,
      ask_customer: f.ask_customer,
      why: f.why,
    })),
    conditions: t.inspection_conditions.map((c) =>
      c.any_risk_flag
        ? { kind: "risk_flag", riskFlag: c.any_risk_flag[0]!, factKey: "symptoms", label: c.label }
        : { kind: "fact_unknown", riskFlag: "water_damage", factKey: c.any_fact?.[0]?.key ?? "fixture_type", label: c.label },
    ),
    assumptions: [...t.assumptions],
    exclusions: [...t.exclusions],
    questions: { ...t.questions },
    editingBuiltin: true,
  };
}

/** Blank custom template — the "create a new service category" starting point. */
function newTemplateEditor(): EditorState {
  return {
    ...builtInEditorState("leaking_tap"),
    name: "New custom template",
    editingBuiltin: false,
    is_default: false,
    fields: [],
    conditions: [],
    assumptions: [],
    exclusions: [],
    questions: {},
  };
}

interface TemplateDetailSource {
  required_fields?: Array<{
    key: string;
    label: string;
    critical: boolean;
    ask_customer: boolean;
    why: string;
  }>;
  inspection_conditions?: Array<{
    label: string;
    any_risk_flag?: string[];
    any_fact?: Array<{ key: string }>;
  }>;
  assumptions?: string[];
  exclusions?: string[];
  questions?: Record<string, string>;
}

/**
 * Inline template detail — shows the actual required details, inspection
 * triggers, assumptions and exclusions on the main templates page (no need to
 * open a modal to see what a template really enforces).
 */
function TemplateDetailPanels({ doc }: { doc: TemplateDetailSource }) {
  const fields = doc.required_fields ?? [];
  const triggers = doc.inspection_conditions ?? [];
  const assumptions = doc.assumptions ?? [];
  const exclusions = doc.exclusions ?? [];
  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-border">
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
          {fields.length} required details
        </span>
        <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-label-sm text-label-sm">
          {triggers.length} inspection trigger{triggers.length === 1 ? "" : "s"}
        </span>
        <span className="px-2 py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
          {assumptions.length} assumptions
        </span>
        <span className="px-2 py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
          {exclusions.length} exclusions
        </span>
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Required details
          </span>
          {fields.map((f) => (
            <div key={`${f.key}-${f.label}`} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">
                {f.critical ? "error" : "check_circle"}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface flex flex-wrap items-center gap-1.5">
                  {f.label}
                  {f.critical && (
                    <span className="px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] font-label-sm text-[10px] uppercase">
                      Critical
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[10px]">
                    {f.ask_customer ? "Ask customer" : "On site"}
                  </span>
                </span>
                {f.why && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{f.why}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {triggers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Inspection triggers
          </span>
          {triggers.map((c, i) => (
            <div key={`${c.label}-${i}`} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#D97706] text-[16px] mt-0.5 shrink-0">
                warning_amber
              </span>
              <span className="font-body-sm text-body-sm text-[#92400E]">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {assumptions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Assumptions
          </span>
          {assumptions.map((a, i) => (
            <div key={`${a}-${i}`} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-outline text-[16px] mt-0.5 shrink-0">
                check
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{a}</span>
            </div>
          ))}
        </div>
      )}

      {exclusions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Exclusions
          </span>
          {exclusions.map((x, i) => (
            <div key={`${x}-${i}`} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-outline text-[16px] mt-0.5 shrink-0">
                close
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{x}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fromRow(row: TemplateRow): EditorState {
  const doc = row.document;
  return {
    id: row.id,
    base_type: row.base_type,
    name: row.name,
    blurb: row.blurb ?? "",
    is_default: row.is_default,
    minPhotos: doc.min_photos_for_good_evidence ?? 2,
    fields: (doc.required_fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      critical: f.critical,
      ask_customer: f.ask_customer,
      why: f.why,
    })),
    conditions: (doc.inspection_conditions ?? []).map((c) =>
      c.any_risk_flag
        ? { kind: "risk_flag", riskFlag: c.any_risk_flag[0]!, factKey: "symptoms", label: c.label }
        : { kind: "fact_unknown", riskFlag: "water_damage", factKey: c.any_fact?.[0]?.key ?? "fixture_type", label: c.label },
    ),
    assumptions: [...(doc.assumptions ?? [])],
    exclusions: [...(doc.exclusions ?? [])],
    questions: { ...(doc.questions ?? {}) },
    editingBuiltin: false,
  };
}

function toDocument(state: EditorState): JobTemplate {
  return {
    type: state.base_type,
    label: state.name,
    blurb: state.blurb,
    required_fields: state.fields.map((f) => ({
      key: f.key,
      label: f.label || f.key.replace(/_/g, " "),
      critical: f.critical,
      why: f.why || `Needed to scope the ${state.name.toLowerCase()}.`,
      ask_customer: f.ask_customer,
    })),
    questions: state.questions,
    assumptions: state.assumptions.filter((a) => a.trim()),
    exclusions: state.exclusions.filter((a) => a.trim()),
    inspection_conditions: state.conditions.map((c) =>
      c.kind === "risk_flag"
        ? { any_risk_flag: [c.riskFlag], label: c.label }
        : { any_fact: [{ key: c.factKey, value: "unknown" }], label: c.label },
    ),
    min_photos_for_good_evidence: state.minPhotos,
    message_guidance: "",
  };
}

export function TemplatesManager({
  initialTemplates,
  autoNew = false,
}: {
  initialTemplates: TemplateRow[];
  /** Opened from the enquiry form's "create a new service category" option. */
  autoNew?: boolean;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editor, setEditor] = useState<EditorState | null>(() =>
    autoNew ? newTemplateEditor() : null,
  );
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /**
   * Collapsible cards. Undefined means "use the default": the first three
   * templates are open and everything after them starts collapsed, so the grid
   * never opens as one long wall of text.
   */
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const isCardOpen = (key: string, index: number) => openCards[key] ?? index < 3;
  const toggleCard = (key: string, index: number) =>
    setOpenCards((prev) => ({ ...prev, [key]: !(prev[key] ?? index < 3) }));
  const [viewing, setViewing] = useState<{
    name: string;
    blurb: string;
    baseLabel: string;
    isDefault: boolean;
    doc: JobTemplate;
  } | null>(null);

  function viewBuiltin(base: JobType) {
    const t = JOB_TEMPLATES[base];
    setViewing({
      name: t.label,
      blurb: t.blurb,
      baseLabel: BASE_TYPES.find((b) => b.value === base)!.label,
      isDefault: false,
      doc: t,
    });
  }

  function viewRow(row: TemplateRow) {
    setViewing({
      name: row.name,
      blurb: row.blurb ?? "",
      baseLabel: BASE_TYPES.find((b) => b.value === row.base_type)?.label ?? row.base_type,
      isDefault: row.is_default,
      doc: row.document,
    });
  }

  async function save() {
    if (!editor) return;
    if (editor.name.trim().length < 3) {
      toast.error("Give the template a name (at least 3 characters).");
      return;
    }
    if (editor.fields.length === 0) {
      toast.error("Add at least one required detail for the AI to grade against.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editor.id ? { id: editor.id } : {}),
          base_type: editor.base_type,
          name: editor.name.trim(),
          blurb: editor.blurb.trim(),
          is_default: editor.is_default || editor.editingBuiltin,
          document: toDocument(editor),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the template.");
      toast.success(
        editor.is_default
          ? `Template saved — new ${BASE_TYPES.find((b) => b.value === editor.base_type)?.label} enquiries are now graded against it.`
          : "Template saved.",
      );
      setEditor(null);
      const refreshed = await fetch("/api/templates").then((r) => r.json());
      setTemplates(refreshed.templates ?? []);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the template.");
      toast.success("Template deleted — jobs filed under it fall back to the built-in checklist.");
      setTemplates((t) => t.filter((x) => x.id !== id));
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Full template viewer */}
      {viewing && (
        <div className="fixed inset-0 z-40 bg-[#0B1E2F]/60 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-[760px] max-h-[92vh] flex flex-col bg-[#F8F9F7] rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden">
            <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-start justify-between flex-shrink-0">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#102A43] tracking-tight">{viewing.name}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {viewing.blurb || "Service template"} · {viewing.baseLabel} ·{" "}
                    {viewing.doc.min_photos_for_good_evidence ?? 2}+ photos for good evidence
                    {viewing.isDefault ? " · Default for this job type" : ""}
                  </p>
                </div>
              </div>
              <button
                aria-label="Close"
                onClick={() => setViewing(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>
            <div className="px-6 py-5 overflow-y-auto custom-scroll space-y-6 flex-1">
              {/* Required details */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                  Required details ({viewing.doc.required_fields?.length ?? 0}) — the AI grades against these
                </h3>
                <div className="flex flex-col gap-2">
                  {(viewing.doc.required_fields ?? []).map((f) => (
                    <div key={f.key + f.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#102A43]">{f.label}</span>
                        <div className="flex items-center gap-1.5">
                          {f.critical && (
                            <span className="text-[10px] font-semibold bg-[#FEE2E2] text-[#B91C1C] px-2 py-0.5 rounded uppercase">
                              Critical
                            </span>
                          )}
                          <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">
                            {f.ask_customer ? "Asked to customer" : "Established on site"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{f.why}</p>
                      {viewing.doc.questions?.[f.key] && (
                        <p className="text-[11px] text-teal-700 mt-1 flex items-start gap-1">
                          <span className="material-symbols-outlined text-[13px] mt-0.5">question_answer</span>
                          “{viewing.doc.questions[f.key]}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              {/* Inspection triggers */}
              {(viewing.doc.inspection_conditions?.length ?? 0) > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                    Inspection triggers ({viewing.doc.inspection_conditions?.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {viewing.doc.inspection_conditions!.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#FFFBEB] flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#D97706] text-[18px] shrink-0">
                          warning_amber
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-[#92400E]">{c.label}</p>
                          <p className="text-[11px] text-amber-700">
                            {c.any_risk_flag
                              ? `Trigger: risk flag “${c.any_risk_flag.join(", ").replace(/_/g, " ")}”`
                              : c.any_fact
                                ? `Trigger: ${c.any_fact.map((f) => f.key.replace(/_/g, " ")).join(", ")} unknown`
                                : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Assumptions + exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">Assumptions</h3>
                  {(viewing.doc.assumptions ?? []).map((a, i) => (
                    <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-teal-700 mt-0.5">check</span>
                      {a}
                    </p>
                  ))}
                </section>
                <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">Exclusions</h3>
                  {(viewing.doc.exclusions ?? []).map((a, i) => (
                    <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-slate-400 mt-0.5">close</span>
                      {a}
                    </p>
                  ))}
                </section>
              </div>
            </div>
            <footer className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-slate-400">
                Enquiries filed under this template are analysed exactly to this checklist.
              </span>
              <button
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
                onClick={() => setViewing(null)}
                type="button"
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              fact_check
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Intake checklist &amp; service templates
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              The rules every enquiry is graded against. Edit the built-ins, or create your own —
              new enquiries filed under a template are analysed exactly to its checklist.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="h-10 px-4 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container-low transition-colors disabled:opacity-60"
            onClick={() => setEditor(newTemplateEditor())}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span>
            New template
          </button>
        </div>
      </div>

      {/* Editor (inline panel) */}
      {editor && (
        <div className="bg-surface-container-lowest rounded-xl shadow-md border border-border flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary-container text-[20px]">edit_document</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {editor.id || editor.editingBuiltin ? "Edit template" : "New template"}
              </h2>
              {editor.editingBuiltin && (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  Overrides the built-in
                </span>
              )}
            </div>
            <button
              className="p-1.5 rounded-lg text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
              onClick={() => setEditor(null)}
              aria-label="Close editor"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="px-6 py-5 flex flex-col gap-space-lg max-h-[70vh] overflow-y-auto custom-scroll">
            {/* Basics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">Template name</label>
                <input
                  className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                  type="text"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  placeholder="e.g. Storm-water drain check"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">Base job type</label>
                <div className="relative flex items-center">
                  <select
                    className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                    value={editor.base_type}
                    onChange={(e) => setEditor({ ...editor, base_type: e.target.value as JobType })}
                  >
                    {BASE_TYPES.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-label-md text-label-md text-on-surface-variant">What it covers</label>
                <input
                  className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                  type="text"
                  value={editor.blurb}
                  onChange={(e) => setEditor({ ...editor, blurb: e.target.value })}
                  placeholder="e.g. Blocked storm-water drains, CCTV assessment, boundary trap work"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                  checked={editor.is_default}
                  onChange={(e) => setEditor({ ...editor, is_default: e.target.checked })}
                />
                <span className="font-body-md text-body-md text-on-surface">
                  Default for this base job type
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-on-surface-variant">Photos for good evidence:</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  className="w-16 h-9 px-2 rounded-lg bg-surface-container-lowest text-on-surface font-data-mono text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                  value={editor.minPhotos}
                  onChange={(e) => setEditor({ ...editor, minPhotos: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Required details builder */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Required details (the AI grades against these)
                </span>
                <button
                  className="font-label-sm text-label-sm text-primary hover:underline"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      fields: [
                        ...editor.fields,
                        { key: "location_in_property", label: "", critical: false, ask_customer: true, why: "" },
                      ],
                    })
                  }
                  type="button"
                >
                  + Add required detail
                </button>
              </div>
              {editor.fields.map((field, i) => (
                <div key={i} className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      className="h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 sm:col-span-4"
                      type="text"
                      placeholder="Field label (e.g. Drain location)"
                      value={field.label}
                      onChange={(e) => {
                        const fields = [...editor.fields];
                        fields[i] = { ...field, label: e.target.value };
                        setEditor({ ...editor, fields });
                      }}
                    />
                    <div className="relative sm:col-span-4">
                      <select
                        className="w-full h-9 px-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                        value={field.key}
                        onChange={(e) => {
                          const fields = [...editor.fields];
                          fields[i] = { ...field, key: e.target.value };
                          setEditor({ ...editor, fields });
                        }}
                      >
                        {FACT_KEYS.map((k) => (
                          <option key={k.key} value={k.key}>
                            Maps to: {k.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">
                        expand_more
                      </span>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          checked={field.critical}
                          onChange={(e) => {
                            const fields = [...editor.fields];
                            fields[i] = { ...field, critical: e.target.checked };
                            setEditor({ ...editor, fields });
                          }}
                        />
                        <span className="font-label-sm text-label-sm text-on-surface">Critical</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          checked={field.ask_customer}
                          onChange={(e) => {
                            const fields = [...editor.fields];
                            fields[i] = { ...field, ask_customer: e.target.checked };
                            setEditor({ ...editor, fields });
                          }}
                        />
                        <span className="font-label-sm text-label-sm text-on-surface">Ask customer</span>
                      </label>
                      <button
                        className="ml-auto text-outline hover:text-error transition-colors"
                        onClick={() => setEditor({ ...editor, fields: editor.fields.filter((_, x) => x !== i) })}
                        aria-label="Remove field"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <input
                    className="h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                    type="text"
                    placeholder="Why it matters (shown to the tradie)"
                    value={field.why}
                    onChange={(e) => {
                      const fields = [...editor.fields];
                      fields[i] = { ...field, why: e.target.value };
                      setEditor({ ...editor, fields });
                    }}
                  />
                </div>
              ))}
              {/* Question per field */}
              {editor.fields.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Customer question asked when a detail is missing
                  </span>
                  {editor.fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-12 sm:col-span-3 font-body-sm text-body-sm text-on-surface truncate">
                        {field.label || field.key}
                      </span>
                      <input
                        className="col-span-12 sm:col-span-9 h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                        type="text"
                        placeholder={`e.g. Could you tell us the ${field.label.toLowerCase() || "detail"}?`}
                        value={editor.questions[field.key] ?? ""}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            questions: { ...editor.questions, [field.key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspection triggers builder */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Inspection triggers (force on-site review)
                </span>
                <button
                  className="font-label-sm text-label-sm text-primary hover:underline"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      conditions: [
                        ...editor.conditions,
                        { kind: "risk_flag", riskFlag: RISK_FLAGS[0]!.key, factKey: "fixture_type", label: "" },
                      ],
                    })
                  }
                  type="button"
                >
                  + Add trigger
                </button>
              </div>
              {editor.conditions.map((condition, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#FFFBEB] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="relative sm:col-span-3">
                    <select
                      className="w-full h-9 px-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border appearance-none cursor-pointer"
                      value={condition.kind}
                      onChange={(e) => {
                        const conditions = [...editor.conditions];
                        conditions[i] = { ...condition, kind: e.target.value as ConditionDraft["kind"] };
                        setEditor({ ...editor, conditions });
                      }}
                    >
                      <option value="risk_flag">When risk flag…</option>
                      <option value="fact_unknown">When fact unknown…</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">
                      expand_more
                    </span>
                  </div>
                  {condition.kind === "risk_flag" ? (
                    <div className="relative sm:col-span-4">
                      <select
                        className="w-full h-9 px-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border appearance-none cursor-pointer"
                        value={condition.riskFlag}
                        onChange={(e) => {
                          const conditions = [...editor.conditions];
                          conditions[i] = { ...condition, riskFlag: e.target.value };
                          setEditor({ ...editor, conditions });
                        }}
                      >
                        {RISK_FLAGS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">
                        expand_more
                      </span>
                    </div>
                  ) : (
                    <div className="relative sm:col-span-4">
                      <select
                        className="w-full h-9 px-3 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border appearance-none cursor-pointer"
                        value={condition.factKey}
                        onChange={(e) => {
                          const conditions = [...editor.conditions];
                          conditions[i] = { ...condition, factKey: e.target.value };
                          setEditor({ ...editor, conditions });
                        }}
                      >
                        {FACT_KEYS.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.label} unknown
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">
                        expand_more
                      </span>
                    </div>
                  )}
                  <input
                    className="sm:col-span-4 h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                    type="text"
                    placeholder="Shown as: why inspection is needed"
                    value={condition.label}
                    onChange={(e) => {
                      const conditions = [...editor.conditions];
                      conditions[i] = { ...condition, label: e.target.value };
                      setEditor({ ...editor, conditions });
                    }}
                  />
                  <button
                    className="sm:col-span-1 justify-self-end text-outline hover:text-error transition-colors"
                    onClick={() => setEditor({ ...editor, conditions: editor.conditions.filter((_, x) => x !== i) })}
                    aria-label="Remove trigger"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Assumptions + exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              {(["assumptions", "exclusions"] as const).map((listKey) => (
                <div key={listKey} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      {listKey === "assumptions" ? "Assumptions" : "Exclusions"}
                    </span>
                    <button
                      className="font-label-sm text-label-sm text-primary hover:underline"
                      onClick={() =>
                        setEditor({
                          ...editor,
                          [listKey]: [...editor[listKey], ""],
                        })
                      }
                      type="button"
                    >
                      + Add
                    </button>
                  </div>
                  {editor[listKey].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="flex-1 h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const list = [...editor[listKey]];
                          list[i] = e.target.value;
                          setEditor({ ...editor, [listKey]: list });
                        }}
                      />
                      <button
                        className="text-outline hover:text-error transition-colors"
                        onClick={() =>
                          setEditor({ ...editor, [listKey]: editor[listKey].filter((_, x) => x !== i) })
                        }
                        aria-label={`Remove ${listKey === "assumptions" ? "assumption" : "exclusion"}`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-[#F8F9F7] flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
              Saved templates are used for every new enquiry graded against them.
            </span>
            <div className="flex items-center gap-2">
              <button
                className="h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors"
                onClick={() => setEditor(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 px-5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary transition-colors disabled:opacity-60"
                onClick={save}
                disabled={busy}
                type="button"
              >
                {busy ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template cards */}
      <div data-tour="templates-list" className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Built-ins (editable → saved as overrides) */}
        {BASE_TYPES.map((base, bi) => {
          const overridden = templates.find((t) => t.base_type === base.value && t.is_default);
          const t = JOB_TEMPLATES[base.value];
          const open = isCardOpen(base.value, bi);
          return (
            <div
              key={base.value}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {overridden ? overridden.name : t.label}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Built-in · {t.required_fields.length} required details ·{" "}
                      {t.min_photos_for_good_evidence}+ photos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {overridden && (
                    <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-label-sm text-label-sm whitespace-nowrap">
                      Customised
                    </span>
                  )}
                  <button
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
                    onClick={() => toggleCard(base.value, bi)}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${overridden ? overridden.name : t.label}`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {open ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {/* 3-dot menu */}
                  <div className="relative">
                    <button
                      className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
                      onClick={() => setMenuFor(menuFor === base.value ? null : base.value)}
                      aria-label={`${overridden ? overridden.name : t.label} options`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                    {menuFor === base.value && (
                      <div className="absolute right-0 top-9 w-52 rounded-lg bg-surface-container-lowest shadow-lg border border-border py-1 z-20">
                        <button
                          className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          onClick={() => {
                            setMenuFor(null);
                            if (overridden) viewRow(overridden);
                            else viewBuiltin(base.value);
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] text-outline">visibility</span>
                          View details
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          onClick={() => {
                            setMenuFor(null);
                            setEditor(overridden ? fromRow(overridden) : { ...builtInEditorState(base.value), name: t.label, editingBuiltin: true, is_default: true });
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] text-outline">edit</span>
                          Edit template
                        </button>
                        {overridden && (
                          <button
                            className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                            onClick={() => {
                              setMenuFor(null);
                              void remove(overridden.id);
                            }}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px] text-outline">restart_alt</span>
                            Reset to built-in
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {open && (
                <>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t.blurb}</p>
                  <TemplateDetailPanels doc={overridden ? overridden.document : t} />
                </>
              )}
            </div>
          );
        })}

        {/* Custom templates */}
        {templates
          .filter((t) => !t.is_default || !JOB_TEMPLATES[t.base_type])
          .map((t, ci) => (
            <div
              key={t.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">note_add</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {t.name}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Custom · {t.document.required_fields?.length ?? 0} required details ·{" "}
                      {t.document.min_photos_for_good_evidence ?? 2}+ photos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm whitespace-nowrap">
                    {BASE_TYPES.find((b) => b.value === t.base_type)?.label}
                  </span>
                  <button
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
                    onClick={() => toggleCard(t.id, BASE_TYPES.length + ci)}
                    aria-expanded={isCardOpen(t.id, BASE_TYPES.length + ci)}
                    aria-label={`${isCardOpen(t.id, BASE_TYPES.length + ci) ? "Collapse" : "Expand"} ${t.name}`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isCardOpen(t.id, BASE_TYPES.length + ci) ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {/* 3-dot menu */}
                  <div className="relative">
                    <button
                      className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
                      onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}
                      aria-label={`${t.name} options`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                    {menuFor === t.id && (
                      <div className="absolute right-0 top-9 w-52 rounded-lg bg-surface-container-lowest shadow-lg border border-border py-1 z-20">
                        <button
                          className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          onClick={() => {
                            setMenuFor(null);
                            viewRow(t);
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] text-outline">visibility</span>
                          View details
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          onClick={() => {
                            setMenuFor(null);
                            setEditor(fromRow(t));
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] text-outline">edit</span>
                          Edit template
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          onClick={() => {
                            setMenuFor(null);
                            void remove(t.id);
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] text-outline">delete</span>
                          Delete template
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isCardOpen(t.id, BASE_TYPES.length + ci) && (
                <>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t.blurb || "Custom service template."}
                  </p>
                  <TemplateDetailPanels doc={t.document} />
                </>
              )}
            </div>
          ))}
      </div>

      {/* Guarantee callout */}
      <div className="flex items-center justify-center p-4 rounded-xl bg-surface-container-low text-center">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>
            <strong>Tradie verified:</strong> Templates encode trade judgement — QuoteReady never
            prices work or diagnoses faults on its own.
          </span>
        </div>
      </div>
    </div>
  );
}
