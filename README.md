# QuoteReady

> Turns vague trade enquiries into quote-ready job scopes — showing exactly what is known, missing, assumed, unsafe, or requires a site inspection before a tradie commits to a price.

**Tracks:** Track 1 — Improve an Existing Business Capability · Built With ElevenLabs

A 48-hour hackathon MVP for small residential plumbing businesses in Melbourne.

---

Full documentation (architecture, evaluation, setup, demo script) lands here at submission. The product below runs today:

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

## What it does (one screen)

Enquiry + photos → **Gemini extracts structured facts** → **deterministic readiness rules** score the job (0–100, fully explainable) → **scope pack** with known/missing/assumed/flagged fields → **human-approved customer follow-up** → **ElevenLabs voice notes** update the scope from the field → full audit timeline.

## Safety boundary

QuoteReady provides an AI-assisted scope-readiness assessment based on supplied information. It does not diagnose faults, guarantee pricing, or replace professional on-site assessment. Review all recommendations before communicating with customers or commencing work. Urgent safety concerns require appropriate professional/emergency action.
