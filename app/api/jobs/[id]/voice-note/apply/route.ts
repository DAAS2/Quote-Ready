import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildVoicePreview } from "@/lib/ai/voice";
import { retrieveServiceGuidance } from "@/lib/ai/retrieval";
import { VoiceUpdateSchema } from "@/lib/ai/schemas";
import { resolveJobTemplate } from "@/lib/rules/template-resolve";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * User-applied voice update: merges the extracted update into the job,
 * re-runs the deterministic rules, and creates a new scope version.
 *
 * Body: JSON { transcript, update }
 *   or multipart { transcript, update (JSON string), audio? } — the recorded
 *   voicenote is stored in Supabase Storage so it can be replayed later.
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

    const contentType = request.headers.get("content-type") ?? "";
    let rawTranscript = "";
    let rawUpdate: unknown = null;
    let audio: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      rawTranscript = typeof form.get("transcript") === "string" ? (form.get("transcript") as string) : "";
      const updateField = form.get("update");
      if (typeof updateField === "string") {
        try {
          rawUpdate = JSON.parse(updateField);
        } catch {
          return NextResponse.json({ error: "The extracted update could not be read." }, { status: 400 });
        }
      }
      const file = form.get("audio");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_AUDIO_BYTES) {
          return NextResponse.json({ error: "The recording is too long (max 15 MB)." }, { status: 400 });
        }
        audio = file;
      }
    } else {
      const body = await request.json().catch(() => null);
      rawTranscript = typeof body?.transcript === "string" ? body.transcript : "";
      rawUpdate = body?.update ?? null;
    }

    const transcript = rawTranscript.trim().slice(0, 4000);
    if (transcript.length < 10) {
      return NextResponse.json({ error: "A valid transcript is required." }, { status: 400 });
    }
    const parsedUpdate = VoiceUpdateSchema.safeParse(rawUpdate);
    if (!parsedUpdate.success) {
      return NextResponse.json(
        { error: "The extracted update failed validation — please re-run the preview." },
        { status: 400 },
      );
    }
    const update = parsedUpdate.data;

    const template = await resolveJobTemplate(store, job).catch(() => undefined);
    const { newPack } = buildVoicePreview(job, transcript, update, template);

    // Retrieval re-runs against the MERGED facts, not the old ones: a field note
    // can change which playbook guidance applies to the job, and that change is
    // part of what the operator reviews on the new version.
    const guidance = await retrieveServiceGuidance({
      job_type: newPack.job_type,
      facts: newPack.facts,
      risk_flags: newPack.risk_flags.map((f) => f.id),
      missing_fields: newPack.missing_fields.map((m) => m.key),
    });
    const pack = { ...newPack, guidance: guidance.notes };

    await store.updateJobFacts(id, pack.facts, pack, []);

    // Persist the recording (when one was sent) so the voicenote is replayable.
    const storagePath = audio ? await storeVoiceNote(id, audio) : null;

    const ts = new Date().toISOString();
    await store.addEvidence(
      id,
      update.evidence.map((e, i) => ({
        ...e,
        id: `${ts}-v-${i}`,
        ...(i === 0 && storagePath ? { storage_path: storagePath } : {}),
        created_at: ts,
      })),
    );

    await store.addAudit(id, {
      actor_type: "user",
      event_type: "voice_note_applied",
      summary: `Site note applied — new scope v${pack.version} (${pack.readiness_score}%, ${pack.readiness_band.replace(/_/g, " ")}).`,
      metadata: {
        version: pack.version,
        transcription: "applied",
        audio_stored: Boolean(storagePath),
        update_notes: update.notes,
        retrieval_mode: guidance.mode,
        guidance: guidance.notes.map((g) => ({ id: g.id, reference: g.reference, score: g.score })),
      },
    });

    return NextResponse.json({
      ok: true,
      scope: pack,
      status: pack.status,
      audio_stored: Boolean(storagePath),
      guidance_mode: guidance.mode,
    });
  } catch (error) {
    console.error("[QuoteReady] voice-note apply failed:", error);
    return NextResponse.json(
      { error: "Could not apply the update — please try again." },
      { status: 500 },
    );
  }
}

/**
 * Upload the recording to the private `voice-notes` bucket and return its
 * storage path (null when Storage is unavailable — the note still applies,
 * it simply has no saved audio).
 */
async function storeVoiceNote(jobId: string, audio: File): Promise<string | null> {
  const db = getServerSupabase();
  if (!db) return null;
  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("wav") ? "wav" : "webm";
    const path = `jobs/${jobId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("voice-notes").upload(path, buffer, {
      contentType: audio.type || "audio/webm",
      upsert: false,
    });
    if (error) throw error;
    return path;
  } catch (error) {
    console.warn("[QuoteReady] voice-note audio upload failed:", (error as Error).message);
    return null;
  }
}
