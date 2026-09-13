import { GoogleGenAI } from "@google/genai";

/* ────────────────────────────────────────────────────────────────────────────
 * Gemini embeddings — used ONLY to build and query the service-guidance index.
 *
 * Server-only. Every function returns null instead of throwing: retrieval is an
 * enhancement, and a missing key or a flaky response must degrade to the
 * deterministic ranker rather than fail an analysis.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Embedding model. Dimensions MUST match `vector(768)` in migration 0006. */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

export const EMBEDDINGS_CONFIGURED = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
);

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
  }
  return client;
}

async function embed(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[][] | null> {
  if (!EMBEDDINGS_CONFIGURED || texts.length === 0) return null;
  try {
    const response = await getClient().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    const vectors = (response.embeddings ?? []).map((e) => e.values ?? []);
    if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
      console.warn(
        `[QuoteReady] embeddings returned ${vectors.length}/${texts.length} vectors — falling back to deterministic retrieval`,
      );
      return null;
    }
    return vectors;
  } catch (error) {
    console.warn("[QuoteReady] embedding request failed:", (error as Error).message);
    return null;
  }
}

/** Embed corpus notes for indexing (RETRIEVAL_DOCUMENT). */
export function embedDocuments(texts: string[]): Promise<number[][] | null> {
  return embed(texts, "RETRIEVAL_DOCUMENT");
}

/** Embed a retrieval query (RETRIEVAL_QUERY — asymmetric on purpose). */
export async function embedQuery(text: string): Promise<number[] | null> {
  const vectors = await embed([text], "RETRIEVAL_QUERY");
  return vectors?.[0] ?? null;
}
