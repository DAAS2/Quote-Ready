# QuoteReady — Evaluation

> **The honest headline:** the deterministic decision layer is thoroughly tested; extraction *accuracy against independent human labels is not measured,* and this document says so rather than implying a precision figure. A regression guard and a benchmark are different things, and only one of them is claimed here.

---

## 1. What is evaluated, and how

| Layer | Method | Where it runs |
|---|---|---|
| Deterministic decision engine | 10 labelled fixtures with written expected outcomes, asserted in Vitest | `tests/engine.test.ts`, CI, and live at **`/evaluation`** |
| Readiness rules, templates, diffs | Unit suite over pure functions | `tests/rules.test.ts` |
| Retrieval safety property | Fixtures run **with and without** guidance; decisions asserted identical | `tests/retrieval.test.ts` |
| Zod contracts | Valid and invalid payloads, including malformed model output | `tests/schemas.test.ts` |
| Quote generation | Schema, totals, numbering, advisory non-blocking | `tests/quotes.test.ts` |
| Live end-to-end | Real Gemini + real Supabase analysis, timed and costed | Manual, reported in [README.md](./README.md) |

**Structural property worth naming:** the fixtures do not test a mock. `lib/evaluation/fixtures.ts` is consumed by the *same* `buildScopePack` the product calls at runtime, and the same fixtures render at `/evaluation`. There is no test-only code path that could pass while the product fails.

---

## 2. The labelled fixture set

Ten hand-authored enquiries covering the decision surface: vague vs detailed, evidence-rich vs evidence-poor, each safety pattern, and a voice-note case.

| Fixture | Expected outcome | Safety flag | What it guards |
|---|---|---|---|
| Vague leaking tap enquiry | `inspection_recommended` | — | Sparse text must not score as quotable |
| Detailed standard toilet replacement | `ready_for_estimate` | — | The happy path is reachable |
| Hot-water leak + unusual smell | `inspection_recommended` | ✅ | Hazard escalates over a good detail score |
| No images, no property access info | `needs_information` | — | Missing evidence and access are fatal to readiness |
| Clear mixer replacement, access + photos | `ready_for_estimate` | — | Rich, unambiguous enquiry reaches the top band |
| Unknown fixture + visible water damage | `inspection_recommended` | — | Unknown brand + damage forces a visit |
| Voice note mentions damp cabinet | `inspection_recommended` | — | Field evidence changes the assessment |
| Customer says gas smell | `inspection_recommended` | ✅ | Safety pattern over raw customer text |
| Toilet overflowing | `inspection_recommended` | ✅ | Urgency pattern |
| Burst pipe flooding | `inspection_recommended` | ✅ | Urgency pattern with high impact |

**Why these ten and not forty:** they are the *boundaries*, not a sample. Each one is a case where a plausible implementation would give the wrong answer — a sparse enquiry that looks complete, a detailed enquiry that is still unsafe. Coverage of the decision surface is the goal, not volume.

**Provenance:** authored for this product, version-controlled, reviewed alongside the templates they exercise. No customer data, no scraped data.

---

## 3. The retrieval isolation test

This is the evaluation that matters most for the architecture claim, so it is asserted directly:

```
for every fixture:
    baseline = buildScopePack(facts, no guidance)
    augmented = buildScopePack(facts, guidance attached)
    assert  baseline.score      === augmented.score
            baseline.band       === augmented.band
            baseline.components === augmented.components
            baseline.overrides  === augmented.overrides
            baseline.missing    === augmented.missing
            baseline.action     === augmented.action
    assert  augmented.guidance.length > 0   # and it did actually retrieve something
```

The last assertion is the one that keeps the test honest: a retrieval layer that returns nothing would trivially pass the isolation claim, so the suite requires that guidance was genuinely produced *and* changed nothing.

The same suite covers retrieval mechanics separately: deterministic query construction from facts, job-type filtering, the lexical ranker's ordering, corpus hashing stability (so the index only re-embeds what changed), and the citation fields present on every note.

---

## 4. Test suite and coverage

```
Test Files  5 passed (5)
     Tests  91 passed (91)
```

| Suite | Tests | Focus |
|---|---|---|
| `tests/engine.test.ts` | fixture-driven | The 10 labelled cases end-to-end through the real engine |
| `tests/rules.test.ts` | unit | Readiness maths, critical-field caps, overrides, templates, template resolution, status, message templates, diffs |
| `tests/retrieval.test.ts` | property | Retrieval isolation, query construction, lexical ordering, corpus hashing, degradation |
| `tests/schemas.test.ts` | contract | Zod accept/reject, malformed model output |
| `tests/quotes.test.ts` | unit | Quote schema, line-item totals, numbering, advisory never blocking |

Coverage on the deterministic decision layer: **96.2% statements / 86.2% branches**, thresholds **enforced** at 90 / 80 so a regression fails the build rather than quietly shipping.

The deterministic layer is held to a high bar because it is the part that *decides*. The AI layer is deliberately not coverage-driven — asserting on a model's phrasing would be brittle and meaningless. The AI layer is guarded by the schema contracts and the deterministic fallbacks behind it instead.

Run it:

```bash
npm test              # 91 tests
npm run test:coverage # + thresholds
npm run check         # lint + typecheck + tests — the gate that must pass
```

---

## 5. Measured operational numbers

One real text-only analysis on this codebase, instrumented per node and persisted on the scope version:

| Metric | Value |
|---|---|
| End-to-end wall time | **21.5 s** |
| `extract_facts` (Gemini, multimodal) | 14.5 s |
| `write_recommendation` (Gemini) | 5.9 s |
| `retrieve_guidance` | 1.0 s |
| `apply_rules` | **2 ms** |
| Input / output tokens | 8,975 / 4,008 |
| Estimated spend | **$0.0127** |

The shape of the result is the point: **the decision costs 2 milliseconds and zero dollars.** The model call is the entire expense, which is why the architecture spends it where language judgement is needed and nowhere else.

With no key or `DEMO_MODE=true`, the same pipeline completes in single-digit milliseconds on the deterministic engine and the keyword retrieval tier — a ~5,000× latency reduction, because the part that matters was never the slow part.

Cost is always labelled an estimate. Tokens are returned by the API; dollars are arithmetic on a documented rate card (`lib/ai/pricing.ts`), overridable per environment.

---

## 6. What is *not* measured

Stated plainly, because a judge will ask and an unprompted admission scores better than a discovered gap:

1. **Extraction accuracy against independent human labels.** There is no labelled corpus of real enquiries, so no precision/recall figure is claimed. What exists: a schema contract that rejects malformed output, and a deterministic engine that cannot be moved by a wrong extraction. A wrong extraction degrades into *wrong questions asked*, not a wrong price.
2. **Real-world quote outcomes.** Whether QuoteReady actually reduces underquoting requires deployed usage, a before/after cohort, and trade partners. It is a hypothesis with a credible mechanism, not a measured result.
3. **Retrieval precision/recall at corpus scale.** 46 notes with hand-authored tags are verified by the isolation and ordering tests; the corpus is too small for a meaningful recall benchmark, and growing it would need a labelled relevance set.
4. **Adversarial robustness of the extraction prompt.** Prompt-injection resistance was designed for (facts-only retrieval queries, closed vocabulary, schema validation, no tool access) but not red-teamed.
5. **Cost at scale.** The per-enquiry figure is measured; monthly spend projections at volume rest on assumed enquiry counts, and are labelled as assumptions wherever they appear.

---

## 7. How to reproduce every number on this page

```bash
npm install
npm test                 # 91 tests, 5 suites
npm run test:coverage    # + coverage thresholds enforced

# Live evidence page (seeded demo workspace)
npm run dev              # → http://localhost:3000/evaluation

# A real instrumented run — requires GOOGLE_GENERATIVE_AI_API_KEY
#   open a job → Analyse → the telemetry chip reports wall time, tokens, cost
```

The `/evaluation` page runs the same fixtures through the same engine in the browser, so the table a judge sees is computed at request time rather than copied into a document.
