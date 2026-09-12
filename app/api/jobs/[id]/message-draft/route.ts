import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";
import { buildMessageDraft } from "@/lib/rules/message-templates";
import { canTransition } from "@/lib/rules/status";

export const runtime = "nodejs";

const BodySchema = z.object({
  /** optional operator-edited body; when absent the deterministic draft is used */
  body: z.string().trim().min(1).max(4000).optional(),
  customer_name: z.string().trim().max(120).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    if (!job.scope) {
      return NextResponse.json(
        { error: "Analyse the enquiry before drafting a message." },
        { status: 409 },
      );
    }

    let edited: z.infer<typeof BodySchema> | null = null;
    try {
      edited = BodySchema.parse(await request.json());
    } catch {
      edited = null;
    }

    const draft = buildMessageDraft(job.scope, edited?.customer_name ?? job.customer.full_name);
    const draftId = await store.addDraft(id, {
      message_type: draft.message_type,
      body: edited?.body ?? draft.body,
      requests_fields: draft.requests_fields,
    });

    // Creating a draft is a user action: move the job into follow_up_drafted
    if (canTransition(job.status, "follow_up_drafted", "user")) {
      await store.setJobStatus(id, "follow_up_drafted");
    }

    await store.addAudit(id, {
      actor_type: "user",
      event_type: "draft_created",
      summary: `Customer follow-up drafted (${draft.message_type.replace(/_/g, " ")}).`,
      metadata: { draft_id: draftId },
    });

    return NextResponse.json({ ok: true, draft_id: draftId, draft }, { status: 201 });
  } catch (error) {
    console.error("[QuoteReady] draft failed:", error);
    return NextResponse.json({ error: "Could not create the draft." }, { status: 500 });
  }
}
