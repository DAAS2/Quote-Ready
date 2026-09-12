import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { transcribeAudio, ELEVENLABS_CONFIGURED } from "@/lib/elevenlabs/client";
import { extractVoiceUpdate, GEMINI_CONFIGURED, GeminiError } from "@/lib/ai/gemini";
import { isDemoMode } from "@/lib/ai/demo-mode";
import { buildVoicePreview, deterministicVoiceUpdate } from "@/lib/ai/voice";
import { mergeFacts } from "@/lib/rules/merge";
import { DEMO_VOICE_NOTE } from "@/lib/data/demo-seed";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * Voice-note preview: transcribe (if audio), extract structured update,
 * compute the diff — but persist NOTHING until the operator applies it.
 * Body: multipart with `audio` file, or JSON { transcript }.
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
    let transcript: string;
    let transcriptionSource: "elevenlabs" | "manual";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const audio = form.get("audio");
      if (!(audio instanceof File) || audio.size === 0) {
        return NextResponse.json({ error: "No audio received." }, { status: 400 });
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: "Recording is too large (max 15MB)." }, { status: 400 });
      }
      if (isDemoMode() || !ELEVENLABS_CONFIGURED) {
        return NextResponse.json(
          {
            error: "Transcription is unavailable in this mode. Paste the transcript instead.",
            demo_transcript: DEMO_VOICE_NOTE.transcript,
          },
          { status: 503 },
        );
      }
      try {
        transcript = await transcribeAudio(
          Buffer.from(await audio.arrayBuffer()),
          audio.name || "site-note.webm",
          audio.type,
        );
        transcriptionSource = "elevenlabs";
      } catch (error) {
        console.warn("[QuoteReady] STT failed:", (error as Error).message);
        return NextResponse.json(
          {
            error: "Transcription failed — you can paste the transcript instead.",
            demo_transcript: DEMO_VOICE_NOTE.transcript,
          },
          { status: 503 },
        );
      }
    } else {
      const body = (await request.json().catch(() => null)) as { transcript?: string } | null;
      const t = body?.transcript?.trim();
      if (!t || t.length < 10) {
        return NextResponse.json(
          { error: "A transcript of at least 10 characters is required." },
          { status: 400 },
        );
      }
      transcript = t.slice(0, 4000);
      transcriptionSource = "manual";
    }

    if (isDemoMode() || !GEMINI_CONFIGURED) {
      // Deterministic fallback path: keyword-based extraction, honestly labelled.
      const update = deterministicVoiceUpdate(transcript);
      const preview = buildVoicePreview(job, transcript, update);
      return NextResponse.json({
        ok: true,
        transcript,
        transcription_source: transcriptionSource,
        extracted_via: "deterministic_fallback",
        update,
        preview,
      });
    }

    let update;
    try {
      update = await extractVoiceUpdate(transcript);
    } catch (error) {
      const kind = error instanceof GeminiError ? error.kind : "api";
      console.warn("[QuoteReady] voice extraction failed:", (error as Error).message);
      return NextResponse.json(
        {
          error:
            kind === "not_configured"
              ? "Live extraction is unavailable (no Gemini key). Paste the demo transcript for the guided demo."
              : "Extraction failed — please try again or paste the transcript again.",
          demo_transcript: DEMO_VOICE_NOTE.transcript,
        },
        { status: 503 },
      );
    }

    const preview = buildVoicePreview(job, transcript, update);
    return NextResponse.json({
      ok: true,
      transcript,
      transcription_source: transcriptionSource,
      extracted_via: "gemini",
      update,
      preview,
    });
  } catch (error) {
    console.error("[QuoteReady] voice-note preview failed:", error);
    return NextResponse.json(
      { error: "Voice note processing failed — please try again." },
      { status: 500 },
    );
  }
}
