import type { Metadata } from "next";
import Link from "next/link";
import { COMPONENT_WEIGHTS } from "@/lib/rules/readiness";
import { GEMINI_MODEL } from "@/lib/ai/gemini";
import { EMBEDDING_MODEL } from "@/lib/ai/embeddings";
import { SERVICE_NOTES } from "@/lib/ai/service-notes";

export const metadata: Metadata = { title: "How it works" };
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
 * How the decision path is wired — for the operator, and for anyone reviewing
 * the product (mentor, judge, new engineer).
 *
 * This page is deliberately plain: what AI interprets, what deterministic code
 * decides, what a human approves, and why that split was chosen rather than a
 * single "ask the model" pipeline.
 * ──────────────────────────────────────────────────────────────────────────── */

const AI_VS_RULES: Array<{ task: string; owner: "AI" | "RULES" | "HUMAN"; detail: string }> = [
  {
    task: "Reading messy customer text",
    owner: "AI",
    detail: `${GEMINI_MODEL}, one multimodal call, strict JSON validated with Zod`,
  },
  {
    task: "Reading photos as evidence",
    owner: "AI",
    detail: "Certainty-labelled, never decisive on its own",
  },
  {
    task: "Transcribing a spoken site note",
    owner: "AI",
    detail: "ElevenLabs Scribe (scribe_v1) — the only transcription provider",
  },
  {
    task: "Rewording the recommended next step",
    owner: "AI",
    detail: "Wording only; the action type is already decided by rules",
  },
  {
    task: "Retrieving relevant service guidance",
    owner: "AI",
    detail: `${EMBEDDING_MODEL} embeddings over ${SERVICE_NOTES.length} curated playbook notes, cited`,
  },
  { task: "What a job needs to be quotable", owner: "RULES", detail: "Per-type required-field templates" },
  { task: "Readiness score 0–100", owner: "RULES", detail: "Weighted formula, every component visible" },
  {
    task: "Inspection and safety routing",
    owner: "RULES",
    detail: "Deterministic overrides + regex safety patterns on the customer's own words",
  },
  { task: "Build and version the scope pack", owner: "RULES", detail: "Pure function: facts in, reviewable pack out" },
  {
    task: "Approving anything the customer sees",
    owner: "HUMAN",
    detail: "Drafts stay drafts until a licensed operator approves them",
  },
  { task: "Setting prices", owner: "HUMAN", detail: "AI never produces a figure; the operator prices every line" },
];

const OWNER_STYLE: Record<string, string> = {
  AI: "bg-[#E0E7FF] text-[#3730A3]",
  RULES: "bg-[#DCFCE7] text-[#15803D]",
  HUMAN: "bg-[#FEF3C7] text-[#92400E]",
};

const NODES: Array<{ name: string; kind: "ai" | "rules" | "io"; what: string }> = [
  { name: "validate_job_input", kind: "rules", what: "Rejects empty or trivial input before any model call." },
  { name: "extract_job_facts_with_gemini", kind: "ai", what: "Unstructured enquiry + photos → facts, evidence and risk flags. Honest fallback if the API fails." },
  { name: "validate_structured_output", kind: "rules", what: "Zod contract at the model boundary. Malformed output never reaches the engine." },
  { name: "apply_job_template_rules_and_score", kind: "rules", what: "Missing fields, score components, overrides, safety escalation, recommended action." },
  { name: "retrieve_service_guidance", kind: "ai", what: "Vector or keyword search over the curated playbook. Advisory, cited, never decisive." },
  { name: "generate_recommendation_with_ai", kind: "ai", what: "Rewords the action the rules already chose, optionally sharpened by retrieved guidance." },
  { name: "persist_analysis", kind: "io", what: "New scope version + audit event + run telemetry (latency, tokens, cost estimate)." },
];

const KIND_STYLE: Record<string, string> = {
  ai: "border-[#C7D2FE] bg-[#EEF2FF]",
  rules: "border-[#BBF7D0] bg-[#F0FDF4]",
  io: "border-border bg-surface-container-low",
};

export default function HowItWorksPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-margin py-space-lg flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3">
        <span className="font-label-md text-label-md text-primary font-semibold tracking-wider uppercase">
          How it works
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight max-w-4xl">
          The model interprets. The rules decide. You approve.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
          A quote is a commercial commitment made on incomplete information. So the parts of this
          product that can cost money — readiness, inspection routing, safety escalation — are
          deterministic code that anyone can read and test, and the parts that need judgement about
          language are handled by a model whose output is validated before it is trusted.
        </p>
      </header>

      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-space-md">
          Who owns which task
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-low">
              <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-space-md py-3 font-semibold">Task</th>
                <th className="px-space-md py-3 font-semibold">Owner</th>
                <th className="px-space-md py-3 font-semibold">How</th>
              </tr>
            </thead>
            <tbody>
              {AI_VS_RULES.map((row) => (
                <tr key={row.task} className="border-t border-border/60">
                  <td className="px-space-md py-3 font-body-md text-body-md text-on-surface">
                    {row.task}
                  </td>
                  <td className="px-space-md py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${OWNER_STYLE[row.owner]}`}
                    >
                      {row.owner}
                    </span>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-on-surface-variant">
                    {row.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            The analysis graph (LangGraph)
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            One explicit, ordered pipeline. Retrieval and wording run strictly after the rules
            engine, which is what makes &quot;AI cannot change the score&quot; a structural
            property rather than a promise.
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {NODES.map((node, i) => (
            <li
              key={node.name}
              className={`rounded-lg border p-space-md flex flex-col gap-1 ${KIND_STYLE[node.kind]}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data-mono text-label-md text-on-surface font-semibold">
                  {i + 1}. {node.name}
                </span>
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                  {node.kind}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{node.what}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Readiness scoring
          </h2>
          <p className="font-data-mono text-label-md text-on-surface-variant">
            score = {COMPONENT_WEIGHTS.details * 100}%·details + {COMPONENT_WEIGHTS.evidence * 100}
            %·evidence + {COMPONENT_WEIGHTS.access * 100}%·access +{" "}
            {COMPONENT_WEIGHTS.confirmation * 100}%·confirmation + {COMPONENT_WEIGHTS.risk * 100}%
            ·risk
          </p>
          <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <li>Missing critical field → capped at 69.</li>
            <li>Inspection condition or safety pattern → capped at 69, action re-routed.</li>
            <li>Bands: 0–39 needs information · 40–69 inspection recommended · 70–100 ready for estimate.</li>
            <li>Every override is written out in plain English on the scope, with the reason.</li>
          </ul>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Service guidance (retrieval)
          </h2>
          <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <li>
              <strong className="text-on-surface">Corpus in code.</strong>{" "}
              {SERVICE_NOTES.length} curated playbook notes, version-controlled and cited — not a
              scraped document dump.
            </li>
            <li>
              <strong className="text-on-surface">Query from facts only.</strong> The search text is
              built from the structured facts and risk flags, never from the model&apos;s prose or
              the tradie&apos;s spoken words.
            </li>
            <li>
              <strong className="text-on-surface">Vector or keyword.</strong> pgvector cosine search
              when embeddings and the index are available; otherwise the same corpus is ranked
              deterministically and the UI says which tier answered.
            </li>
            <li>
              <strong className="text-on-surface">Guidance is not a decision.</strong> It changes
              wording and what to ask next. Tests assert readiness, bands, overrides and safety
              routing are identical with and without it.
            </li>
          </ul>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            What each run costs
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Every analysis stores its own accounting on the scope version: model, prompt and output
            tokens, end-to-end wall time, per-node wall time, retrieval tier and an estimated spend
            that names the rate card it used. Open any job and the numbers are on the page — no
            separate dashboard, no guessing.
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Cost is always labelled an estimate: tokens come back from the API, the dollars are
            arithmetic on top of a documented rate assumption.
          </p>
        </section>

        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Guardrails that are not negotiable
          </h2>
          <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <li>No diagnosis of faults.</li>
            <li>No price, price range or rate produced by AI.</li>
            <li>No automatic customer message — drafts are approved by a person.</li>
            <li>No safety claim: patterns are routed for professional attention, not assessed.</li>
            <li>No voice cloning; generated audio is labelled as generated.</li>
          </ul>
          <Link
            href="/evaluation"
            className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-primary hover:underline pt-1"
          >
            <span className="material-symbols-outlined text-[16px]">rule_settings</span>
            See the labelled fixtures these guardrails are tested against
          </Link>
        </section>
      </div>
    </div>
  );
}
