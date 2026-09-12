/* ────────────────────────────────────────────────────────────────────────────
 * Fish Audio (fishaudio/fish-speech) integrations.
 *
 * STT: hosted ASR endpoint — https://api.fish.audio/v1/asr
 * TTS: hosted synthesis — https://api.fish.audio/v1/tts
 *
 * Server-only. Every function throws FishAudioError; the caller owns the
 * fallback chain (Fish → ElevenLabs → manual transcript / text-only).
 * ──────────────────────────────────────────────────────────────────────────── */

export const FISH_AUDIO_CONFIGURED = Boolean(process.env.FISH_AUDIO_API_KEY);

const ASR_URL = "https://api.fish.audio/v1/asr";
const TTS_URL = "https://api.fish.audio/v1/tts";

/**
 * Free TTS model (Fish Audio S2.1 Pro Free) — state-of-the-art voice model,
 * 83 languages, free under Fair Use. Selected via the `model` header.
 */
const TTS_MODEL = "s2.1-pro-free";

export class FishAudioError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "api" | "empty_response",
  ) {
    super(message);
    this.name = "FishAudioError";
  }
}

function apiKey(): string {
  if (!FISH_AUDIO_CONFIGURED) {
    throw new FishAudioError("FISH_AUDIO_API_KEY is not set", "not_configured");
  }
  return process.env.FISH_AUDIO_API_KEY!;
}

/** Transcribe a field recording with Fish Speech ASR (Flash model). */
export async function transcribeWithFish(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append(
    "audio",
    new File([new Uint8Array(buffer)], filename || "site-note.webm", {
      type: mimeType || "audio/webm",
    }),
  );
  form.append("language", "en");

  let res: Response;
  try {
    res = await fetch(ASR_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
      // ASR on long site notes can take a while
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new FishAudioError(`Fish ASR request failed: ${(error as Error).message}`, "api");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FishAudioError(
      `Fish ASR failed (${res.status})${body ? `: ${body.slice(0, 240)}` : ""}`,
      "api",
    );
  }

  let data: { text?: string } | null = null;
  try {
    data = (await res.json()) as { text?: string };
  } catch {
    throw new FishAudioError("Fish ASR returned a non-JSON response", "api");
  }

  const transcript = data?.text?.trim();
  if (!transcript) {
    throw new FishAudioError("Fish ASR returned empty text", "empty_response");
  }
  return transcript;
}

/** Generate a spoken briefing as MP3 bytes with Fish Speech TTS (S2.1 Pro Free). */
export async function speakWithFish(text: string): Promise<Buffer> {
  // A cloned voice id from the Fish Audio workspace, or fall back to the
  // S2.1 Pro Free default voice (no voice config required).
  const referenceId = process.env.FISH_AUDIO_VOICE_ID || TTS_MODEL;

  let res: Response;
  try {
    res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        model: TTS_MODEL,
      },
      body: JSON.stringify({
        text,
        reference_id: referenceId,
        format: "mp3",
        normalize: true,
        latency: "normal",
        streaming: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new FishAudioError(`Fish TTS request failed: ${(error as Error).message}`, "api");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FishAudioError(
      `Fish TTS failed (${res.status})${body ? `: ${body.slice(0, 240)}` : ""}`,
      "api",
    );
  }

  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length === 0) {
    throw new FishAudioError("Fish TTS returned empty audio", "empty_response");
  }
  return audio;
}