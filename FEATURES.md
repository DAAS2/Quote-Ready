# QuoteReady — Feature Overview & Roadmap

> AI-assisted quoting-readiness workspace for small residential plumbing businesses.
> Everything below is **live and verified** unless marked *planned*.

---

## What QuoteReady does (one sentence)

Turns a vague customer enquiry (text, call, photos, voice notes) into a structured, reviewable
job scope that tells the tradie exactly what is known, missing, assumed, unsafe, or requires a
site inspection — **before any price is committed**.

## The core loop

```
Enquiry arrives (text / call / web form / email / walk-in / photos)
  → Gemini extracts structured facts, each with a visible source
  → Deterministic rules engine scores readiness 0–100 (D·E·A·C·R)
  → Scope pack: known facts · missing fields · assumptions · exclusions · risk flags
  → Human-approved customer follow-up (drafted, editable, nothing auto-sends)
  → Field voice notes / operator updates re-run the loop → new scope version
  → Full audit timeline + version history with diffs
```

---

## Feature catalogue (all working)

### Intake
| Feature | What it does |
|---|---|
| Multimodal new enquiry | Channel selector (Text/SMS, Phone call, Web form, Email, Walk-in) changes the guidance + placeholder; drag-&-drop photo upload with previews |
| Live Gemini extraction | `gemini-3.6-flash`, one multimodal call, strict JSON + Zod validation, retry-safe, honest fallback if the API fails |
| Photo evidence | Up to 6 photos per job; certainty-labelled ("medium — fixture looks like a mixer"); insufficient photos raise `insufficient_diagnostic_evidence` |
| Update enquiry | Edit the enquiry text later, add photos, or add an operator note (e.g. second call) — saves as evidence, then **re-runs the full analysis** into a new scope version |

### Readiness engine (deterministic, tested)
| Feature | What it does |
|---|---|
| Score | `readiness = 0.25·D + 0.25·E + 0.20·A + 0.15·C + 0.15·R`, every component visible in the UI |
| Bands | 0–39 needs information · 40–69 inspection recommended · 70–100 ready for estimate |
| Overrides | Missing critical field → cap 69 · safety patterns (gas smell, sewage, flooding, burning) → **safety escalation, estimate blocked** · concealed-leak/damp conditions → inspection required |
| Job templates | Three deep templates (leaking tap, toilet, hot-water) with required/critical fields, questions, assumptions, exclusions, inspection conditions |
| Safety | Regex safety patterns on *raw customer text* (never model paraphrase); UI shows a red escalation card + "do not treat as diagnosis" language |

### Scope pack UI
| Feature | What it does |
|---|---|
| Tabs | Known · Missing · Evidence · Assumptions — with counts, icons and plain-language guidance |
| Known facts | Every extracted fact with a readable label; photos/voice counts shown |
| Missing fields | Critical/ask-customer/on-site badges + *why it matters* per field |
| Evidence | Every claim tied to its source (enquiry text / image_1 / voice_note_1 / operator) with certainty |
| Score breakdown | D·E·A·C·R bars + weights visible in the summary card |
| Why this recommendation | Override reasons rendered in plain English |

### Actions (human-in-the-loop)
| Feature | What it does |
|---|---|
| Draft follow-up | Deterministic message asks only the missing customer-answerable fields (template questions), editable in a dialog |
| Draft manager | Edit any draft inline, approve it, or regenerate from the current scope — nothing is ever sent automatically; approval is logged |
| Request inspection | User-only transition (state machine enforced server-side) |
| Status model | new → band → follow_up_drafted → follow_up_approved → closed; inspection_requested; safety as overlay flag |

### Voice & audio (Built With ElevenLabs)
| Feature | What it does |
|---|---|
| Record site note | In-browser MediaRecorder → Scribe (`scribe_v1`) transcription (server-side, key-protected) |
| Paste transcript | Works with no microphone — the demo note pre-fills it |
| Live extraction | Gemini turns the transcript into structured fact updates + risk flags |
| What changed | Preview diff (facts before → after, new risk flags) **before** anything is applied |
| Apply update | User-approved → new scope version + audit event; score/band re-computed |
| Pre-call briefing | Deterministic spoken summary ("Jordan's enquiry is 62% quote ready… ask about property access"); TTS audio when a cloned voice is configured, written text otherwise |

### Data, resilience, transparency
| Feature | What it does |
|---|---|
| Supabase persistence | Postgres schema + storage buckets; auto-seeds 3 demo jobs on first run |
| Memory fallback | If Supabase is unreachable the entire app keeps working on an in-memory store (status-free — no indicator chip in UI) |
| Demo resilience | Live APIs fail → deterministic fallbacks labelled honestly in the audit timeline |
| Evaluation page | 10 labelled fixtures run through the real engine live — 10/10 passing, mirrored in Vitest (42 tests, ~95% coverage) |
| How it works | AI-vs-rules table, readiness formula, pipeline diagram, safety boundaries |
| Security | Keys server-only (verified against client bundles), Zod on every boundary, no automatic outbound actions |

### Landing page
SplitText hero with parallax + mouse-tilt product mockup · aurora background · infinite outcome
marquee · before/after · animated feature grid with a live "job → status" cycling demo card ·
scroll-drawn pipeline · count-up metrics · proper footer.

---

## Verified end-to-end (browser-tested)

1. Jordan's leaking tap: draft → edit → approve ✓
2. Voice demo note → preview diff → apply → new scope version + audit ✓
3. Live Gemini re-analysis after editing the enquiry text (51% inspection-recommended) ✓
4. Safety job (gas smell) blocks estimate paths ✓
5. Dashboard search/filter instant (no reloads), table + mobile cards, no horizontal scroll at 375px ✓

---

## What we could add next (ranked)

### 1. Professional quote generation — *planned (your idea)*
Generate an actual quote document from a `ready_for_estimate` scope:

- **Library**: `docx` (open-source, MIT) — produces a real `.docx` with professional layout:
  - Company header (name, ABN, phone) + customer block (name, address, suburb)
  - Line items derived from the job template + operator-edit price lines
  - Exclusions section (already structured!) + assumptions
  - GST line, payment terms, validity window, signature block
- **Flow**: job → "Prepare quote" (only when band = ready_for_estimate; blocked otherwise) →
  operator fills/edits line items → preview as **printable HTML** (instant, no conversion) +
  download `.docx` via the `docx` package → stored in Supabase storage, listed on the job page
- **Safety**: quotes are explicitly operator-created; AI only *suggests* scope-based line items
  (e.g. "Replacement mixer cartridge — supply" from template parts), never prices without
  operator entry; retains the audit trail
- Effort: ~4–6 h

### 2. Templates library (lightweight RAG)
Store per-job-type service notes + message guidance in Supabase `pgvector`; retrieve 3–5
snippets to guide draft wording. Fixed JSON templates stay authoritative for rules.

### 3. Multi-user workspace
Auth (Supabase Auth + RLS by organisation), operator vs admin roles, assign jobs to a tradie.

### 4. Calendar/scheduling handoff
"Request inspection" → opens a booking link (no full calendar integration).

### 5. PDF scope pack
Print the scope pack as a branded PDF (`pdf-lib`, MIT) for customer transparency on complex jobs.

### 6. Quote → invoice bridge
Once quotes exist, a one-click "convert to job" and later invoice export (CSV/Xero-style).

### 7. More trades
Add a trade config: templates are already data-driven — one JSON file per trade (electricians,
gas fitters) unlocks the whole engine.

### 8. Cost-awareness
Route extraction to a cheaper model for trivial texts, keep the strong model for photo-heavy
jobs; cache repeated identical enquiries.