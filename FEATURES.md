# QuoteReady — Feature Overview & Roadmap

> AI-assisted quote-readiness workspace for small residential plumbing businesses.
> Everything below is **live and verified** unless marked *planned*. Where a feature has a
> limitation, the limitation is stated next to it rather than in a footnote.

**Rubric-facing companion docs:** [README.md](./README.md) (overview + setup) · [ARCHITECTURE.md](./ARCHITECTURE.md) (design reasoning) · [EVALUATION.md](./EVALUATION.md) (fixtures, tests, what is *not* measured) · [SECURITY.md](./SECURITY.md) (boundaries and gaps) · [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) (walkthrough) · [SUBMISSION.md](./SUBMISSION.md) (Devpost copy).

---

## What QuoteReady does (one sentence)

Turns a vague customer enquiry (text, call, photos, voice notes) into a structured, reviewable
job scope that tells the tradie exactly what is known, missing, assumed, unsafe, or requires a
site inspection — **before any price is committed**.

## The core loop

```
Enquiry arrives (text / call / web form / email / walk-in / photos)
  → Gemini extracts structured facts, each with a visible source + certainty
  → Zod validates the model output at the boundary
  → Deterministic rules engine scores readiness 0–100 (D·E·A·C·R) and routes safety
  → Retrieval selects cited playbook guidance for THIS job's facts (pgvector cosine)
  → Scope pack: known facts · missing fields · assumptions · exclusions · risk flags · guidance
  → Human-approved customer follow-up (drafted, editable, nothing auto-sends)
  → Field voice notes (ElevenLabs Scribe) re-run the loop → new scope version
  → Operator-priced quote (.docx / .pdf) — AI proposes unpriced line items only
  → Full audit timeline + version history with diffs + per-run latency/token/cost telemetry
```

---

## Feature catalogue (all working)

### Intake
| Feature | What it does |
|---|---|
| Multimodal new enquiry | Channel selector (Text/SMS, Phone call, Web form, Email, Walk-in) changes the guidance + placeholder; drag-&-drop photo upload with previews |
| Live Gemini extraction | `gemini-3.6-flash`, one multimodal call (text + photos), JSON mode, `temperature 0.1`, strict Zod validation, honest deterministic fallback if the API fails |
| Photo evidence | Up to 6 photos per job; certainty-labelled ("medium — fixture looks like a mixer"); photos are never decisive on their own |
| Spoken-enquiry intake | `app/api/intake/transcribe` → ElevenLabs Scribe fills enquiry form fields from a voice description |
| Update enquiry | Edit the enquiry text later, add photos, or add an operator note — saves as evidence, then **re-runs the full analysis** into a new scope version |

### Readiness engine (deterministic, tested)
| Feature | What it does |
|---|---|
| Score | `readiness = 0.25·D + 0.25·E + 0.20·A + 0.15·C + 0.15·R`, every component visible in the UI |
| Bands | 0–39 needs information · 40–69 inspection recommended · 70–100 ready for estimate |
| Overrides | Missing critical field → cap 69 · safety patterns (gas smell, sewage, flooding, burning) → **safety escalation, action re-routed** · concealed-leak/damp conditions → inspection required |
| Job templates | Three deep templates (leaking tap, toilet, hot-water) with required/critical fields, questions, assumptions, exclusions, inspection conditions |
| Safety | Regex safety patterns on *raw customer text* (never model paraphrase), run in pure code **upstream of every model call that follows**; UI shows an escalation card with "not an assessment" language |
| Advisory, not blocking | The engine never hard-blocks an operator's commercial decision — an unresolved scope can still be quoted, and the quote then carries the unresolved items as explicit assumptions and exclusions, with the acknowledgement recorded |

### Scope pack UI
| Feature | What it does |
|---|---|
| Tabs | Known · Missing · Evidence · Assumptions — with counts, icons and plain-language guidance |
| Known facts | Every extracted fact with a readable label; photos/voice counts shown |
| Missing fields | Critical/ask-customer/on-site badges + *why it matters* per field |
| Evidence | Every claim tied to its source (enquiry text / image_1 / voice_note_1 / operator) with certainty |
| Score breakdown | D·E·A·C·R bars + weights visible in the summary card |
| Why this recommendation | Override reasons rendered in plain English |
| **Service guidance (retrieval)** | Top-3 playbook notes matched to *this* job's structured facts — each with its playbook reference, the signals that matched, a score, and a **"vector match" / "keyword match"** tier badge |
| **Run telemetry chip** | Wall time, per-node timing, input/output tokens and estimated spend for the analysis that produced this version |

### Actions (human-in-the-loop)
| Feature | What it does |
|---|---|
| Draft follow-up | Deterministic message asks only the missing customer-answerable fields (template questions), editable in a dialog |
| Draft manager | Edit any draft inline, approve it, or regenerate from the current scope — nothing is ever sent automatically; approval is logged |
| Request inspection | User-only transition (state machine enforced server-side) |
| Status model | new → band → follow_up_drafted → follow_up_approved → closed; inspection_requested; safety as overlay flag |

### Quotes (AI proposes scope, human owns every figure)
| Feature | What it does |
|---|---|
| Prepare quote | Line items derived from the job template, **proposed unpriced by AI**; the operator types every figure. There is no price field in any AI schema |
| Advisory before generation | `buildQuoteAdvisory` reports whether the job is ready; if not, the operator is told exactly which items will become assumptions/exclusions and must acknowledge before proceeding |
| Totals & GST | Line-item totals, subtotal, GST, deposit percentage, validity window, quote numbering |
| Export | Real `.docx` (`docx` package) and `.pdf` (`pdf-lib`) render, downloadable from the quote panel |

### Voice & audio (Built With ElevenLabs)
| Feature | What it does |
|---|---|
| Record site note | In-browser MediaRecorder → **ElevenLabs Scribe** (`scribe_v1`) transcription (server-side, key-protected) — the only voice engine in the codebase |
| Replay the note | The recording is played back in the modal and saved with the note, so it can be replayed later from the job's evidence card |
| Paste transcript | Works with no microphone — the demo note pre-fills it |
| Key-info extraction | Gemini turns the transcript into structured fact updates + risk flags (deterministic fallback if live AI is down) |
| What changed | Preview diff (facts before → after, new risk flags) **before** anything is applied |
| Apply update | User-approved → recording saved to Storage, new scope version + audit event; score/band re-computed, guidance re-retrieved against the new facts |
| Pre-call briefing | Deterministic spoken summary (e.g. "Jordan's enquiry is 62% quote ready… ask about property access"); TTS audio when a voice is configured, written text otherwise |

### Retrieval (RAG, cited, advisory-only)
| Feature | What it does |
|---|---|
| Curated corpus | **46 playbook notes authored for this product** (`lib/ai/service-notes.ts`) — version-controlled, referenced (`QR-PB-…`), tagged with the fact vocabulary that retrieves them |
| Vector index | `gemini-embedding-001`, 768 dimensions, `pgvector` `vector(768)` with an HNSW cosine index (`supabase/migrations/0006_service_notes.sql`) |
| Derived cache | The table is a *cache of code*: notes are content-hashed so only changed notes are re-embedded, and the index can be dropped and rebuilt from source |
| Deterministic query | The embedded query is built from **structured facts only** — never from model prose, never from raw customer words |
| Two tiers, one corpus | Vector search (min similarity 0.55, top 3) with a deterministic lexical ranker as the floor when embeddings, the key or the migration are unavailable. The UI names the tier that answered |
| Cannot change a decision | Tests run every fixture with and without guidance and assert score, band, components, overrides, missing fields and action are **identical** |

### Data, resilience, transparency
| Feature | What it does |
|---|---|
| Supabase persistence | Postgres schema + storage buckets; RLS on all tenant tables (24 membership policies); auto-seeds the demo workspace on first run |
| Memory fallback | If Supabase is unreachable the app keeps working on an in-memory store — silent by design (a resilience path, not a user-facing state) |
| Demo resilience | Live APIs fail → deterministic fallbacks labelled honestly in the audit timeline; `DEMO_MODE=true` runs the whole pipeline with zero external calls |
| **Evaluation page** | 10 labelled fixtures run through the **real** engine live at `/evaluation` — mirrored in Vitest (identical fixtures, `lib/evaluation/fixtures.ts`) |
| **How it works page** | AI-vs-rules table, readiness formula, the 7-node pipeline, safety boundaries |
| Cost transparency | Tokens are facts from the API; dollars are arithmetic on a documented, environment-overridable rate card (`lib/ai/pricing.ts`), always labelled an estimate |
| Security | Service-role key server-only, Zod on 9 mutating handlers, no automatic outbound actions — see [SECURITY.md](./SECURITY.md) for gaps |

### Landing page
SplitText hero with parallax + mouse-tilt product mockup · aurora background · infinite outcome
marquee · before/after · animated feature grid with a live "job → status" cycling demo card ·
scroll-drawn pipeline · count-up metrics · proper footer.

---

## Verified end-to-end (browser-tested)

1. Jordan's leaking tap: draft → edit → approve ✓
2. Voice demo note → preview diff → apply → new scope version + audit + re-retrieved guidance ✓
3. Live Gemini re-analysis after editing the enquiry text (51% inspection-recommended) ✓
4. Live instrumented run: ~21.5 s wall time, 8,975 / 4,008 tokens, ~$0.0127 estimate, captured on the scope version ✓
5. Safety job (gas smell) escalates and re-routes the action; quote still possible with a recorded acknowledgement ✓
6. Quote export produces a valid `.docx` and `.pdf` with operator-entered figures only ✓
7. Retrieval degrades to the keyword tier with no key / no migration, and the UI says so ✓
8. Dashboard search/filter instant (no reloads), table + mobile cards, no horizontal scroll at 375px ✓

---

## Quality gates

```bash
npm run check           # lint + typecheck + 91 tests
npm run test:coverage   # + thresholds (90% statements / 80% branches, enforced)
npm run build           # production build
```

91 tests across 5 suites; **96.2% statements / 86.2% branches** on the deterministic decision layer.

---

## What we could add next (ranked)

### 1. Route-level session authentication — *the largest production gap*
Add a Supabase Auth session + membership check at the API boundary. The RLS policies already
exist (24 policies across 9 tenant tables, `0003_user_workspaces.sql`); what is missing is the
route-level enforcement. Documented as gap #1 in [SECURITY.md](./SECURITY.md).

### 2. Per-tenant rate limiting and spend caps
`estimateCostUsd` already produces the per-run figure needed to enforce a budget. Wire it to a
per-organisation monthly cap and a queue-level concurrency limit.

### 3. Durable orchestration
Analyses run in-process today. Move the LangGraph run to a queue with per-node retry and a
status surface, so a long analysis survives a serverless timeout.

### 4. Corpus review workflow
Retrieval is deliberately advisory-only. Letting guidance influence the operator's checklist
requires a review/approval step for notes — today the corpus is version-controlled code, which
is a feature, but it is not yet a product surface for a trade business to extend themselves.

### 5. Extraction accuracy benchmark
A labelled set of real enquiries with human-assigned facts, to report extraction precision and
recall honestly. Currently unmeasured and stated as such in [EVALUATION.md](./EVALUATION.md).

### 6. Intake integrations
Web form embed, SMS/email ingestion, and field-service platform webhooks so enquiries arrive
without manual entry — the largest adoption friction after authentication.

### 7. Quote → invoice bridge
Once a quote is approved, a one-click convert-to-job and later invoice export (CSV / Xero-style).

### 8. More trades
The engine is template-driven: a new trade is data (`lib/rules/job-templates.ts`), not code.
Writing the templates well is the actual work, which is why this is ranked below the product gaps.
