import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";

export const runtime = "nodejs";

const BodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

/** PUT /api/jobs/[id]/message-draft/[draftId] — edit a draft's body. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  try {
    const { id, draftId } = await params;
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "A message body is required." }, { status: 400 });
    }

    const job = await store.getJob(id);
    const draft = job?.drafts.find((d) => d.id === draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }
    if (draft.status === "approved") {
      return NextResponse.json({ error: "Approved drafts cannot be edited." }, { status: 409 });
    }

    await store.updateDraftBody(id, draftId, parsed.data.body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] draft edit failed:", error);
    return NextResponse.json({ error: "Could not update the draft." }, { status: 500 });
  }
}