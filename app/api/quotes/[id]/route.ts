import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";
import { QuoteDocumentSchema, QuoteStatusEnum } from "@/lib/quotes/schema";
import { computeTotals } from "@/lib/quotes/totals";

export const runtime = "nodejs";

const PatchQuoteBody = z.object({
  document: QuoteDocumentSchema,
  status: QuoteStatusEnum.optional(),
});

/** GET /api/quotes/[id] — the quote record (document + totals + status). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const quote = await store.getQuote(id);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    return NextResponse.json({ quote });
  } catch (error) {
    console.error("[QuoteReady] load quote failed:", error);
    return NextResponse.json({ error: "Could not load the quote." }, { status: 500 });
  }
}

/**
 * PATCH /api/quotes/[id]
 * Operator edits — line items, prices, sections, status. Totals are always
 * recomputed on the server from the validated document; client totals are
 * never trusted.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await store.getQuote(id);
    if (!existing) return NextResponse.json({ error: "Quote not found." }, { status: 404 });

    const parsed = PatchQuoteBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Quote document is invalid.",
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 12),
        },
        { status: 400 },
      );
    }

    const document = parsed.data.document;
    const totals = computeTotals(document);
    const status = parsed.data.status;

    await store.updateQuote(id, { document, totals, ...(status ? { status } : {}) });

    if (status && status !== existing.status) {
      await store.addAudit(existing.job_id, {
        actor_type: "user",
        event_type: "quote_status_changed",
        summary: `Quote ${existing.quote_number} marked ${status}.`,
        metadata: { quote_id: id, from: existing.status, to: status },
      });
    }

    return NextResponse.json({ ok: true, totals, status: status ?? existing.status });
  } catch (error) {
    console.error("[QuoteReady] update quote failed:", error);
    return NextResponse.json({ error: "Could not save the quote." }, { status: 500 });
  }
}

/** DELETE /api/quotes/[id] — discards a quote (drafts only). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await store.getQuote(id);
    if (!existing) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft quotes can be discarded. Mark it declined instead." },
        { status: 409 },
      );
    }

    await store.deleteQuote(id);
    await store.addAudit(existing.job_id, {
      actor_type: "user",
      event_type: "quote_discarded",
      summary: `Draft quote ${existing.quote_number} discarded.`,
      metadata: { quote_id: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] delete quote failed:", error);
    return NextResponse.json({ error: "Could not discard the quote." }, { status: 500 });
  }
}
