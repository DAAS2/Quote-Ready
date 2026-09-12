import type { Metadata } from "next";
import Link from "next/link";
import { JOB_TEMPLATES } from "@/lib/rules/job-templates";
import { SAFETY_PATTERNS } from "@/lib/rules/job-templates";

export const metadata: Metadata = { title: "Intake checklist & templates" };

const TEMPLATES = Object.values(JOB_TEMPLATES);

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
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
              The deterministic rules every enquiry is checked against — required details, inspection
              triggers and exclusions per job type.
            </p>
          </div>
        </div>
        <Link
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all"
          href="/jobs/new"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>New enquiry</span>
        </Link>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {TEMPLATES.map((t) => (
          <div
            key={t.type}
            className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {t.label}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t.min_photos_for_good_evidence}+ photo
                    {t.min_photos_for_good_evidence === 1 ? "" : "s"} for good evidence
                  </span>
                </div>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">{t.blurb}</p>

            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Required details
              </span>
              {t.required_fields.map((f) => (
                <div
                  key={f.key}
                  className="p-2.5 rounded-lg bg-surface-container-low flex items-start justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface">{f.label}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{f.why}</span>
                  </div>
                  {f.critical && (
                    <span className="px-2 py-0.5 rounded bg-error-container/60 text-on-error-container font-label-sm text-label-sm whitespace-nowrap h-fit">
                      Critical
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Inspection triggers
              </span>
              {t.inspection_conditions.map((c) => (
                <div key={c.label} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FFFBEB]">
                  <span className="material-symbols-outlined text-[#D97706] text-[18px] shrink-0">
                    warning_amber
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{c.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Assumptions
              </span>
              {t.assumptions.map((a) => (
                <span key={a} className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-outline text-[14px] mt-0.5">check</span>
                  {a}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Exclusions
              </span>
              {t.exclusions.map((a) => (
                <span key={a} className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-outline text-[14px] mt-0.5">close</span>
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Safety patterns card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-error-container/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-[20px]">emergency</span>
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Safety patterns — estimate paths blocked instantly
            </h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Any customer wording below overrides the readiness score and forces human attention.
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SAFETY_PATTERNS.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/30 font-body-sm text-body-sm text-on-surface"
            >
              <span className="material-symbols-outlined text-error text-[16px]">report</span>
              {p.label}
            </div>
          ))}
        </div>
      </div>

      {/* Guarantee callout */}
      <div className="flex items-center justify-center p-4 rounded-xl bg-surface-container-low text-center">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>
            <strong>Plumber verified:</strong> Templates encode trade judgement — QuoteReady never
            prices work or diagnoses faults on its own.
          </span>
        </div>
      </div>
    </div>
  );
}
