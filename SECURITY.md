# QuoteReady — Security, Safety and Privacy

> **Scope and honesty first.** QuoteReady is a 48-hour hackathon build, single-tenant demo by default. This document separates three things that are easy to blur together: **(a)** what the code actually enforces today, **(b)** product safety boundaries that are architectural, and **(c)** what a production deployment would need. Where something is not built, it says so rather than implying it is.

---

## 1. Product safety boundaries (architectural, not policy)

These are enforced by the shape of the system, not by prompt instructions. Each one names where it is enforced.

| Boundary | Enforced by |
|---|---|
| **Never diagnoses a fault** | Prompts extract *observable* claims only; no diagnosis field exists in `lib/ai/schemas.ts` |
| **Never produces a price** | There is no price field anywhere in the AI schema. Every figure on a quote document is operator-typed |
| **Never sends anything to a customer** | Drafts require an explicit approval call; nothing in the codebase sends an outbound message |
| **Never produces a binding quote or contract** | The quote document is labelled as prepared for review and is operator-priced |
| **Never replaces licensed judgement** | Every scope pack states its limits in the UI. The advisory layer explicitly never hard-blocks an operator |
| **Never clones a voice** | No cloning endpoint is called. Generated audio is labelled as generated |
| **Never lets a model change a safety decision** | Safety patterns run in pure code over the *raw customer text*, before retrieval and before the wording model (`lib/rules/risk-overrides.ts`) |

The last one is the most important and the most testable. Overview of the mechanism:

- Safety patterns match against the **customer's own words**, not the model's paraphrase — because paraphrase is where a gas smell becomes "an odour".
- Retrieval and wording nodes run **after** the decision node, with no edge back into it.
- `tests/retrieval.test.ts` asserts a safety-flagged job's score, band, components, overrides and action are **identical** with and without guidance attached.

**Language used on screen** matters too: safety escalation copy routes work to the appropriate professional process and states that it is not an assessment. It does not say "safe" or "unsafe".

---

## 2. Untrusted model output

The single most consequential security decision in an LLM application is to treat model output as **untrusted input**, exactly like a request body. QuoteReady does:

```
customer text + photos
        │
        ▼  Gemini (JSON mode, temperature 0.1)
  raw model output  ──►  ZOD VALIDATION  ──►  only validated facts proceed
                                │
                                └─ invalid → discarded; deterministic facts stand
```

- Model output is parsed against `lib/ai/schemas.ts` before any other code sees it. Malformed or unexpected output is discarded, not coerced.
- The engine cannot be reached by anything that has not passed the schema.
- A failed extraction degrades to deterministic text parsing and **never fabricates a fact** — an absent field is a valid, meaningful result because "missing fields" is a core product output.

**Prompt injection surface and controls:**

| Vector | Control |
|---|---|
| Customer text attempting to steer the model | Model output only populates a validated schema; it cannot cause an action, a send, or a price |
| Model prose steering retrieval | Retrieval queries are built from the **structured facts only** (`buildGuidanceQuery`) — never from model prose, never from raw customer words |
| Inventing risk labels the engine can't handle | Risk vocabulary is a **closed set**; unknown values fail validation |
| Model hallucinating a fact used for a decision | Every fact carries a source and certainty; evidence alone is never decisive |

**Not done:** adversarial red-teaming of the extraction prompt. The controls above are structural, but the prompt has not been attacked systematically. Stated here rather than implied.

---

## 3. Secrets and configuration

```
NEXT_PUBLIC_SUPABASE_URL          → browser (public by design)
NEXT_PUBLIC_SUPABASE_ANON_KEY     → browser (RLS is the boundary)
SUPABASE_SERVICE_ROLE_KEY         → server only
GOOGLE_GENERATIVE_AI_API_KEY      → server only
ELEVENLABS_API_KEY                → server only
```

- Only the two `NEXT_PUBLIC_*` Supabase values reach the browser. Nothing else is prefixed `NEXT_PUBLIC_`.
- The service-role key is read in `lib/supabase/server.ts` only and is never referenced from client code.
- **No secrets are committed.** `.gitignore` contains `.env*`; `git ls-files | grep .env` returns nothing but `.env.example`, which contains empty placeholders only.
- `.env.example` documents every variable, its purpose, and where to obtain it.
- Rate-card overrides (`GEMINI_*_USD_PER_M`) are environment variables so a deployment can carry its own numbers rather than editing code.

**Would be added in production:** secret rotation, per-environment separation, and a deployment-time check that refuses to boot if a server-only key appears in a client bundle (the Next.js build currently warns on `NEXT_PUBLIC_` misuse but does not fail).

---

## 4. Data protection

### Row-level security

Migration `0003_user_workspaces.sql` enables RLS on every tenant table and defines **24 membership-scoped policies**:

`organisations` · `organisation_members` · `profiles` · `customers` · `jobs` · `job_evidence` · `scope_versions` · `message_drafts` · `audit_events`

Migrations `0004` (job templates) and `0005` (quotes) extend the same model. Access is keyed to organisation membership: a caller holding the anon key cannot read another organisation's rows.

`0006` (service notes) is deliberately different: **service guidance is shared reference content, not tenant data.** It is readable by any caller with a project key and writable only via the service role — so the vector index can only ever be written by the server. Its policy is a deliberate, documented exception rather than an oversight.

### Data classes handled

| Data | Where | Sensitivity |
|---|---|---|
| Customer name, phone, suburb | Postgres `jobs`, `customers` | Personal information — RLS-scoped |
| Customer enquiry text | Postgres, sent to Gemini for extraction | Personal information — sent to a third-party processor |
| Job photos | Supabase Storage, sent to Gemini as evidence | Potentially identifying (a bathroom, a property) |
| Voice recordings | Transient; sent to ElevenLabs Scribe for transcription | Potentially identifying |
| Operator attribution | Audit events | Internal |

### The honest disclosure

**Enquiry text, photos and voice notes are sent to third-party AI processors (Google Gemini and ElevenLabs) when the live path runs.** That is inherent to the product and is the correct thing to name rather than bury. A production deployment needs:

- a privacy notice and a lawful basis for processing customer-supplied content;
- a data-processing agreement covering Google and ElevenLabs;
- retention limits on evidence and recordings (the transcript is stored as structured facts; the raw audio need not be retained);
- the ability to disable the live AI path per tenant — which `DEMO_MODE` already demonstrates is structurally possible, since the whole pipeline runs without any external call.

**Demo data only.** The seeded workspace is synthetic. No real customer data is used anywhere in this repository or in the demo environment.

---

## 5. Application-surface hardening

### What exists today

- **Zod validation on 9 mutating route handlers** (`jobs`, `jobs/[id]/message-draft`, `message-draft/[draftId]`, `quote`, `voice-note/apply`, `voice-note/preview`, `profile`, `quotes/[id]`, `templates`). Invalid bodies are rejected before any library call.
- **Input gate before spend.** `validate_job_input` runs before the model call, so trivial or empty input cannot burn tokens or produce an analysis.
- **Approval as a separate, explicit call.** A message draft and a quote are not sent/committed by the same request that generated them — the approval is its own recorded event.
- **Audit trail.** Job creation, analysis, voice-note application, scope approval and draft approval write audit events with actor and timestamp.
- **Immutable versions.** A new analysis or applied field note creates a new scope version rather than overwriting history.
- **Graceful degradation everywhere.** A missing key, a failed API call or an unavailable database degrades to a deterministic path; it does not expose internals. Errors returned to the UI are written for an operator, not a stack trace.
- **No `dangerouslySetInnerHTML` on model output.** Wording generated by the model is rendered as text.
- **Uploads** are transcribed server-side and passed as in-memory buffers; the raw audio is not written to the filesystem or to storage as part of the standard flow.

### Known gaps — stated, not hidden

1. **API routes are not session-authenticated in the demo.** The application surface is single-workspace by design at hackathon scale; the RLS policies protect tenant data for authenticated Supabase clients, but a production build must add a session/membership check at the route boundary. This is the single largest gap between this codebase and a production system.
2. **No rate limiting.** A public deployment should cap model calls and spend per tenant (`pricing.ts` already produces the per-call number that makes a budget enforceable).
3. **No `server-only` import guard.** Server modules are kept out of client bundles by convention and by Next.js's server/client boundary, but adding `import "server-only"` to `lib/ai/*` and `lib/elevenlabs/*` would make a mistake a build error instead of a silent leak.
4. **No CSP headers** configured in `next.config.ts`. An operator-facing app handling customer content should ship a content-security policy.
5. **No dependency scanning in CI.** `npm audit` is not wired into `npm run check`.
6. **No prompt-injection red-team suite** (see §2).

---

## 6. Failure-mode posture

The design assumption is that **external services fail**, and the product must stay usable:

| Failure | Behaviour |
|---|---|
| Gemini unavailable or rate-limited | Deterministic extraction from the same input; analysis completes |
| Gemini returns malformed JSON | Zod discards it; deterministic facts stand |
| Supabase unavailable | In-memory store; the shell reports which store is live |
| Embeddings unavailable or index missing | Lexical retrieval tier over the same corpus; the UI says "keyword match" |
| ElevenLabs unavailable | Manual transcript entry — the workflow completes without voice |
| ElevenLabs returns "no speech" | Treated as a recording problem with its own message, not an API error |
| Anything else | `DEMO_MODE=true` runs the entire pipeline with zero external calls |

This is a security posture as much as a reliability one: **the app has no single point of failure that turns into a data exposure or a blank screen.** Degradation is always toward a deterministic, auditable path.

---

## 7. Summary for reviewers

| Question | Answer |
|---|---|
| Can the model send something to a customer? | No. There is no outbound send path; approval is a separate recorded action. |
| Can the model set a price? | No. No price field exists in any AI schema. |
| Can the model change a safety decision? | No. Safety runs on raw text in pure code, upstream of every model call after it. |
| Is model output trusted? | No. It is parsed and validated against Zod before use, and discarded if invalid. |
| Are there secrets in the repo? | No. `.env*` is gitignored; only empty placeholders are committed. |
| Is customer data isolated? | Yes at the database layer (RLS, 24 policies); the demo app itself is single-workspace. |
| Is customer data sent to third parties? | Yes, when the live path runs — Google Gemini and ElevenLabs. Disclosed in §4, and disableable. |
| What is the biggest production gap? | Route-level session authentication. Named in §5. |
