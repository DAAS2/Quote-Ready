import { NextResponse } from "next/server";
import { transcribeAudio, ELEVENLABS_CONFIGURED, ElevenLabsError } from "@/lib/elevenlabs/client";
import { extractIntakeFields, GEMINI_CONFIGURED, GeminiError } from "@/lib/ai/gemini";
import type { IntakeExtraction } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/** Best-effort fields when Gemini is unavailable — never fabricate a name. */
function fallbackFields(transcript: string): IntakeExtraction {
  const phone = transcript.match(/\b(0\d[\d\s]{7,11}\d)\b/)?.[1]?.trim();
  return {
    ...(phone ? { phone } : {}),
    message: transcript.trim().slice(0, 1200),
  };
}

/**
 * POST /api/intake/transcribe
 * Multipart: { audio: Blob } — a dictated new enquiry.
 * Pipeline: ElevenLabs Scribe (verbatim) → Gemini (map into form fields).
 * Nothing is persisted; the user reviews the fields before creating the job.
 */
export async function POST(request: Request) {
  try {
    if (!ELEVENLABS_CONFIGURED) {
      return NextResponse.json(
        { error: "Voice intake is not configured — type the enquiry details instead." },
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

    let transcript: string;
    try {
      transcript = await transcribeAudio(buffer, audio.name || "intake.webm", mimeType);
    } catch (error) {
      if (error instanceof ElevenLabsError && error.kind === "no_speech") {
        return NextResponse.json(
          { error: "No speech was detected — check the microphone and try again." },
          { status: 422 },
        );
      }
      console.warn("[QuoteReady] intake transcription failed:", (error as Error).message);
      return NextResponse.json(
        { error: "Transcription failed — type the enquiry details instead." },
        { status: 502 },
      );
    }

    if (transcript.trim().length < 3) {
      return NextResponse.json(
        { error: "No speech was detected — check the microphone and try again." },
        { status: 422 },
      );
    }

    if (!GEMINI_CONFIGURED) {
      return NextResponse.json({
        ok: true,
        transcript,
        fields: fallbackFields(transcript),
        extracted: false,
      });
    }

    try {
      const fields = await extractIntakeFields(transcript);
      return NextResponse.json({ ok: true, transcript, fields, extracted: true });
    } catch (error) {
      const kind = error instanceof GeminiError ? error.kind : "api";
      console.warn(`[QuoteReady] intake field extraction failed (${kind}):`, (error as Error).message);
      // The transcript is still useful — let the operator place it by hand.
      return NextResponse.json({
        ok: true,
        transcript,
        fields: fallbackFields(transcript),
        extracted: false,
      });
    }
  } catch (error) {
    console.error("[QuoteReady] intake transcribe failed:", error);
    return NextResponse.json(
      { error: "Transcription failed — type the enquiry details instead." },
      { status: 502 },
    );
  }
}
