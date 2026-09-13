import { NextResponse } from "next/server";
import { transcribeSiteNote, GEMINI_CONFIGURED, GeminiError } from "@/lib/ai/gemini";
import { transcribeAudio, ELEVENLABS_CONFIGURED } from "@/lib/elevenlabs/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * POST /api/jobs/[id]/voice-note/transcribe
 * Multipart: { audio: Blob } — the recorded site-note audio.
 * Returns { transcript } (verbatim). Nothing is persisted here; the user
 * reviews the transcript before applying it via /apply.
 * Engines: ElevenLabs Scribe first (dedicated STT), Gemini audio as fallback.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params; // job context (route lives under [id]); audio is self-contained

    if (!ELEVENLABS_CONFIGURED && !GEMINI_CONFIGURED) {
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

    // 1. ElevenLabs Scribe (purpose-built speech-to-text)
    if (ELEVENLABS_CONFIGURED) {
      try {
        const transcript = await transcribeAudio(buffer, audio.name || "site-note.webm", mimeType);
        if (transcript.trim().length >= 3) {
          return NextResponse.json({ ok: true, engine: "elevenlabs_scribe", transcript });
        }
        console.warn("[QuoteReady] Scribe transcript was empty/short, trying Gemini:", JSON.stringify(transcript));
      } catch (error) {
        console.warn("[QuoteReady] Scribe transcription failed, trying Gemini:", (error as Error).message);
      }
    }

    // 2. Gemini multimodal audio fallback
    if (GEMINI_CONFIGURED) {
      try {
        const transcript = await transcribeSiteNote({ mimeType, base64: buffer.toString("base64") });
        return NextResponse.json({ ok: true, engine: "gemini", transcript });
      } catch (error) {
        if (error instanceof GeminiError && error.kind === "empty_response") {
          return NextResponse.json(
            { error: "The recording was silent or unreadable — try recording again." },
            { status: 422 },
          );
        }
        console.warn("[QuoteReady] Gemini transcription failed:", (error as Error).message);
      }
    }

    return NextResponse.json(
      { error: "Automatic transcription failed — type or paste the transcript instead." },
      { status: 502 },
    );
  } catch (error) {
    console.error("[QuoteReady] transcribe failed:", error);
    return NextResponse.json(
      { error: "Automatic transcription failed — type or paste the transcript instead." },
      { status: 502 },
    );
  }
}
