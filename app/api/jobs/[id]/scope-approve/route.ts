import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";

export const runtime = "nodejs";

/**
 * POST /api/jobs/[id]/scope-approve
 * Human-only sign-off: records that the tradie approved the current scope
 * as-is. Adds an audit event; never changes automated state or messages.
 */
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

    await store.addAudit(id, {
      actor_type: "user",
      event_type: "scope_signed_off",
      summary: `Scope v${job.scope_version ?? 1} approved as-is by Alex Miller — ready for estimate preparation review.`,
      metadata: { version: job.scope_version ?? 1 },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] scope sign-off failed:", error);
    return NextResponse.json({ error: "Could not record the sign-off." }, { status: 500 });
  }
}
