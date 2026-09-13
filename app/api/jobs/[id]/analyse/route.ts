import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { runQuoteReadyAnalysis } from "@/lib/workflow/quote-ready-graph";
import { resolveJobTemplate } from "@/lib/rules/template-resolve";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    // grade against the organisation's template for this job (or the one the
    // enquiry was filed under) — falling back to the built-in template
    const template = await resolveJobTemplate(store, job).catch(() => undefined);

    const result = await runQuoteReadyAnalysis({
      job_id: id,
      job_type: job.job_type,
      raw_text: job.enquiry_text ?? "",
      customer_suburb: job.customer.suburb ?? null,
      image_paths: job.image_paths,
      existing_version: (job.scope_version ?? 0) + (job.scope ? 1 : 0),
      ...(template ? { template } : {}),
    });

    if (!result.scope) {
      return NextResponse.json(
        { error: result.validation_error ?? "Analysis could not be completed." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      scope: result.scope,
      used_fallback: result.used_fallback,
      validation_error: result.validation_error,
    });
  } catch (error) {
    console.error("[QuoteReady] analyse failed:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again — the demo data is unaffected." },
      { status: 500 },
    );
  }
}
