# QuoteReady — Architecture

> **The one-sentence version:** AI interprets, deterministic rules decide, retrieval only informs wording, and a human approves anything customer-facing.

Everything below exists to make that sentence structurally true rather than a promise. Where a design choice trades convenience for auditability, the reasoning is written down — because "why is it built that way" is the question that separates a demo from a product.

---

## 1. The problem shape, and why it dictates the architecture

A tradie is asked to commit a fixed price to a job described by one sentence and two photos. The information needed to price it is *partially present, partially absent, and partially unknowable without a site visit*. Three properties follow:

1. **Language is the input, so a model must read it.** Text plus photos, unstructured, inconsistent, sometimes contradictory.
2. **The output is a commercial commitment, so the decision cannot be a model's.** The same enquiry must produce the same assessment on Tuesday as it did on Monday, and it must be reviewable by the person who owns the risk.
3. **Some missing information is a safety question, not a pricing question.** A smell near a hot water unit is not a data-quality problem.

Those three properties map directly onto three architectural layers: an **AI interpretation layer**, a **deterministic decision layer**, and a **human approval layer**. The rest of the system is plumbing that keeps them separated.

---

## 2. Layer map

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION — Next.js 16 App Router, React 19 server components          │
│   landing · dashboard · jobs/[id] scope pack · messages · templates       │
│   evaluation · how-it-works                                              │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ server components read; route handlers mutate
┌───────────────────────────▼──────────────────────────────────────────────┐
│ APPLICATION — app/api/jobs/*, app/api/intake/*, app/api/quotes/*          │
│   analyse · voice-note(transcribe|preview|apply|audio) · message-draft    │
│   (+approve) · quote · inspect · briefing · quotes/[id]/download         │
│   Every handler: parse → validate → call lib → persist → return           │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│ WORKFLOW — LangGraph state machine (lib/workflow)                         │
│   7 ordered nodes. The ordering IS the safety property.                   │
└───────┬───────────────────┬───────────────────────┬──────────────────────┘
        │                   │                       │
┌───────▼─────────┐ ┌───────▼─────────┐ ┌───────────▼──────────────────────┐
│ AI (lib/ai)     │ │ RULES (lib/rules)│ │ PERSISTENCE (lib/data)           │
│ gemini · prompts│ │ engine · readiness│ │ supabase store · memory store    │
│ schemas (Zod)   │ │ job-templates    │ │ unified facade w/ fallback       │
│ retrieval       │ │ risk-overrides   │ │ quotes · audit · versions        │
│ service-notes   │ │ diff · messages  │ │                                  │
│ embeddings      │ │ template-resolve │ │ Supabase Postgres + Storage      │
│ pricing · voice │ │ status           │ │ pgvector for the note index      │
│ elevenlabs/     │ │ (pure, no AI)    │ │                                  │
└─────────────────┘ └──────────────────┘ └──────────────────────────────────┘
```

**Dependency rule:** `lib/rules` imports nothing from `lib/ai`. The decision layer cannot be influenced by a model because it has no reference to one — a compile-time guarantee, not a convention.

---

## 3. The analysis pipeline, node by node

`lib/workflow/quote-ready-graph.ts` — one explicit linear graph. Not a multi-agent swarm; a deliberate sequence where each node has one job and a failure mode you can name.

| # | Node | Kind | Responsibility | Failure behaviour |
|---|---|---|---|---|
| 1 | `validate_job_input` | rules | Reject empty/trivial input before any spend. Starts the run clock. | Returns early; no model call, no cost |
| 2 | `extract_job_facts_with_gemini` | **AI** | One multimodal call: facts, evidence with sources + certainty, risk flags | Falls back to deterministic extraction from the raw text — never fabricates a fact |
| 3 | `validate_structured_output` | rules | Zod parse of the model's JSON | Malformed output is discarded; the deterministic facts stand |
| 4 | `apply_job_template_rules_and_score` | **rules** | Score, missing fields, overrides, safety escalation, recommended action | Pure, total, cannot throw on valid input |
| 5 | `retrieve_service_guidance` | AI | Vector/keyword retrieval over the 46-note playbook | Degrades to the lexical tier over the same corpus |
| 6 | `generate_recommendation_with_ai` | AI | Reword the *already-decided* action in operator language | Falls back to the template sentence |
| 7 | `persist_analysis` | io | New scope version + audit event + run telemetry | Memory-store fallback |

**Why this order matters:** retrieval (5) and wording (6) run *strictly after* the decision (4). There is no edge from a retrieval or wording node back into the score. A model cannot change a decision because there is no code path by which it could — the graph shape enforces it, and `tests/retrieval.test.ts` asserts it behaviourally by running every fixture with and without guidance attached.

**Why not parallel or autonomous?** A conditional multi-agent graph here would add nondeterminism to a decision that must be reproducible, and would be harder to justify in review. The workflow is a *pipeline with a fixed order*, and that is the honest shape of the problem.

---

## 4. The AI layer

### 4.1 Extraction — one multimodal call

`lib/ai/gemini.ts` · model `gemini-3.6-flash`.

Text and images go in a **single request**. This removes an entire OCR/vision stage from the architecture: photos are evidence the model reads directly, labelled with the source, rather than a separate pipeline whose output another prompt must consume.

Configuration choices and their reasons:

| Setting | Value | Why |
|---|---|---|
| `responseMimeType` | `application/json` | Structured output is a contract, not a hope. Removes JSON-extraction heuristics. |
| `temperature` | `0.1` | Extraction is a reading task. Creativity is a defect here. |
| Risk vocabulary | **closed set** | The model selects from a fixed list rather than inventing risk labels the rules engine cannot recognise. |
| System prompt | explicit "never invent a value; tag every claim with its source" | The core hallucination control, stated as a rule rather than hoped for. |
| Model constant | one exported constant | Swapping to Pro is a one-line change if extraction ever needs it. |

### 4.2 Prompt engineering as a specification

`lib/ai/prompts.ts` prompts are written like interface specs, not improvisation:

- **Source discipline.** Every extracted fact carries a source (`customer_text`, `photo`, `voice_note`, `inferred`) and a certainty. A fact with no source is not extracted.
- **No invention.** A field the customer did not address is returned absent, not guessed. Absence is *the product's signal* — "missing fields" is a first-class output, so guessing would destroy the feature.
- **Evidence extraction, not summarisation.** Photos yield observable claims ("visible water staining on cabinet base"), never diagnoses ("failed seal").
- **Photos are never decisive alone.** Vision evidence informs confidence; it does not set readiness on its own.
- **Operator voice.** The wording prompt is told the action type and must not contradict it, must not introduce a price, and must not add advice the rules did not produce.

### 4.3 Validation — the model boundary

`lib/ai/schemas.ts`. Model output is treated as **untrusted input**, the same as a request body. Zod validates at the boundary; malformed output never reaches the engine. This is what makes the AI layer *replaceable*: anything that satisfies the schema could sit behind it.

### 4.4 Retrieval (RAG) — and its explicit limits

The corpus is **46 curated playbook notes authored for this product** (`lib/ai/service-notes.ts`), not a scraped document dump. That is a deliberate choice: for a domain where the operator is a licensed professional, 46 notes they can defend beats 46,000 chunks they cannot verify.

**Indexing.** Notes → `gemini-embedding-001` → 768 dimensions → `vector(768)` in Postgres via **pgvector**, with an HNSW index using `vector_cosine_ops` (`supabase/migrations/0006_service_notes.sql`).

**The table is a derived cache, not the source of truth.** `lib/ai/service-notes.ts` is canonical. Each note is content-hashed, so `ensureServiceNoteIndex()` re-embeds only what changed, and the whole index can be dropped and rebuilt from code. The refresh is memoised per server instance so concurrent analyses don't stampede the embeddings API.

**Query construction is the safety-relevant part.** The embedded text is assembled from the **structured facts and risk flags only** (`buildGuidanceQuery`) — never from the model's prose, and never from the tradie's raw words. Retrieval is therefore deterministic given the same facts, and it cannot be steered by a persuasive customer message.

**Asymmetric embeddings.** Documents are embedded as `RETRIEVAL_DOCUMENT`, the query as `RETRIEVAL_QUERY` — the task types the model was trained for.

**Two tiers, one corpus.** pgvector cosine search above `MIN_VECTOR_SCORE = 0.55`, top 3. If embeddings are unavailable, the database is missing, the migration was never pushed, or the call fails, the *same corpus* is ranked deterministically by the lexical ranker. The UI states which tier answered ("vector match" vs "keyword match"), so the degradation is visible rather than silent. A missing key cannot break an analysis.

**Citations are returned, not decorative.** Every retrieved note carries its playbook reference, its tags, and the signals that matched it — the operator can see why it appeared and reject it.

**Why pgvector over a dedicated vector service:** one Postgres, one backup/transaction/RLS story, no extra vendor, no extra secret, no extra failure mode — for a corpus of 46 rows. A dedicated vector database would be unjustified infrastructure at this scale, and using one "because RAG" would be exactly the unjustified tool-stacking the judging criteria warn against.

**What retrieval cannot do:** it does not set the score, the band, the components, the missing fields, the overrides, or the safety escalation. Those are computed in node 4 and never passed into retrieval. Tests assert byte-identical decisions with and without guidance.

### 4.5 Voice — ElevenLabs as the field interface

`lib/elevenlabs/client.ts`.

- **Scribe (`scribe_v1`)** transcribes a spoken site note. It is the **only** transcription provider in the codebase — there is no second STT path, so there is no possibility of divergent transcripts.
- The transcript becomes **structured evidence**: Gemini turns the narration into facts, and those facts create a **new scope version**, re-run retrieval against the *new* facts, and can **change the recommendation** (e.g. a concealed-leak risk flips the action to "inspection required before a fixed price").
- **TTS (`eleven_multilingual_v2`)** reads a pre-call briefing, so the operator arrives at the phone with the known facts in their ear rather than on a screen.
- Generated audio is labelled as generated; voice cloning is not used.

**Why this is core, not decorative:** a tradie on a ladder with wet hands has no keyboard. Remove ElevenLabs and the field-update workflow — the mechanism by which new information changes the scope — does not exist in the product.

### 4.6 Cost and latency accounting

`lib/ai/pricing.ts`, persisted into each scope version's `metrics`.

Tokens come back from the API — they are facts. Dollars are arithmetic on a documented rate assumption, always labelled an estimate, overridable per environment (`GEMINI_INPUT_USD_PER_M` / `GEMINI_OUTPUT_USD_PER_M`). This distinction is deliberate: it is the difference between a measurement and a claim.

---

## 5. The deterministic decision layer

`lib/rules/*` — pure functions, no I/O, no AI, full test coverage.

### Readiness score

```
score = 0.25·details + 0.25·evidence + 0.20·access + 0.15·confirmation + 0.15·risk
```

Weights reflect what actually causes an underquoted job: incomplete detail (25%) and thin evidence (25%) dominate; confirmation matters least because a customer's self-report is the weakest signal.

**Caps override the weighted sum:**
- any missing **critical** field → capped at 69
- inspection condition triggered → capped at 69
- safety pattern matched → capped at 69, action re-routed

Bands: **0–39** needs information · **40–69** inspection recommended · **70–100** ready for estimate. Every component is rendered in the UI — the score is never an opaque number.

### Safety patterns run on the customer's own words

`lib/rules/risk-overrides.ts` matches against the **raw customer text**, before the model's paraphrase and before retrieval. This is a specific, load-bearing decision: paraphrase is exactly where a gas smell becomes "an odour". Running safety over the original words means the model cannot soften a hazard — accidentally or otherwise.

Each override carries a plain-English reason that is shown to the operator. The escalation **re-routes the action and gates the estimate path**; it does not pretend to be a licensed assessment, and the copy says so.

### Rules are advisory on commercial decisions

`lib/quotes/advisory.ts` — the engine **never hard-blocks** a `ready: false` result. An operator can acknowledge the advisory and proceed, and the acknowledgement is recorded. This is the correct boundary: the software owns the checklist and the evidence, the licensed human owns the commercial call.

### Versioned, diffable scopes

A new analysis or an applied voice note creates a **new scope version** (`lib/rules/diff.ts` computes what changed) rather than mutating the old one. The diff is what makes the voice-note beat legible — and it is also the audit trail: you can see what was known when a price was committed.

---

## 6. Persistence

`lib/data/` — a single facade (`jobs.ts`) over two interchangeable stores:

- **Supabase Postgres** (`supabase/store.ts` + `memory-store.ts`): jobs, evidence, scope versions, message drafts, quotes, audit events, job templates, service notes.
- **In-process memory store**: same interface, seeded with the demo workspace.

Every call falls back to memory on failure, and the shell shows which store is live. The consequence is that the app **cannot hard-fail during a demo** — the failure mode is "your data didn't persist", not "the app is down".

Migrations `supabase/migrations/0001…0006` are ordered, idempotent where practical, and each is a single concern: init · intake channel · workspaces + RLS · templates · quotes · service notes + pgvector.

---

## 7. Multi-tenancy and access control

Migration `0003_user_workspaces.sql` enables **row-level security on every tenant table** (organisations, members, profiles, customers, jobs, evidence, scope versions, drafts, audit events) with 24 policies keyed to organisation membership. `0004` and `0005` extend the same model to templates and quotes.

Server-side writes use the service role (which bypasses RLS) and never reach the browser; only the anon key and the Supabase URL are `NEXT_PUBLIC_*`. See [SECURITY.md](./SECURITY.md) for the full boundary.

---

## 8. Trade-offs made deliberately

| Decision | Alternative | Why this one |
|---|---|---|
| Gemini Flash, one multimodal call | Separate OCR/vision stage; or Pro tier | Removes a whole pipeline stage; Flash keeps cost near a cent and latency tolerable for a human watching it run |
| Deterministic rules for decisions | LLM judges readiness directly | Reproducibility and auditability. A score a tradie can't reason about is a score they won't trust |
| Curated 46-note corpus | Scrape thousands of pages | Every retrieved note is defensible to a professional and to a judge |
| pgvector on existing Postgres | Dedicated vector service | One database, one backup story, no extra vendor — proportionate to 46 rows |
| Advisory, never blocking | Hard gate on readiness | The licensed human owns the commercial decision |
| No fine-tuning | Fine-tune on trade data | No labelled dataset at this scale; prompt + schema validation is the honest engineering choice, and claiming otherwise would be a claim we cannot support |
| Two-tier retrieval with visible fallback | Fail loudly if the index is missing | The demo and the product both need a floor that works with no key |
| Versioned scopes, immutable | Update the scope in place | Auditability: what was known when a price was committed is a question that must be answerable |

---

## 9. What would change in production

- **Durable orchestration.** LangGraph runs in-process today; a real deployment would move long analyses to a queue with retry semantics per node.
- **Human review workflow for the corpus.** Guidance influencing the operator's checklist needs a review/approval step; today it is deliberately advisory-only.
- **Real intake integrations.** Web form, SMS, email, and the major field-service platforms, so the enquiry arrives without manual entry.
- **Extraction evaluation against human labels.** The labelled-fixture suite is a regression guard, not an accuracy benchmark; a production system needs a labelled set of real enquiries.
- **Per-tenant rate limiting and spend caps** on model calls.
- **More trades.** The engine is template-driven, so new trades are data (`lib/rules/job-templates.ts`) rather than code — but the templates themselves are the work.
