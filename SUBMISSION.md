# QuoteReady — Submission

Everything needed for the Devpost submission: track declaration, the description copy, the value proposition, differentiation, feasibility, and the ten selection questions answered in one sentence each.

---

## 1. Track declaration

> **Main track: Track 1 — Improve an Existing Business Capability**
> **Special track: Built With ElevenLabs**

**Track 1 justification.** Small trade businesses *already* qualify leads, collect job details, clarify scope, decide whether to inspect, and prepare quotes. QuoteReady does not invent a new business activity — it takes that existing capability and makes it dramatically better by inserting the step that is currently missing: a structured, evidence-backed **readiness assessment before a price is committed**.

**ElevenLabs special-track justification.** Remove ElevenLabs and the product loses a core workflow. Tradies work with wet hands on ladders and under sinks; a keyboard is not available at the moment new information appears. Scribe turns a spoken field note into **structured evidence** that creates a new scope version, re-runs retrieval against the new facts, and **can change the recommended action** — a concealed-leak risk flips a job from quotable to "inspection required". ElevenLabs is the only way that information enters the system from the field, and it is the only transcription provider in the codebase. TTS additionally reads a pre-call briefing so the operator arrives at the phone already holding the known facts.

---

## 2. Project description (Devpost copy)

**QuoteReady — know what you need before you quote.**

**The problem.** A customer texts a photo and one sentence: *"my tap's leaking."* That has to become a fixed price. But the tap might be a corroded mixer, the isolation valve might be seized, and the cabinet base might be damp — and if the tradie discovers that *after* promising a price, they have underquoted the job and eat the difference. For a 2–8 person plumbing business in Melbourne, where the owner still quotes jobs between jobs, this is the difference between margin and a free visit.

**The solution.** QuoteReady is the step before the quote. It turns a vague enquiry into a structured **scope pack** that states exactly what is known, what is missing, what is assumed, what is unsafe, and whether someone needs to stand in front of the job before anyone commits to a number.

**How it works, end to end.** A customer enquiry (text, or a photo set, or a spoken field note) enters. One multimodal Gemini call extracts structured facts, evidence with sources and certainty, and risk signals. A Zod schema validates that output at the boundary, so malformed model output never reaches the engine. A **deterministic rules engine** — not the model — computes the readiness score, the missing critical fields, the inspection conditions, and the safety escalation, using safety patterns matched against the customer's own words. Retrieval then selects the most relevant notes from a 46-note curated trade playbook using pgvector cosine search over Gemini embeddings, returned **with citations** and the signals that matched. The model rewords the already-decided next step in operator language. Everything is versioned, audited, timed, and costed. A human approves anything customer-facing. The quote is operator-priced; the AI proposes unpriced line items only.

**The architectural line that defines the product:** AI interprets, deterministic rules decide, retrieval only informs wording, and a human approves. The model cannot change the score because there is no code path by which it could — retrieval and wording run strictly after the decision node.

---

## 3. The ten selection questions, answered

| # | Question | Answer |
|---|---|---|
| 1 | **Who is the exact target user?** | Owner-operators of small residential plumbing businesses in Melbourne — 2–8 person crews where the owner still quotes jobs between jobs. |
| 2 | **What painful business problem do they have now?** | They must commit a fixed price from fragmented, incomplete information (a text, two photos, a rushed call), with no structured check of what is actually missing. |
| 3 | **How do they currently handle it?** | Read the message, hunt the photos, call the customer back, hold it all in their head, and quote from experience — manually, inconsistently, and in the owner's head only. |
| 4 | **What does it cost them?** | Underquoted jobs (margin lost on the visit), second trips and requotes, scope disputes over concealed moisture or seized valves, response times measured in hours so leads go cold, and scope knowledge that leaves with the owner. |
| 5 | **What exact AI/technical workflow changes that outcome?** | Multimodal Gemini extraction → Zod validation → deterministic scoring and safety routing → cited pgvector retrieval → AI wording → human approval. The model reads the mess; the rules own the decision. |
| 6 | **What does the end-to-end journey look like?** | Enquiry arrives → analysis runs (~21 s) → scope pack shows known/missing/assumed/unsafe → operator reviews cited guidance → drafts and approves a follow-up → a spoken site note adds field evidence as a new version → the recommendation updates → an operator-priced quote is exported as .docx/.pdf → full audit trail. |
| 7 | **Why is AI required rather than a form or rules alone?** | The input is natural language and photographs, and the same fault is described a hundred different ways. A form cannot read "the tap's dripping and the cupboard smells damp"; a rules engine cannot extract a fixture type from a photo. But a model also cannot be trusted to own a commercial decision — hence both. |
| 8 | **What makes it different from alternatives?** | It is not an AI receptionist, a CRM, a job-management tool, a pricing engine, or a generic "upload a PDF and ask questions" wrapper. It occupies the specific gap those tools leave open: **scope readiness before a price is committed**, with the missing information made explicit and the safety routing done on the customer's own words. |
| 9 | **What human controls, safety boundaries and limitations exist?** | Nothing sends without explicit approval; no price field exists in any AI schema; safety patterns run in pure code over raw customer text upstream of every model call; scopes are versioned and auditable; retrieval is advisory and provably cannot alter a decision (asserted in tests); and the known limitations — three trade types, no extraction-accuracy benchmark, advisory rather than blocking — are documented in the README and EVALUATION.md. |
| 10 | **What credible value does it create, and how does it become a real product?** | A qualification step that runs in ~21 s for ~a cent, producing a reviewable artifact where today there is a phone call and a guess. Path to product: per-seat or per-job SaaS for trade businesses, starting with plumbing templates, then expanding by trade (the engine is template-driven, so new trades are data, not code), with intake integrations (web form, SMS, email) and multi-tenant auth — the schema already carries the RLS model. |

---

## 4. Differentiation, precisely

| Alternative | What it does | Why QuoteReady is different |
|---|---|---|
| AI receptionist / answering service | Answers the phone and takes a message | It does not assess whether the job is *quotable*. QuoteReady's output is a readiness decision, not a transcript. |
| Generic AI quoting tool | Generates a price from a description | Price generation from incomplete information is precisely the failure mode QuoteReady exists to prevent. It has no price field in its AI schema. |
| Job management / field service CRM | Stores and schedules jobs | Assumes scope is already known. QuoteReady is the step that makes scope knowable, and it produces the evidence trail the CRM then holds. |
| Generic RAG chatbot over trade documents | Answers questions about plumbing | Retrieval here is not a chatbot surface: it is a cited, advisory input to a decision the rules already made, and tests assert it cannot change that decision. |
| Photo-estimation apps | Sends a photo, gets a ballpark | Ballparks without scope clarity still underquote. QuoteReady tells you what you *cannot* know yet, which is the more valuable answer. |

**The one-sentence difference:** QuoteReady is the readiness step that sits before a price — the missing-detail checklist, the safety routing, and the evidence trail that stops a tradie committing to a number they cannot defend.

---

## 5. Value proposition

| Beneficiary | Effect | Basis |
|---|---|---|
| The trade business | Fewer underquoted jobs — scope gaps surface before a number is committed, not on site | Mechanism: critical-field caps and inspection conditions gate the "ready for estimate" band |
| The trade business | Less unproductive travel and requoting | Mechanism: jobs with missing access or evidence detail are routed to "needs information" instead of being quoted blindly |
| The business owner | Scope knowledge becomes a reviewable artifact instead of living in one person's head | Mechanism: versioned scope packs shared across the workspace |
| The office/admin staff | Can qualify a lead confidently without the owner's experience | Mechanism: template-driven required fields per job type, plus cited playbook guidance |
| The customer | Clearer expectations — what is known, what is assumed, what still needs to be checked | Mechanism: the agent-approvable follow-up asks only the questions the customer can actually answer |
| Risk | Safety patterns escalate hazards on the customer's own words, before any paraphrase | Mechanism: pure-code regex over raw customer text, upstream of every model call |

**Semi-quantified, with its assumptions stated.** One analysis costs approximately **$0.0127** in model spend and takes **~21.5 s** end-to-end, of which the deterministic decision takes **2 ms**. A tradie currently spending 10–20 minutes qualifying and chasing detail on an enquiry replaces that with a review of a pre-built scope pack — so at even 1,000 enquiries a month the inference cost is a few dollars against a materially larger saving in owner time and avoided re-visits. **These are assumptions about usage volume, not measured outcomes;** whether underquoting actually falls requires deployed usage and a before/after cohort, which is stated as future evaluation in [EVALUATION.md](./EVALUATION.md).

---

## 6. Feasibility and viability

**Who pays.** The owner-operator or the office admin in a 2–8 person residential trade crew. Pricing model: per seat, or per job analysed. The buyer is the person whose margin is exposed by an underquote.

**What production needs:**

| Requirement | Status |
|---|---|
| Persistence with tenant isolation | Schema exists (RLS, 24 membership policies across 9 tenant tables) |
| Durable orchestration for long analyses | Would move to a queue with per-node retry (runs in-process today) |
| Intake integrations (web form, SMS, email) | Not built — currently manual entry plus an ElevenLabs spoken-enquiry path |
| Route-level session authentication | **Not built** — the largest gap, documented in [SECURITY.md](./SECURITY.md) |
| Per-tenant spend caps and rate limiting | Not built; the per-call cost figure needed to enforce one is already produced |
| Extraction accuracy benchmark | Not measured; needs a labelled set of real enquiries |
| Review workflow so guidance can influence checklists | Not built; retrieval is deliberately advisory-only today |

**Regulatory and domain constraints, acknowledged:**

- **No pricing, no diagnosis, no binding quotes**, by design and enforced by schema — this keeps the product on the right side of the licensed-professional boundary.
- **Personal information** (customer names, phone numbers, enquiry text, property photos) is processed, and enquiry content is sent to third-party AI processors (Google Gemini, ElevenLabs) on the live path. A production deployment needs a privacy notice, a lawful basis, DPAs with both processors, retention limits on evidence, and a per-tenant switch to disable the live AI path. `DEMO_MODE` already proves the pipeline runs with no external call.
- **Safety escalation copy** routes work to the appropriate professional process and explicitly states it is not an assessment. It does not say "safe" or "unsafe".

**MVP vs production, stated plainly.** The MVP proves one complete end-to-end workflow for three plumbing job types, with real persistence, real retrieval, real voice input, real approvals and a real audit trail. It is not a production multi-tenant SaaS, and this document does not claim it is.

---

## 7. Submission checklist

| Requirement | Status |
|---|---|
| Track named in the description | ✅ §1 above |
| ElevenLabs special track stated with justification | ✅ §1 |
| Public repository, accessible without approval | ✅ |
| README with product pitch, problem, target user, flow, architecture, model/data reasoning, safety, setup, `.env.example`, evaluation, limits | ✅ [README.md](./README.md) |
| Architecture diagram | ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Evaluation documented, including what is *not* measured | ✅ [EVALUATION.md](./EVALUATION.md) |
| Security and privacy boundaries documented honestly | ✅ [SECURITY.md](./SECURITY.md) |
| No credentials committed | ✅ `.env*` ignored; only empty placeholders in `.env.example` |
| Production URL | https://quote-ready-app.vercel.app |
| 3–5 minute functional demo video | Script, shot list, fallbacks and Q&A in [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) |
| Tests and quality gate pass | `npm run check` — 91 tests, lint, typecheck |

---

## 8. ElevenLabs usage, in the required form

> ElevenLabs is core to the **field-update workflow**. It enables a tradie to speak a site observation instead of typing one, and that voice interaction directly changes the product's core data and decision: Scribe's transcript becomes structured facts, those facts create a new scope version, retrieval re-runs against the new facts, and the recommended action **changes** — for example, a concealed-leak risk moves a job from "ready for estimate" to "inspection required before a fixed price".

**If ElevenLabs were removed, would the product lose a meaningful part of its core workflow?** Yes. The moment where new field information enters the system would become a manual typing exercise that does not happen on a ladder with wet hands — and it is the only transcription provider in the codebase, so there is no redundant path.

**Models used:** `scribe_v1` for speech-to-text; `eleven_multilingual_v2` for pre-call briefing TTS. Generated audio is labelled as generated; no voice cloning.
