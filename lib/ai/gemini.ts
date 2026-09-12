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

const MODEL = "gemini-3.6-flash";

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
        maxOutputTokens: 4096,
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
    // Robust recovery: scan for the first balanced JSON object — models
    // occasionally wrap or truncate; never fabricate, but salvage valid output.
    json = tryExtractJsonObject(text);
    if (json === undefined) {
      console.warn("[QuoteReady] Gemini JSON parse failed, raw head:", text.slice(0, 160));
      throw new GeminiError(`Gemini response was not valid JSON`, "invalid_json");
    }
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

/** Find the first balanced top-level JSON object/array in arbitrary text. */
function tryExtractJsonObject(text: string): unknown | undefined {
  const candidates: string[] = [];
  const starts: number[] = [];
  const stack: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // skip string contents
      i++;
      while (i < text.length) {
        if (text[i] === "\\") i += 2;
        else if (text[i] === '"') break;
        else i++;
      }
      continue;
    }
    if (ch === "{" || ch === "[") {
      starts.push(i);
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      if (stack.length === 0) continue;
      const open = stack.pop()!;
      if ((open === "{" && ch === "}") || (open === "[" && ch === "]")) {
        if (stack.length === 0) {
          const start = starts.pop()!;
          candidates.push(text.slice(start, i + 1));
        }
      }
    }
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next balanced block
    }
  }
  return undefined;
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
        maxOutputTokens: 2048,
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
