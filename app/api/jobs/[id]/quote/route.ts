import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";
import { getServerProfile } from "@/lib/data/org";
import { JOB_TEMPLATES } from "@/lib/rules/job-templates";
import { nextQuoteNumber } from "@/lib/quotes/numbering";
import { prepareQuote, resolvePreparedBy, resolveQuoteBusiness } from "@/lib/quotes/prepare";

export const runtime = "nodejs";
export const maxDuration = 60;

const CreateQuoteBody = z.object({
  validity_days: z.number().int().min(0).max(365).default(30),
  deposit_percent: z.number().min(0).max(100).default(0),
  /** the operator saw the advisory warnings and chose to proceed anyway */
  acknowledge: z.boolean().default(false),
});

/** GET /api/jobs/[id]/quote — every quote prepared for this job, newest first. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    const quotes = await store.listQuotes(id);
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("[QuoteReady] list quotes failed:", error);
    return NextResponse.json({ error: "Could not load quotes." }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/quote
 * Prepare a new draft quote for a job. Drafting uses Gemini when available and
 * falls back to a deterministic scope-derived suggestion otherwise. Prices are
 * always left at zero for the operator to fill in.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const parsed = CreateQuoteBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid quote options." }, { status: 400 });
    }

    // a job can be filed under a custom service template — prefer its document
    const templateRow = job.template_id
      ? await store.getTemplate(job.template_id).catch(() => null)
      : null;
    const template = templateRow?.document ?? JOB_TEMPLATES[job.job_type];

    const profile = await getServerProfile().catch(() => null);
    const numbers = await store.listQuoteNumbers();
    const quoteNumber = nextQuoteNumber(numbers);

    const prepared = await prepareQuote({
      job,
      template,
      quoteNumber,
      business: resolveQuoteBusiness(profile),
      preparedBy: resolvePreparedBy(profile),
      validityDays: parsed.data.validity_days,
      depositPercent: parsed.data.deposit_percent,
    });

    const quoteId = await store.createQuote({
      job_id: id,
      quote_number: quoteNumber,
      document: prepared.document,
      totals: prepared.totals,
      status: "draft",
    });

    await store.addAudit(id, {
      actor_type: "user",
      event_type: "quote_created",
      summary: `Quote ${quoteNumber} prepared as a draft (${prepared.drafted_by === "ai" ? "AI-drafted content" : "scope-derived content"}); pricing pending operator review.`,
      metadata: {
        quote_id: quoteId,
        quote_number: quoteNumber,
        drafted_by: prepared.drafted_by,
        acknowledged_warnings: parsed.data.acknowledge,
        validity_days: parsed.data.validity_days,
        deposit_percent: parsed.data.deposit_percent,
      },
    });

    return NextResponse.json(
      { id: quoteId, quote_number: quoteNumber, drafted_by: prepared.drafted_by },
      { status: 201 },
    );
  } catch (error) {
    console.error("[QuoteReady] create quote failed:", error);
    return NextResponse.json({ error: "Could not prepare the quote." }, { status: 500 });
  }
}
