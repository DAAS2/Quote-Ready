import { GoogleGenAI } from "@google/genai";
import type { ScopePack } from "./schemas";
import { QuoteSuggestionSchema, type QuoteSuggestion } from "@/lib/quotes/schema";
import { quoteDocxSkillBody } from "@/lib/quotes/skill";
import { buildQuoteUserPrompt, quoteSystemPrompt } from "./prompts";
import { GeminiError, GEMINI_CONFIGURED, stripToFence, tryExtractJsonObject } from "./gemini";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote content drafting with Gemini.
 *
 * The model produces CONTENT ONLY — scope summary, unpriced line items and the
 * commercial sections. It has no price field to fill. Output is Zod-validated
 * against QuoteSuggestionSchema; anything that fails is discarded and the
 * deterministic fallback is used instead. The model never sees a price and
 * never issues anything.
 * ──────────────────────────────────────────────────────────────────────────── */

const MODEL = "gemini-3.6-flash";

export interface QuoteDraftInput {
  job_type_label: string;
  customer_name: string;
  customer_suburb?: string | null;
  enquiry_text: string;
  scope: ScopePack | null;
  template: {
    label: string;
    assumptions: string[];
    exclusions: string[];
    questions: Record<string, string>;
  };
}

export async function suggestQuoteContent(input: QuoteDraftInput): Promise<QuoteSuggestion> {
  if (!GEMINI_CONFIGURED) {
    throw new GeminiError("GOOGLE_GENERATIVE_AI_API_KEY is not set", "not_configured");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: buildQuoteUserPrompt(input) }] }],
      config: {
        systemInstruction: quoteSystemPrompt(quoteDocxSkillBody()),
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 4096,
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
    json = tryExtractJsonObject(text);
    if (json === undefined) {
      throw new GeminiError("Gemini response was not valid JSON", "invalid_json");
    }
  }

  const parsed = QuoteSuggestionSchema.safeParse(json);
  if (!parsed.success) {
    throw new GeminiError(
      `Quote suggestion failed schema validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      "schema",
    );
  }
  return parsed.data;
}
