# QuoteReady

> **Know what you need before you quote.** QuoteReady turns vague trade enquiries into structured, reviewable job scopes — showing exactly what is known, missing, assumed, unsafe, or needs a site inspection *before a tradie commits to a price*.

**Track 1 — Improve an Existing Business Capability** · **Built With ElevenLabs** (special track)

Local app: `npm run dev` → http://localhost:3000
Live app: https://quote-ready-app.vercel.app

---

## The problem

Small residential trade businesses quote jobs from fragmented information: a short text, a couple of photos, a rushed phone call. Before committing to a fixed price, the owner needs job facts, access details, urgency, evidence, and risk signals — and today that means reading messages, hunting photos, calling back, and holding it all in their head.

**Target user:** owner-operators of small residential plumbing businesses in Melbourne — 2–8 person crews where the owner still quotes jobs between jobs.

**What that costs them today:**

| Failure | Operational cost |
|---|---|
| Vague enquiry answered with a guess | Underquoted job → margin lost on the visit |
| Missing detail discovered on site | Second trip, requoted job, awkward conversation |
| Concealed moisture or seized isolation valve found late | Scope dispute, unpaid variation |
| Each enquiry triaged manually | Response time measured in hours, not minutes; leads go cold |
| Scope knowledge lives in the owner's head | New office/admin staff cannot quote confidently |

## The solution

One end-to-end workflow, from raw enquiry to a human-approved customer message and a priced quote document:

```
customer enquiry (text / call / web form / email / walk-in + photos)
        │
        ▼
  ┌─ AI (Gemini) ───────────────────────────┐
  │ extract structured facts                │   unstructured → structured
  │ evidence, each with a source + certainty│
  └────────────────┬────────────────────────┘
                   ▼
  ┌─ Zod contract ──────────────────────────┐   malformed model output never
  │ validate the model's output at the API  │   reaches the engine
  │ boundary                                │
  └────────────────┬────────────────────────┘
                   ▼
  ┌─ DETERMINISTIC rules engine ────────────┐   ← the decision lives here
  │ readiness score 0–100 (D·E·A·C·R)       │
  │ missing fields, critical-field cap      │
  │ inspection conditions, safety patterns  │
  │ recommended action + why (plain English)│
  └────────────────┬────────────────────────┘
                   ▼
  ┌─ Retrieval (RAG, cited) ────────────────┐   ← guidance lives here
  │ pgvector cosine search over 46 curated  │
  │ playbook notes → cited guidance notes   │
  └────────────────┬────────────────────────┘
                   ▼
  ┌─ AI wording ────────────────────────────┐   the action is already decided;
  │ rewrite the recommended next step in    │   the model only phrases it
  │ operator language                       │
  └────────────────┬────────────────────────┘
                   ▼
  scope pack v1 → n  ·  human-approved follow-up  ·  operator-priced quote (docx/pdf)
                   ▼
  ElevenLabs voice notes from the field update the scope, the guidance and the score
                   ▼
  full audit timeline, version history, per-run latency + token telemetry
```

**The architecture is the pitch:** AI interprets, deterministic rules decide, a human approves, and retrieval only ever informs wording. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the reasoning.

## Try it in two minutes

1. Open the live app — the demo workspace loads seeded jobs (Jordan, Priya, Sam…).
2. **Jordan (leaking tap)** → review the scope pack: known facts, missing fields, evidence with sources, the readiness breakdown, and *why* the recommendation was made.
3. **Service guidance** → cited playbook notes retrieved for *this* job's facts, with the signals that matched.
4. **Draft customer follow-up** → edit → **Approve**. Nothing sends automatically.
5. **Voice field notes** → *Use demo note* → *Extract update* → see **what changed** → **Apply update to job**. New scope version, guidance re-retrieved, recommendation recalculated.
6. **Sam (hot water + smell)** → a safety pattern escalates and the estimate path is gated.
7. **Prepare quote** → AI proposes *unpriced* line items; the operator sets every figure; download `.docx` or `.pdf`.
8. **/evaluation** → 10 labelled fixtures run live against the real engine. **/how-it-works** → the AI-vs-rules table and the analysis graph.

## Who decides what

| Task | Owner | How |
|---|---|---|
| Interpreting messy customer text | **AI** | Gemini `gemini-3.6-flash`, one multimodal call, strict JSON validated with Zod |
| Reading photos as evidence | **AI** | Certainty-labelled claims; never decisive on their own |
| Transcribing a spoken site note | **AI** | ElevenLabs **Scribe** (`scribe_v1`) — the only transcription provider in the codebase |
| Retrieving relevant service guidance | **AI** | `gemini-embedding-001` (768-d) over a curated trade playbook, always cited |
| Wording the recommended next step | **AI** | The action *type* is already decided by rules |
| What a job needs to be quotable | **RULES** | Per-service-type required-field templates |
| Readiness score 0–100 | **RULES** | Weighted formula below, every component visible in the UI |
| Inspection + safety routing | **RULES** | Deterministic overrides and regex safety patterns over the customer's own words |
| Building + versioning the scope pack | **RULES** | Pure function: facts in, reviewable pack out |
| Approving anything customer-facing | **HUMAN** | Drafts stay drafts until a licensed operator approves them |
| Prices | **HUMAN** | No AI-produced figure exists anywhere in the schema |

**Readiness formula** (every component 0–100 and shown in the UI):

```
score = 0.25·details + 0.25·evidence + 0.20·access + 0.15·confirmation + 0.15·risk
```

- Any missing **critical** field → capped at 69
- Inspection condition or safety pattern → capped at 69, action re-routed
- Bands: **0–39** needs information · **40–69** inspection recommended · **70–100** ready for estimate

## Service guidance (retrieval, and what it is *not* allowed to do)

The corpus is **46 curated playbook notes authored for this product** (`lib/ai/service-notes.ts`) — version-controlled, cited, and deliberately not a scraped document dump. Each note is tagged with the fact vocabulary that should retrieve it (14 leaking-tap, 12 toilet, 12 hot-water, 8 cross-trade).

- **Query built from facts only** — the embedded text comes from the structured facts and risk flags, never from the model's prose or the tradie's spoken words.
- **Two tiers, same corpus.** pgvector cosine search (`hnsw`, `vector_cosine_ops`) when embeddings and the index are available; otherwise the identical corpus is ranked deterministically and the UI says which tier answered ("vector match" vs "keyword match"). A missing key, missing migration or a failed call degrades to keyword — it never breaks an analysis.
- **The index is a derived cache.** It is rebuilt from code on demand, hashed by content so only changed notes are re-embedded.
- **Citable and rejectable.** Every note shows its playbook reference, the signals that matched, and its score. Operators can see *why* it appeared.
- **Advisory only.** Tests assert readiness score, band, components, overrides, missing fields and safety routing are byte-identical with and without guidance attached.

Why pgvector on the existing Postgres rather than a dedicated vector service: one database, one backup/transaction/RLS story, no extra vendor, no extra secret, no extra failure mode, for a corpus of 46 notes.

## Analysis pipeline (LangGraph)

`lib/workflow/quote-ready-graph.ts` — one explicit ordered graph, because the ordering *is* the safety property:

| # | Node | Kind | What it does |
|---|---|---|---|
| 1 | `validate_job_input` | rules | Rejects empty/trivial input before any model call. Starts the run clock. |
| 2 | `extract_job_facts_with_gemini` | **AI** | Facts, evidence, risk flags. Honest fallback on failure — never fabricates. |
| 3 | `validate_structured_output` | rules | Zod contract at the model boundary. |
| 4 | `apply_job_template_rules_and_score` | **rules** | Score, overrides, safety escalation, recommended action. |
| 5 | `retrieve_service_guidance` | AI | Vector/keyword retrieval over the playbook. Advisory, cited. |
| 6 | `generate_recommendation_with_ai` | AI | Rewords the already-decided action. |
| 7 | `persist_analysis` | io | New scope version + audit event + run telemetry. |

Retrieval and wording run **strictly after** the rules engine, so "the model cannot change the score" is a structural property, not a promise.

## Measured latency and cost

Instrumented per run and stored on the scope version (`metrics`), then rendered on the job page. One real text-only analysis on this codebase:

| Metric | Value |
|---|---|
| End-to-end wall time | **21.5 s** |
| `extract_facts` (Gemini, multimodal) | 14.5 s |
| `write_recommendation` (Gemini) | 5.9 s |
| `retrieve_guidance` | 1.0 s |
| `apply_rules` | 2 ms |
| Input / output tokens | 8,975 / 4,008 |
| Estimated spend | **$0.0127** |

The model call is the bottleneck, not the deterministic engine — which is exactly where the fallback path earns its place: with no key (or `DEMO_MODE=true`) the same pipeline completes in **single-digit milliseconds** using the deterministic engine and the keyword retrieval tier.

Cost is always labelled an estimate: tokens come back from the API, dollars are arithmetic on a documented rate assumption (`lib/ai/pricing.ts`, overridable via `GEMINI_INPUT_USD_PER_M` / `GEMINI_OUTPUT_USD_PER_M`).

## Model and data choices

| Choice | Why |
|---|---|
| **Gemini `gemini-3.6-flash`** | One multimodal call handles text **and** photos, which removes a whole OCR/vision stage. Flash tier keeps per-enquiry cost in fractions of a cent and latency low enough for an operator to watch it run. `responseMimeType: application/json` + `temperature: 0.1` + a system prompt with a closed risk vocabulary and an explicit "never invent values" rule. |
| **Zod at both boundaries** | The model's JSON is parsed and validated before anything else sees it. Model output is treated as untrusted input, not as fact. |
| **Deterministic rules for decisions** | A quote is a commercial commitment made on incomplete information. Rules are readable, testable, diffable in review, and identical every run. |
| **Curated corpus, not a scrape** | 46 reviewed notes beat 46,000 unvetted chunks: every retrieved note is defensible to a tradie and to a judge. |
| **ElevenLabs Scribe** | Voice is the only way a tradie on tools can update a scope. Scribe transcribes the site note; TTS reads a pre-call briefing. Two providers would mean two divergent transcripts. |
| **Supabase Postgres + Storage, with a full in-memory fallback** | The demo cannot hard-fail: every store call falls back to an in-memory implementation, so a database outage degrades to a non-persisting session rather than an error page. (The fallback is silent by design — it is a resilience path, not a user-facing state.) |

## Evaluation

**10 labelled fixtures** (`lib/evaluation/fixtures.ts`) run through the **same** `buildScopePack` the product uses. They are asserted in `tests/engine.test.ts` and rendered live at **`/evaluation`**.

| Fixture | Expected | Notes |
|---|---|---|
| Vague leaking tap enquiry | inspection_recommended | |
| Detailed standard toilet replacement | ready_for_estimate | |
| Hot-water leak + unusual smell | inspection_recommended | **safety flag** |
| No images, no property access info | needs_information | |
| Clear mixer replacement with access + photos | ready_for_estimate | |
| Unknown fixture + visible water damage | inspection_recommended | |
| Voice note mentions damp cabinet | inspection_recommended | |
| Customer says gas smell | inspection_recommended | **safety flag** |
| Toilet overflowing | inspection_recommended | **safety flag** |
| Burst pipe flooding | inspection_recommended | **safety flag** |

**Test suite:** 91 tests across 5 files; coverage on the deterministic decision layer is **96.2% statements / 86.2% branches** (`npm run test:coverage`, thresholds enforced at 90/80 so a regression fails the build).

**What is *not* measured** (stated rather than implied): extraction accuracy against independent human labels, and real-world quote outcomes. Both need data we do not have at this scale — so no precision figure is claimed. See [EVALUATION.md](./EVALUATION.md).

## Safety and boundaries

QuoteReady provides an AI-assisted scope-readiness assessment from the information supplied. It **does not diagnose faults, does not price work, does not send anything to a customer, and does not replace licensed on-site judgement.** Safety patterns route work to the appropriate professional process; they are not an assessment.

Never: prices, price ranges or rates produced by AI · binding quotes or contracts · automatic outbound messages · fault diagnosis · voice cloning. Generated audio is labelled as generated.

## Tech stack

**Next.js 16** (App Router, server components, Turbopack) · **React 19** · **Tailwind v4** + shadcn-style primitives · **Supabase** (Postgres, Storage; pgvector) · **LangGraph** (`@langchain/langgraph`) · **Google Gemini** (`@google/genai`) · **ElevenLabs** (`@elevenlabs/elevenlabs-js`) · **Zod v4** · **Vitest** + v8 coverage · **Playwright** for the dev flow scripts in `scripts/`.

## Architecture map

```
app/
  page.tsx                     landing
  (workspace)/                 dashboard · jobs · jobs/[id] · jobs/new · jobs/[id]/analysing
                               messages · templates · settings
                               evaluation · how-it-works        ← live evidence pages
  api/jobs/                    create · [id]/analyse · [id]/voice-note(+transcribe|preview|apply|audio)
                               [id]/message-draft(+approve) · [id]/quote · [id]/inspect · [id]/briefing
  api/intake/transcribe        spoken-enquiry intake (ElevenLabs Scribe → form fields)
  api/quotes/[id]/download     docx / pdf render
lib/
  rules/                       engine · readiness · job-templates · risk-overrides · diff · merge
                               message-templates · status · template-resolve   (pure, tested, no AI)
  ai/                          gemini · prompts · schemas (Zod) · retrieval · service-notes (corpus)
                               embeddings · pricing · voice · fallbacks · demo-mode
  workflow/                    LangGraph state · nodes · graph
  elevenlabs/                  Scribe STT + TTS clients (server-only)
  quotes/                      quote schema · content · totals · numbering · advisory · docx/pdf render
  evaluation/                  the 10 labelled fixtures
  data/                        supabase store · in-memory store · unified facade with fallback · demo seed
supabase/migrations/           0001 init · 0002 intake channel · 0003 workspaces/RLS · 0004 templates
                               0005 quotes · 0006 service notes + pgvector
tests/                         5 suites, 91 tests (rules · retrieval · schemas · engine · quotes)
scripts/                       Playwright flow + responsive/screenshot utilities (dev only)
```

## Local setup

```bash
npm install
cp .env.example .env.local          # add your keys (the app runs fine without them)
npx supabase link && npx supabase db push    # or run supabase/migrations/*.sql in the SQL editor
npm run dev                          # http://localhost:3000
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Postgres + Storage; without it the in-memory store is used |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for persistence | browser + server anon access (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | server-only writes (bypasses RLS) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | for live AI | Gemini extraction, retrieval embeddings |
| `ELEVENLABS_API_KEY` | for voice | Scribe transcription + briefing TTS |
| `ELEVENLABS_VOICE_ID` | optional | voice used for briefings |
| `DEMO_MODE` | optional | `true` forces the deterministic path end-to-end (rehearsal / outage insurance) |
| `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` | optional | LangGraph run tracing when you want it |
| `GEMINI_INPUT_USD_PER_M`, `GEMINI_OUTPUT_USD_PER_M` | optional | override the cost-estimate rate card |

The app **runs with no keys at all** — in-memory store, deterministic engine, keyword retrieval tier, precomputed demo analyses. Only `NEXT_PUBLIC_SUPABASE_*` are exposed to the browser.

## Quality gates

```bash
npm run check           # lint + typecheck + tests (the one command that must pass)
npm run test:coverage   # 91 tests + coverage thresholds
npm run build           # production build
```


## Known limitations

- Three service types (leaking tap/mixer, toilet repair, hot water) — the engine is template-driven, so more trades are data, not code, but they are not written yet.
- No fine-tuning: there is no labelled dataset at this scale, and prompt+validation is the honest choice.
- Retrieval informs wording, not decisions — some operators will want guidance to influence the checklist, which needs a review workflow we have not built.
- The quote flow suggests *unpriced* line items; the advisory grades readiness and can require an acknowledgement, but it never hard-blocks an operator's commercial decision.
- Single-workspace demo organisation by default; multi-tenant auth/RLS exists in the schema but is not a full product surface.

## Licence

MIT (see [LICENSE](./LICENSE)).
