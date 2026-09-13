import type { Metadata } from "next";
import Link from "next/link";
import { buildScopePack } from "@/lib/rules/engine";
import { EVALUATION_FIXTURES } from "@/lib/evaluation/fixtures";
import { COMPONENT_WEIGHTS } from "@/lib/rules/readiness";
import { SERVICE_NOTES } from "@/lib/ai/service-notes";

export const metadata: Metadata = { title: "Evaluation" };
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
 * Live evaluation.
 *
 * Every labelled fixture runs through the SAME buildScopePack the production
 * analysis path calls — not a reimplementation, not a mock. If a rule changes
 * and a fixture flips, this page says so, and the same fixtures are asserted in
 * tests/engine.test.ts so CI catches it without anyone opening a browser.
 *
 * Honesty notes are printed on the page: this measures band routing and safety
 * detection on a small curated set. It is not a benchmark of extraction
 * quality, and there is no human-labelled precision/recall figure — because we
 * did not have independent human labels to compute one.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Result {
  id: string;
  name: string;
  job_type: string;
  band: string;
  expected_band: string;
  score: number;
  safety: boolean;
  expected_safety: boolean;
  inspection: boolean;
  pass: boolean;
}

function runFixtures(): { results: Result[]; passed: number } {
  const results = EVALUATION_FIXTURES.map((fixture) => {
    const pack = buildScopePack({
      job_type: fixture.job_type,
      facts: fixture.facts,
      evidence: [],
      model_risk_flags: fixture.model_risk_flags,
      raw_text: fixture.raw_text,
      recommended_questions: [],
      version: 1,
      produced_by: "ai_analysis",
    });
    const bandOk = pack.readiness_band === fixture.expected_band;
    const safetyOk =
      fixture.expected_safety_flag === undefined ||
      pack.safety_flag === fixture.expected_safety_flag;
    const inspectionOk =
      fixture.expected_inspection === undefined ||
      pack.inspection_recommended === fixture.expected_inspection;
    return {
      id: fixture.id,
      name: fixture.name,
      job_type: fixture.job_type,
      band: pack.readiness_band,
      expected_band: fixture.expected_band,
      score: pack.readiness_score,
      safety: pack.safety_flag,
      expected_safety: fixture.expected_safety_flag ?? false,
      inspection: pack.inspection_recommended,
      pass: bandOk && safetyOk && inspectionOk,
    };
  });
  return { results, passed: results.filter((r) => r.pass).length };
}

const BAND_LABEL: Record<string, string> = {
  needs_information: "Needs information",
  inspection_recommended: "Inspection recommended",
  ready_for_estimate: "Ready for estimate",
};

export default function EvaluationPage() {
  const { results, passed } = runFixtures();
  const allPass = passed === results.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-margin py-space-lg flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3">
        <span className="font-label-md text-label-md text-primary font-semibold tracking-wider uppercase">
          Evaluation
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          {passed}/{results.length} labelled fixtures behave exactly as documented
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
          Each fixture is a hand-authored plumbing enquiry with a written-down expected outcome.
          They run through the same deterministic engine the live product uses, and the same
          assertions run in <span className="font-data-mono text-label-md">vitest</span> on every
          commit.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold ${
              allPass ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#92400E]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {allPass ? "check_circle" : "warning"}
            </span>
            {allPass ? "All fixtures pass" : `${results.length - passed} fixture(s) failing`}
          </span>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            How the decision path is wired
          </Link>
        </div>
      </header>

      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-surface-container-low">
              <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-space-md py-3 font-semibold">Fixture</th>
                <th className="px-space-md py-3 font-semibold">Service type</th>
                <th className="px-space-md py-3 font-semibold">Expected</th>
                <th className="px-space-md py-3 font-semibold">Actual</th>
                <th className="px-space-md py-3 font-semibold">Score</th>
                <th className="px-space-md py-3 font-semibold">Safety</th>
                <th className="px-space-md py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="px-space-md py-3">
                    <span className="font-body-md text-body-md text-on-surface font-medium block">
                      {r.name}
                    </span>
                    <span className="font-data-mono text-[11px] text-on-surface-variant">
                      {r.id}
                    </span>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                    {r.job_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                    {BAND_LABEL[r.expected_band]}
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface whitespace-nowrap">
                    {BAND_LABEL[r.band]}
                  </td>
                  <td className="px-space-md py-3 font-data-mono text-label-md text-on-surface-variant">
                    {r.score}
                  </td>
                  <td className="px-space-md py-3">
                    {r.safety ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEE2E2] text-error font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        flagged
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-space-md py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold ${
                        r.pass ? "text-[#15803D]" : "text-error"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {r.pass ? "check" : "close"}
                      </span>
                      {r.pass ? "pass" : "fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            What is being measured
          </h2>
          <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
              Band routing — does this job land on needs-information, inspection or ready?
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
              Safety detection — gas, sewage, overflow and flooding must escalate every time.
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
              Inspection routing — concealed leaks and missing evidence must not be priced.
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
              Retrieval safety — attaching service guidance must not move any of the above.
            </li>
          </ul>
          <p className="font-label-sm text-label-sm text-on-surface-variant pt-1">
            {SERVICE_NOTES.length} curated playbook notes underpin the retrieved guidance, and the
            guidance is advisory by construction — the assertions in the test suite prove guidance
            cannot change a score, a band or a safety flag.
          </p>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Readiness formula
          </h2>
          <p className="font-data-mono text-label-md text-on-surface-variant">
            score = {COMPONENT_WEIGHTS.details * 100}%·details + {COMPONENT_WEIGHTS.evidence * 100}
            %·evidence + {COMPONENT_WEIGHTS.access * 100}%·access +{" "}
            {COMPONENT_WEIGHTS.confirmation * 100}%·confirmation + {COMPONENT_WEIGHTS.risk * 100}%
            ·risk
          </p>
          <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <li>Any missing critical field caps the score at 69.</li>
            <li>Inspection conditions and safety patterns cap the score at 69 and re-route the action.</li>
            <li>Bands: 0–39 needs information · 40–69 inspection recommended · 70–100 ready for estimate.</li>
          </ul>
          <h3 className="font-label-md text-label-md text-on-surface font-semibold pt-2">
            What this does not measure
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Extraction accuracy against independent human labels, and real-world quote outcomes.
            Both need data we do not have at hackathon scale. The 10 fixtures are a guard against
            rule regressions, and we say so rather than quoting a precision figure we cannot
            support.
          </p>
        </section>
      </div>
    </div>
  );
}
