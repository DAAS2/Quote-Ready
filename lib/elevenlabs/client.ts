import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/* ────────────────────────────────────────────────────────────────────────────
 * ElevenLabs integrations: Scribe speech-to-text for field notes and TTS for
 * pre-call briefings. Server-only. Every function degrades gracefully — the
 * caller owns the fallback (manual transcript entry / text-only briefing).
 * ──────────────────────────────────────────────────────────────────────────── */

export const ELEVENLABS_CONFIGURED = Boolean(process.env.ELEVENLABS_API_KEY);

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!ELEVENLABS_CONFIGURED) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not set", "not_configured");
  }
  if (!client) {
    client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });
  }
  return client;
}

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "api" | "voice_not_available" | "no_speech",
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

/**
 * Transcribe a field recording with Scribe.
 *
 * Throws `kind: "no_speech"` when the API accepts and decodes the audio but
 * hears no speech in it — that is a recording problem (silent / wrong input
 * device / stopped too early), not an API failure, and callers should say so.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  try {
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType || "audio/webm" });
    const response = await getClient().speechToText.convert({
      file,
      modelId: "scribe_v1",
      languageCode: "en",
    });
    const transcript = response.text?.trim();
    if (!transcript) {
      console.warn(
        `[QuoteReady] Scribe decoded the audio but heard no speech (${filename}, ${mimeType || "unknown"}, ${buffer.length} bytes).`,
      );
      throw new ElevenLabsError(
        "No speech was detected in that recording",
        "no_speech",
      );
    }
    return transcript;
  } catch (error) {
    if (error instanceof ElevenLabsError) throw error;
    throw new ElevenLabsError(`Transcription failed: ${(error as Error).message}`, "api");
  }
}

/** Generate a spoken briefing as MP3 bytes. */
export async function speakText(text: string): Promise<Buffer> {
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const audioStream = await getClient().textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });
    const chunks: Buffer[] = [];
    const reader = audioStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    const mp3 = Buffer.concat(chunks);
    if (mp3.length === 0) {
      throw new ElevenLabsError("TTS returned empty audio", "api");
    }
    return mp3;
  } catch (error) {
    if (error instanceof ElevenLabsError) throw error;
    const status = (error as { status?: number }).status;
    if (status === 402) {
      // Free accounts can only use voices they have cloned themselves.
      throw new ElevenLabsError(
        "The configured voice requires a paid plan. Create an instant-cloned voice in ElevenLabs and set ELEVENLABS_VOICE_ID to it.",
        "voice_not_available",
      );
    }
    throw new ElevenLabsError(`Speech generation failed: ${(error as Error).message}`, "api");
  }
}
