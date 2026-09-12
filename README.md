# QuoteReady

> Turns vague trade enquiries into quote-ready job scopes — showing exactly what is known, missing, assumed, unsafe, or requires a site inspection **before a tradie commits to a price**.

**Tracks:** Track 1 — Improve an Existing Business Capability · Built With ElevenLabs

---

## The problem

Small trade businesses already quote residential jobs, but the information they receive is fragmented: a short text, a few photos, a rushed phone call. Before responsibly giving a fixed estimate, a tradie needs job facts, access details, urgency, and risk signals. Today an owner or admin reads messages, searches photos, calls back, and holds it all in their head. That creates slow responses, wasted site visits, underquoted jobs, and scope disputes.

## The solution

```
vague enquiry + photos        ┌─ Gemini ──────────────┐
+ optional spoken site note ──►  structured facts,    │
                               │  evidence w/ sources  │
                               └──────────┬────────────┘
                                          ▼
                          ┌─ deterministic rules engine ─┐
                          │  readiness score 0–100       │
                          │  missing fields, assumptions │
                          │  risk + safety overrides     │
                          └──────────┬───────────────────┘
                                     ▼
                       scope pack → human-approved follow-up
                                     ▼
                ElevenLabs voice notes update the scope from the field
                                     ▼
                        full audit timeline, version history
```

AI interprets unstructured input. **Deterministic rules decide readiness.** Humans approve anything customer-facing. QuoteReady never prices a job, never sends a message, and never claims to diagnose a fault.

## Try it (2 minutes)

1. Open the workspace — three seeded jobs load (Jordan / Priya / Sam).
2. **Jordan (leaking tap)** → review the scope pack, why it scored what it did, then *Draft customer follow-up* → edit → **Approve**.
3. On the same job → *Use demo note* under **Voice field notes** → *Extract update* → see exactly **what changed** → **Apply update to job**. New scope version, inspection now required.
4. **Sam (hot-water + smell)** → see the safety-escalation overlay: estimate paths are blocked.
5. Create a *New enquiry* yourself with a photo and watch the same pipeline run.
6. `/evaluation` — 10 labelled fixtures live against the rules engine. `/how-it-works` — the AI-vs-rules table and the readiness formula.

## What AI does vs what rules do

| Task | Owner | How |
|---|---|---|
| Interpreting messy customer text | AI | Gemini, structured output validated with Zod |
| Reading photos as visual evidence | AI | Certainty-labelled, never decisive |
| Transcribing spoken site notes | AI | ElevenLabs **Scribe** (`scribe_v1`) |
| Drafting customer follow-up copy | AI | From rule-selected missing fields only |
| What a job needs to be quotable | **Rules** | Per-type required-field templates |
| Readiness score 0–100 | **Rules** | Weighted formula below |
| Inspection / safety routing | **Rules** | Deterministic overrides, regex safety patterns |
| Approving anything sent to a customer | **Human** | Explicit approval; nothing auto-sends |
| Prices | **Human** | Out of scope, by design |

**Readiness formula** (all components 0–100, every one visible in the UI):

```
readiness = 0.25·Details + 0.25·Evidence + 0.20·Access + 0.15·Confirmation + 0.15·Risk
```

- Any missing critical field → capped at 69
- Inspection conditions or safety patterns → capped at 69 + re-routed recommendation
- Bands: 0–39 *needs information* · 40–69 *inspection recommended* · 70–100 *ready for estimate*

## Architecture

- **Next.js 16** (App Router, server components, Turbopack) + **shadcn/ui** + Tailwind v4
- **LangGraph** (`@langchain/langgraph`) — explicit five-node analysis pipeline: `validate_input → extract_facts (Gemini) → validate_output → apply_rules_and_score → persist`
- **Google Gemini 2.5 Flash** — one multimodal call per analysis; `responseMimeType: application/json`; Zod validation; retry-once then *honest fallback* (never fabricated facts)
- **ElevenLabs** — Scribe STT for field notes, TTS for pre-call briefings (clearly labelled AI-generated)
- **Supabase** — Postgres schema + Storage buckets; **full in-memory fallback store** mirrors the API so the demo never hard-fails (status chip shows which store is live)
- **Vitest** — 42 tests, 95%+ coverage on the rules engine; the 10-fixture evaluation suite runs in CI *and* live at `/evaluation`

```
app/
  (workspace)/            dashboard · jobs/[id] · jobs/new · evaluation · how-it-works
  api/jobs/               POST create · [id]/analyse · [id]/message-draft(/approve)
                          [id]/voice-note(/apply) · [id]/inspect · [id]/briefing · demo/reset
lib/
  rules/                  engine · readiness · job-templates · overrides · diff · messages (pure TS)
  ai/                     gemini · prompts · schemas (Zod) · fallbacks · voice
  workflow/               LangGraph state + nodes + graph
  data/                   supabase store · memory store · unified facade w/ fallback
  elevenlabs/             Scribe STT + TTS clients (server-only)
supabase/migrations/      schema + storage buckets + indexes
tests/                    engine · schemas · 10 labelled fixtures
```

## Evaluation

10 labelled fixtures run through the actual engine (same code path as production) — expected outcomes asserted in Vitest and rendered live at `/evaluation`:

| Fixture | Expected |
|---|---|
| Vague leaking tap | Inspection recommended |
| Detailed toilet replacement | Ready for estimate |
| Hot-water leak + smell | **Safety flag** + inspection |
| No images, no access info | Needs information |
| Clear mixer w/ access + photos | Ready for estimate |
| Unknown fixture + water damage | Inspection recommended |
| Voice note: damp cabinet | Inspection recommended |
| "Gas smell" | **Safety flag** |
| Toilet overflow / sewage | **Safety flag** |
| Burst pipe flooding | **Safety flag** |

Reported honestly: 10/10 fixtures pass on the current build. No invented performance numbers.

## Safety & boundaries

QuoteReady provides an AI-assisted scope-readiness assessment based on supplied information. It does not diagnose faults, guarantee pricing, or replace professional on-site assessment. Review all recommendations before communicating with customers or commencing work. Urgent safety concerns require appropriate professional/emergency action.

Never: prices or price ranges · binding quotes or contracts · automatic outbound messages · trade/safety diagnosis · voice cloning (generated audio is labelled).

## Local setup

```bash
npm install
cp .env.example .env.local    # add your keys
npx supabase link && npx supabase db push   # or run supabase/migrations in the SQL editor
npm run dev                   # http://localhost:3000
npm test                      # 42 tests incl. the evaluation fixtures
```

The app **runs without any keys** (in-memory store + deterministic fallbacks) — fill `.env.local` to go live. `DEMO_MODE=true` forces the precomputed path end-to-end for rehearsal.

Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `DEMO_MODE`. Only `NEXT_PUBLIC_SUPABASE_*` are ever browser-exposed; verified by scanning the built client bundles.

## Demo script (3–5 min)

1. **Hook (0:00)** — "Tradies don't lose money because they can't write a quote template. They lose money when a vague enquiry becomes a fixed price before the scope is clear."
2. **Raw problem (0:25)** — open Jordan's enquiry; two photos, vague text.
3. **Analysis (0:50)** — hit *Analyse* (live) → structured facts, 60%, inspection recommended — "the model didn't decide that; the rules did."
4. **Human approval (1:30)** — draft → edit → approve → "QuoteReady never sends. It drafts."
5. **ElevenLabs (2:00)** — record or *Use demo note* → transcript → extracted update → **what changed** → apply → v2 scope, inspection now required.
6. **Safety (2:45)** — Sam's job: gas smell → escalation card, estimate blocked.
7. **Close (3:15)** — evaluation page 10/10; faster qualification, fewer wasted visits, fewer underquoted jobs.
