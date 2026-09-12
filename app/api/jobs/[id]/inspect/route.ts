import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { canTransition } from "@/lib/rules/status";

export const runtime = "nodejs";

/** User-only action: mark the job as inspection requested. */
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

    if (!canTransition(job.status, "inspection_requested", "user")) {
      return NextResponse.json(
        { error: `Cannot request an inspection from status "${job.status}".` },
        { status: 409 },
      );
    }

    await store.setJobStatus(id, "inspection_requested");
    await store.addAudit(id, {
      actor_type: "user",
      event_type: "inspection_requested",
      summary: "On-site inspection requested by operator.",
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] inspect request failed:", error);
    return NextResponse.json({ error: "Could not request the inspection." }, { status: 500 });
  }
}
