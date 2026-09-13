import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { renderQuoteDocx } from "@/lib/quotes/render-docx";
import { renderQuotePdf } from "@/lib/quotes/render-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Filesystem-safe file name stem, e.g. "Quote-Q-2026-0001-Jordan-Smith". */
function fileStem(quoteNumber: string, customerName: string): string {
  const customer = customerName
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `Quote-${quoteNumber}${customer ? `-${customer}` : ""}`;
}

/**
 * GET /api/quotes/[id]/download?format=docx|pdf
 * Renders the quote on demand from its stored document — no files are kept in
 * storage, so a quote download always reflects the latest saved revision.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const quote = await store.getQuote(id);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });

    const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";
    const rendered = { document: quote.document, totals: quote.totals, status: quote.status };
    const stem = fileStem(quote.quote_number, quote.customer_name);

    const bytes = format === "pdf" ? await renderQuotePdf(rendered) : await renderQuoteDocx(rendered);
    const body = new Uint8Array(bytes);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : DOCX_TYPE,
        "Content-Disposition": `attachment; filename="${stem}.${format}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[QuoteReady] quote download failed:", error);
    return NextResponse.json({ error: "Could not generate the quote document." }, { status: 500 });
  }
}
