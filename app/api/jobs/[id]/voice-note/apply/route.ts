import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { buildVoicePreview } from "@/lib/ai/voice";
import { VoiceUpdateSchema } from "@/lib/ai/schemas";
import { resolveJobTemplate } from "@/lib/rules/template-resolve";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * User-applied voice update: merges the extracted update into the job,
 * re-runs the deterministic rules, and creates a new scope version.
 * Body: { transcript: string, update: VoiceUpdate }
 */
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

    const body = await request.json().catch(() => null);
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim().slice(0, 4000) : "";
    if (transcript.length < 10) {
      return NextResponse.json({ error: "A valid transcript is required." }, { status: 400 });
    }
    const parsedUpdate = VoiceUpdateSchema.safeParse(body?.update);
    if (!parsedUpdate.success) {
      return NextResponse.json(
        { error: "The extracted update failed validation — please re-run the preview." },
        { status: 400 },
      );
    }
    const update = parsedUpdate.data;

    const template = await resolveJobTemplate(store, job).catch(() => undefined);
    const { newPack } = buildVoicePreview(job, transcript, update, template);

    await store.updateJobFacts(id, newPack.facts, newPack, []);

    const ts = new Date().toISOString();
    await store.addEvidence(
      id,
      update.evidence.map((e, i) => ({
        ...e,
        id: `${ts}-v-${i}`,
        created_at: ts,
      })),
    );

    await store.addAudit(id, {
      actor_type: "user",
      event_type: "voice_note_applied",
      summary: `Site note applied — new scope v${newPack.version} (${newPack.readiness_score}%, ${newPack.readiness_band.replace(/_/g, " ")}).`,
      metadata: {
        version: newPack.version,
        transcription: "applied",
        update_notes: update.notes,
      },
    });

    return NextResponse.json({
      ok: true,
      scope: newPack,
      status: newPack.status,
    });
  } catch (error) {
    console.error("[QuoteReady] voice-note apply failed:", error);
    return NextResponse.json(
      { error: "Could not apply the update — please try again." },
      { status: 500 },
    );
  }
}
