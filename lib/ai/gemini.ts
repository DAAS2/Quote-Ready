import { GoogleGenAI } from "@google/genai";
import {
  GeminiAnalysisSchema,
  VoiceUpdateSchema,
  type GeminiAnalysis,
  type VoiceUpdate,
} from "./schemas";
import {
  EXTRACTION_SYSTEM_PROMPT,
  VOICE_UPDATE_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  buildVoiceUpdateUserPrompt,
} from "./prompts";

/* ────────────────────────────────────────────────────────────────────────────
 * Gemini extraction. One multimodal call, strict JSON, Zod-validated.
 * Any failure here is surfaced to the caller — the workflow decides the
 * fallback, this module never fabricates.
 * ──────────────────────────────────────────────────────────────────────────── */

export const GEMINI_CONFIGURED = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "api" | "empty_response" | "invalid_json" | "schema",
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface ModelImage {
  mimeType: string;
  base64: string;
}

function getClient(): GoogleGenAI {
  if (!GEMINI_CONFIGURED) {
    throw new GeminiError("GOOGLE_GENERATIVE_AI_API_KEY is not set", "not_configured");
  }
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
}

const MODEL = "gemini-2.5-flash";

export async function extractJobFacts(input: {
  enquiry_text: string;
  job_type: GeminiAnalysis["job_type"] | null;
  customer_suburb?: string | null;
  images: ModelImage[];
}): Promise<GeminiAnalysis> {
  const ai = getClient();
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: buildExtractionUserPrompt({ ...input, photo_count: input.images.length }) },
  ];
  input.images.forEach((img, i) => {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    });
    void i;
  });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: EXTRACTION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 2048,
        // skip "thinking" for speed + deterministic cost in a small extraction task
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    text = response.text;
  } catch (error) {
    throw new GeminiError(
      `Gemini API call failed: ${(error as Error).message}`,
      "api",
    );
  }

  if (!text || text.trim() === "") {
    throw new GeminiError("Gemini returned an empty response", "empty_response");
  }

  let json: unknown;
  try {
    json = JSON.parse(stripToFence(text));
  } catch {
    throw new GeminiError(`Gemini response was not valid JSON`, "invalid_json");
  }

  const parsed = GeminiAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    throw new GeminiError(
      `Gemini response failed schema validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      "schema",
    );
  }
  return parsed.data;
}

/** Tolerate accidental markdown fences around the JSON. */
function stripToFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/* ── Voice-note structured update ────────────────────────────────────────── */

export async function extractVoiceUpdate(transcript: string): Promise<VoiceUpdate> {
  const ai = getClient();

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: buildVoiceUpdateUserPrompt(transcript) }] }],
      config: {
        systemInstruction: VOICE_UPDATE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    text = response.text;
  } catch (error) {
    throw new GeminiError(`Gemini API call failed: ${(error as Error).message}`, "api");
  }

  if (!text || text.trim() === "") {
    throw new GeminiError("Gemini returned an empty response", "empty_response");
  }

  let json: unknown;
  try {
    json = JSON.parse(stripToFence(text));
  } catch {
    throw new GeminiError("Gemini response was not valid JSON", "invalid_json");
  }

  const parsed = VoiceUpdateSchema.safeParse(json);
  if (!parsed.success) {
    throw new GeminiError(
      `Voice update failed schema validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      "schema",
    );
  }
  return parsed.data;
}
