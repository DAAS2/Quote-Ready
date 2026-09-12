import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { canTransition } from "@/lib/rules/status";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  try {
    const { id, draftId } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    let editedBody: string | undefined;
    try {
      const json = await request.json();
      if (typeof json?.body === "string" && json.body.trim().length > 0) {
        editedBody = json.body.trim().slice(0, 4000);
      }
    } catch {
      // no body provided — fine
    }

    const draft = job.drafts.find((d) => d.id === draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }
    if (draft.status !== "draft") {
      return NextResponse.json({ error: "Draft was already approved." }, { status: 409 });
    }

    // Human-only transition, enforced server-side.
    if (!canTransition(job.status, "follow_up_approved", "user")) {
      return NextResponse.json(
        { error: `Cannot approve a follow-up from status "${job.status}".` },
        { status: 409 },
      );
    }

    await store.approveDraft(id, draftId, editedBody);
    await store.setJobStatus(id, "follow_up_approved");
    await store.addAudit(id, {
      actor_type: "user",
      event_type: "follow_up_approved",
      summary: "Follow-up approved by operator — nothing was sent automatically.",
      metadata: { draft_id: draftId, message_type: draft.message_type },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] approve failed:", error);
    return NextResponse.json({ error: "Could not approve the draft." }, { status: 500 });
  }
}
