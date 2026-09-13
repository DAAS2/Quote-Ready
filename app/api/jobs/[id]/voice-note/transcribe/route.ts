import { NextResponse } from "next/server";
import { transcribeAudio, ELEVENLABS_CONFIGURED, ElevenLabsError } from "@/lib/elevenlabs/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * POST /api/jobs/[id]/voice-note/transcribe
 * Multipart: { audio: Blob } — the recorded site-note audio.
 * Returns { transcript } (verbatim). Nothing is persisted here; the user
 * reviews the transcript before applying it via /apply.
 * Engine: ElevenLabs Scribe (`scribe_v1`) is the only speech-to-text engine.
 * If it is unavailable, the operator can type or paste the transcript instead.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params; // job context (route lives under [id]); audio is self-contained

    if (!ELEVENLABS_CONFIGURED) {
      return NextResponse.json(
        { error: "Automatic transcription is not configured — type or paste the transcript instead." },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "No audio was provided." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "The recording is too long (max 15 MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const mimeType = (audio.type && audio.type !== "" ? audio.type : "audio/webm").split(";")[0]!;
    console.info(
      `[QuoteReady] transcribing ${buffer.length} bytes of ${mimeType} with ElevenLabs Scribe`,
    );

    try {
      const transcript = await transcribeAudio(buffer, audio.name || "site-note.webm", mimeType);
      if (transcript.trim().length < 3) {
        return NextResponse.json(
          { error: "No speech was detected in that recording — check the microphone and try again, or type the transcript." },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, engine: "elevenlabs_scribe", transcript });
    } catch (error) {
      // "Heard nothing" is a recording problem, not an outage — say so plainly
      // so the operator checks their mic instead of retrying blindly.
      if (error instanceof ElevenLabsError && error.kind === "no_speech") {
        return NextResponse.json(
          { error: "No speech was detected in that recording — check the microphone and try again, or type the transcript." },
          { status: 422 },
        );
      }
      console.warn("[QuoteReady] Scribe transcription failed:", (error as Error).message);
      return NextResponse.json(
        { error: "Automatic transcription failed — type or paste the transcript instead." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[QuoteReady] transcribe failed:", error);
    return NextResponse.json(
      { error: "Automatic transcription failed — type or paste the transcript instead." },
      { status: 502 },
    );
  }
}
