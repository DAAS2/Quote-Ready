# QuoteReady — 3–5 minute demo script

**Target runtime: 4:20.** Hard ceiling 5:00. Read at a relaxed pace (~140 wpm); the narration below is ~640 words, which lands at 4:20–4:40 depending on how much you pause while clicking.

Everything in this script is a feature you can actually show. Nothing here is promised that the app does not do — the rubric penalises unverified claims, and one of the judges works on retrieval and evaluation for a living.

---

## 0. Pre-flight (do this 10 minutes before you hit record)

| Check | Why |
|---|---|
| `DEMO_MODE` is **not** set to `true` (or remove it) | You want the live Gemini path on camera; `DEMO_MODE=true` forces the deterministic path |
| You are on the **deployed** URL, signed out (incognito) | Anonymous visitors get the seeded demo workspace |
| Supabase migration `0006_service_notes.sql` has been pushed | Otherwise guidance says "keyword match" instead of "vector match" — both are honest, but the vector tier is the story |
| `GOOGLE_GENERATIVE_AI_API_KEY` and `ELEVENLABS_API_KEY` are set in Vercel | Live extraction, live embeddings, live Scribe |
| One successful analysis already run today | Two reasons: proves the path works, and the seeded jobs already show guidance + telemetry |
| Browser at **110–125% zoom**, 1440×900 window, hide bookmarks bar | Text in the recording must be legible |
| Notifications off, other tabs closed | Nothing worse than a Slack popup at minute 2 |
| Have the site-note transcript copied to your clipboard | Paste it instead of recording live audio (see §5) |

**Tabs open:** (1) landing page, (2) dashboard, (3) Jordan's job detail, (4) `/evaluation`.

**The transcript to paste for the voice note** (beats 6):

> I inspected Jordan's bathroom tap. It is a corroded mixer tap. The isolation valve is accessible, but the cabinet base is damp. I cannot rule out a concealed leak, so book an inspection before providing a fixed price.

**The enquiry text for beat 8** (if you show intake live, keep it short):

> Kitchen mixer is dripping and the cupboard under the sink smells damp. Not sure of the brand.

---

## 1. The script

### 0:00–0:22 — Problem and user *(C1: problem significance)*

**On screen:** landing page, hero visible.

> "This is QuoteReady. I built it for owner-operators of small plumbing businesses in Melbourne — the two-to-eight person crews where the owner is still quoting jobs between jobs.
>
> Here's their problem. A customer texts a photo and one sentence: 'my tap's leaking.' That has to become a fixed price. But the tap might be a corroded mixer, the isolation valve might be seized, the cabinet might be damp — and if you find that out *after* you've promised a price, you've underquoted the job and eaten the difference."

### 0:22–0:50 — Solution, and land the workflow *(A1: functionality)*

**Click:** *Open live demo* → dashboard.

> "QuoteReady is the step before the quote. It turns that vague enquiry into a structured scope that says exactly what's known, what's missing, what's unsafe, and whether someone needs to look at it before anyone commits to a number.
>
> The workspace is seeded with realistic Melbourne plumbing enquiries — here's Jordan's leaking tap. Vague text, two photos."

### 0:50–1:30 — The scope pack, and who actually decides *(A2: technical difficulty · A4: model choice)*

**Click:** open Jordan's job. Hover the readiness ring, then the components. Click *Why this recommendation*.

> "This is the output. A readiness score, and every component of it visible — details, evidence, access, confirmation, risk.
>
> Here's the part that matters architecturally. The model did **not** decide this. Gemini 3.6 Flash read the text and the photos and produced structured facts, evidence and risk signals — validated against a Zod schema, so malformed output never reaches the engine. Then a deterministic rules engine scores it. Twenty-five percent details, twenty-five evidence, twenty access, fifteen confirmation, fifteen risk. A missing critical field caps the score at sixty-nine. A safety pattern caps it and re-routes the action.
>
> Why split it that way? Because a quote is a commercial commitment made on incomplete information. I want the score to be the same every single time, readable by a tradie, and testable in CI. The model interprets; the rules decide."

### 1:30–2:00 — Retrieval: guidance, cited *(A2: RAG / embeddings / vector search · B2)*

**Scroll to:** the *Service guidance — matched from the service playbook* card.

> "Next, retrieval. These are playbook notes matched to *this* job's facts — the corroded body note, the damp cabinetry note — each one cited with its reference and the signals that matched it.
>
> Under the hood: forty-six curated trade notes, each embedded with Gemini's embedding model into 768 dimensions and stored in pgvector inside the same Postgres as the jobs — cosine similarity, HNSW index, one database to back up. The query is built from the *structured facts only*, never from the model's prose.
>
> And here's the design rule: retrieval never touches the decision. There's a test that runs every fixture with and without guidance attached and asserts the score, the band, the overrides and the safety flag are identical. Guidance shapes wording and what to ask next. It does not get a vote."

### 2:00–2:28 — Human approval *(C2: safeguards · A1)*

**Click:** *Draft customer follow-up* → show the draft → *Save draft* / approve.

> "When something goes to a customer, a person decides. This draft asks only the questions the customer can actually answer — and it's generated deterministically from the missing fields, not written by a model, so it can't invent a claim or offer a price.
>
> Nothing sends. Drafts stay drafts until an operator approves them, and the approval is on the audit trail."

### 2:28–3:15 — ElevenLabs: the field workflow *(ElevenLabs special track — this is the beat that earns it)*

**Click:** *Record site note* → paste the transcript into the transcript box → *Extract update* → show **what changed** → *Apply update to job*.

> "Tradies on tools don't fill in forms. So a site note is voice. You can record it — or paste the transcript, which is what I'm doing for the recording.
>
> That transcript went to ElevenLabs Scribe, which is the **only** transcription provider in this codebase. Then Gemini turned it into a structured update: fixture, isolation access, damp cabinet, concealed-leak risk.
>
> Look at what changed. Fixture identified as a corroded mixer. Cabinet base damp. And now the recommendation flips — inspection required before a fixed price. Notice the guidance re-ran against the *new* facts, so the playbook advice updated too, and the readiness score moved. New scope version, full audit trail.
>
> If you removed ElevenLabs, this workflow doesn't exist — a tradie on a ladder has no keyboard. That's why this is a core dependency, not a feature bolted on."

### 3:15–3:40 — Safety, and the quote *(C2 · C3: value)*

**Click:** Sam's job (hot water + smell) → point at the escalation. Then Jordan's job → *Prepare quote* → show unpriced line items.

> "This one matters. Sam's hot water unit has a smell — that matches a safety pattern in the raw customer text, not the model's paraphrase. The estimate path is gated and it says so, in plain language, without pretending to be a gas assessment.
>
> And when a job *is* ready: the quote. The model proposes the line items — unpriced. Every figure on this document is typed by the operator. There is no price field anywhere in the AI's schema. It exports as .docx or PDF."

### 3:40–4:05 — Evidence: evaluation, latency, cost *(A4: evaluation · A3)*

**Click:** `/evaluation`.

> "So how do I know it works? Ten labelled fixtures — hand-written plumbing enquiries with expected outcomes — run through the *same* engine the product uses, live on this page and asserted in the test suite. Ninety-one tests, ninety-six percent statement coverage on the decision layer.
>
> And every run reports its own cost. On the job page: analysed in about twenty seconds, roughly nine thousand input tokens, about a cent. That's the whole architecture in one line — the model call is the expensive part, which is why the deterministic engine is the part that decides."

### 4:05–4:20 — Close *(B1 · B3: differentiation)*

> "QuoteReady isn't an AI receptionist or a generic quoting tool. It's the readiness step that sits before a price — the missing-detail checklist, the safety routing, and the evidence trail that stops a tradie committing to a number they can't defend.
>
> AI interprets. Rules decide. Humans approve. Thanks for watching."

---

## 2. Shot list (click map)

| # | Where | Action | Must be visible |
|---|---|---|---|
| 1 | `/` | Scroll hero slowly | Product name, one-line value prop |
| 2 | `/dashboard` | Hover the job rows | Seeded jobs, readiness chips, safety badge |
| 3 | `/jobs/[jordan]` | Scroll the scope pack top to bottom | Readiness ring + components, known facts, missing fields, evidence sources |
| 4 | same | Open *Why this recommendation* | Override reasons in English |
| 5 | same | Scroll to *Service guidance* | 2–3 cited notes, reference codes, match signals, "vector match" badge |
| 6 | same | *Draft customer follow-up* | Draft body, field requests, approve |
| 7 | same | *Record site note* → paste → *Extract update* | "Transcribed", extracted facts, **what changed** panel |
| 8 | same | *Apply update to job* | New version number, score delta, guidance refresh, "Site note applied" banner |
| 9 | `/jobs/[sam]` | Point at the safety card | Safety escalation, estimate gated |
| 10 | `/jobs/[jordan]` | *Prepare quote* | Unpriced line items, AI-drafted label, download buttons |
| 11 | `/evaluation` | Scroll the table | 10 fixtures, expected vs actual, all passing |
| 12 | `/jobs/[jordan]` | Point at the telemetry chip | "Analysed in … tokens · est. $" + retrieval tier |

---

## 3. Fallbacks (rehearse these once)

| If this happens | Do this | Say this |
|---|---|---|
| Gemini is slow or rate-limited mid-record | Let it run — the *loading* state is on camera and looks competent. If it fails, the app silently uses the deterministic engine | "Live models can fail; that's why the rules engine is the fallback, not the other way round." |
| Autoplay/hero video stutters on the landing page | Skip beat 1, start on the dashboard | — |
| Microphone permission blocks Scribe | Paste the transcript (already the plan) | "I'm pasting the transcript here — Scribe produced it from the recording." |
| The vector index is unavailable (no key / migration) | Keep going; the badge reads "keyword match" | "Retrieval falls back to deterministic keyword ranking over the same corpus — same citations, no key required." |
| A job has no guidance (older version) | Don't show it — use a job you ran today | — |
| Total network death | Flip `DEMO_MODE=true`, replay, and say the session is running the deterministic path | "This is the offline path the product falls back to." |

Never claim: a price, a diagnosis, an accuracy percentage you can't show, or a metric you didn't read off the screen.

---

## 4. Finals-only: extended "how it works" (60–90 s, after the live demo)

Use this only at Closing Night, and only after the working demo.

> "The whole system is seven nodes in a LangGraph state machine, and the order is the architecture.
>
> First, validation. Then one multimodal Gemini call — text plus photos in a single request, JSON mode, low temperature, a closed risk vocabulary, and a hard rule in the system prompt: extract only what the customer actually provided, never invent a value, tag every claim with its source. That output is treated as untrusted input and validated against a Zod schema before anything else sees it.
>
> Then the deterministic engine — and this is the only thing that can set a score, route an inspection, or escalate safety. Safety patterns run over the customer's *own words*, not the model's paraphrase, because paraphrase is where a gas smell can become 'an odour'.
>
> Then retrieval: pgvector cosine search over a curated corpus, cited back to the operator, isolated by tests from every decision.
>
> Then the model writes the operator-facing wording for a decision it did not make, and everything is persisted as a new version with an audit event, per-node latency and token accounting.
>
> Latency is dominated by the model call — around fifteen of the twenty seconds. Cost is about a cent per enquiry at Flash pricing, and zero when the deterministic path runs. That's the tradeoff I chose deliberately: spend the model where judgement about language is needed, and never spend it where the answer has to be identical every time."

---

## 5. Judge Q&A preparation

Short, specific, honest. Admitting a limitation scores better than bluffing.

1. **Why Flash and not Pro?** One multimodal call per enquiry keeps cost near a cent and latency near 20 s; Pro would buy marginal extraction gains on short enquiries at multiples of both. Upgrading is a one-line model constant.
2. **How did you evaluate it?** Ten hand-authored fixtures with written expected outcomes, asserted in Vitest and rendered live at `/evaluation`; 91 tests, 96% statement coverage on the decision layer. Not a benchmark — a regression guard, and I say so.
3. **What about extraction accuracy vs human labels?** Not measured. I'd need a labelled set of real enquiries; at hackathon scale I'd rather state that than invent a precision figure.
4. **What happens when the model is wrong?** Three layers: schema validation rejects malformed output; the rules engine can't produce a score the model influences; and nothing customer-facing is sent without operator approval. Wrong facts degrade into wrong *questions asked*, not wrong prices.
5. **Is the model ever able to change a safety decision?** No. Safety patterns run over raw customer text in pure code, before retrieval and before the wording step. There is a test asserting a safety-flagged job's score, band and action don't move when guidance is attached.
6. **Why not let the LLM decide readiness?** Because it isn't reproducible: the same enquiry would score differently on Tuesday, and a tradie can't audit a number they can't reason about. Rules are also reviewable in a pull request.
7. **Is RAG actually necessary here?** For the product, no — the app works without it. It exists because fixed per-service-type guidance gives a 2-year-old mixer and a 15-year-old corroded mixer identical advice. Retrieval makes guidance respond to the facts, with citations.
8. **Data quality of the corpus?** 46 notes written for this product, version-controlled, referenced (QR-PB-001…067), tagged with the fact vocabulary that retrieves them, and hashed so the index only re-embeds what changed.
9. **Biggest limitation?** Three service types. The engine is template-driven so new trades are data rather than code, but the templates themselves are the work.
10. **Who pays, and what would production need?** Owner-operators or the office admin in a 2–8 person crew; priced per seat or per job. Production needs real intake integrations (web form, SMS, email), multi-tenant auth/RLS — the schema already has it — and a review workflow before guidance influences checklists.
11. **Cost to operate at scale?** About a cent of model spend per analysed enquiry, plus Postgres and storage; embeddings are a one-off per corpus change. 1,000 enquiries a month is a few dollars of inference.
12. **What's the honest gap versus a full quote tool?** QuoteReady deliberately doesn't price. Operator-entered pricing is on the document by design, so the AI never owns a commercial commitment.

---

## 6. Scoring map (for your own confidence)

| Beat | Rubric it targets |
|---|---|
| 0:00–0:22 user + cost of the failure | C1 problem significance (8) |
| 0:22–0:50 one complete end-to-end workflow | A1 functionality (10) |
| 0:50–1:30 rules vs AI split, Zod contract | A2 technical difficulty (8), A4 model choice (6) |
| 1:30–2:00 embeddings, pgvector, citations, isolation tests | A2, A4, B2 creative solution design (8) |
| 2:00–2:28 human approval, audit trail | C2 feasibility/safeguards (8) |
| 2:28–3:15 voice → structured evidence → new version | **ElevenLabs special track**, B2 |
| 3:15–3:40 safety routing + operator-priced quote | A1, C2, C3 impact (9) |
| 3:40–4:05 fixtures, tests, live latency + cost | A4, A3 code quality (6) |
| 4:05–4:20 "the readiness step before a price" | B1 originality (10), B3 differentiation (7) |
