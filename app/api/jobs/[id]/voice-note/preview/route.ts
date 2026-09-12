import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { buildVoicePreview } from "@/lib/ai/voice";
import { deterministicVoiceUpdate } from "@/lib/ai/voice";
import { extractVoiceUpdate, GEMINI_CONFIGURED } from "@/lib/ai/gemini";
import { VoiceUpdateSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/jobs/[id]/voice-note/preview
 * Extracts the structured update from a spoken-note transcript and previews
 * what would change — nothing is persisted. The user approves via /apply.
 * Body: { transcript: string }
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
    const transcript =
      typeof body?.transcript === "string" ? body.transcript.trim().slice(0, 4000) : "";
    if (transcript.length < 10) {
      return NextResponse.json({ error: "A transcript of at least 10 characters is required." }, { status: 400 });
    }

    let update;
    let usedFallback = false;
    if (GEMINI_CONFIGURED) {
      try {
        update = await extractVoiceUpdate(transcript);
      } catch {
        update = deterministicVoiceUpdate(transcript);
        usedFallback = true;
      }
    } else {
      update = deterministicVoiceUpdate(transcript);
      usedFallback = true;
    }

    const validated = VoiceUpdateSchema.safeParse(update);
    if (!validated.success) {
      return NextResponse.json(
        { error: "The extracted update failed validation." },
        { status: 422 },
      );
    }

    const preview = buildVoicePreview(job, transcript, validated.data);

    return NextResponse.json({
      ok: true,
      used_fallback: usedFallback,
      update: validated.data,
      preview: {
        next_version: preview.nextVersion,
        readiness_score: preview.newPack.readiness_score,
        readiness_band: preview.newPack.readiness_band,
        recommended_action: preview.newPack.recommended_action,
        inspection_recommended: preview.newPack.inspection_recommended,
      },
    });
  } catch (error) {
    console.error("[QuoteReady] voice-note preview failed:", error);
    return NextResponse.json(
      { error: "Could not read the note — please try again." },
      { status: 500 },
    );
  }
}
