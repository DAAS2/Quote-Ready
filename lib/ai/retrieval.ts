import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { isDemoMode } from "./demo-mode";
import { embedDocuments, embedQuery } from "./embeddings";
import {
  SERVICE_NOTES,
  SERVICE_NOTE_CORPUS_VERSION,
  buildGuidanceQuery,
  rankNotesLexically,
  serviceNoteHash,
  serviceNoteText,
} from "./service-notes";
import type { JobFacts, JobType } from "./schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Service-guidance retrieval.
 *
 * Two tiers, same corpus:
 *   1. VECTOR — pgvector cosine search over the derived index in Postgres
 *      (supabase/migrations/0006_service_notes.sql), query embedded with
 *      Gemini (RETRIEVAL_QUERY) and matched against note embeddings
 *      (RETRIEVAL_DOCUMENT).
 *   2. LEXICAL — the deterministic ranker in service-notes.ts. No key, no
 *      database, no network. This is the floor the product always has.
 *
 * Both tiers are CITED: every note the operator sees carries its playbook
 * reference and the signals that matched, so guidance is auditable and
 * rejectable rather than ambient.
 *
 * Neither tier can change a decision. Readiness, bands, overrides and the
 * safety escalation are computed in lib/rules before this runs and are never
 * passed through here.
 * ──────────────────────────────────────────────────────────────────────────── */

export const MIN_VECTOR_SCORE = 0.55;
export const MAX_GUIDANCE_NOTES = 3;
export const SERVICE_NOTE_TABLE = "service_notes";
export const SERVICE_NOTE_MATCH_FN = "match_service_notes";

export type RetrievalMode = "vector" | "lexical";

export interface RetrievedNote {
  id: string;
  title: string;
  body: string;
  source: string;
  reference: string;
  job_type: string;
  /** cosine similarity (vector) or normalised match score (lexical) */
  score: number;
  matched_on: string[];
}

export interface GuidanceResult {
  notes: RetrievedNote[];
  mode: RetrievalMode;
  ms: number;
  corpus_version: string;
  /** why the vector tier was skipped — surfaced in diagnostics, never to customers */
  fallback_reason?: string;
}

export interface RetrieveGuidanceInput {
  job_type: JobType;
  facts: JobFacts;
  risk_flags?: string[];
  missing_fields?: string[];
}

function toRetrieved(note: { id: string } & Record<string, unknown>, score: number, matched: string[]): RetrievedNote | null {
  const { id, title, body, source, reference, job_type } = note as {
    id: string;
    title: string;
    body: string;
    source: string;
    reference: string;
    job_type: string;
  };
  if (!title || !body) return null;
  return {
    id,
    title,
    body,
    source: source ?? "QuoteReady service playbook",
    reference: reference ?? id,
    job_type: job_type ?? "any",
    score: Number(score.toFixed(3)),
    matched_on: matched,
  };
}

/**
 * Retrieve the service guidance for a job's structured facts.
 *
 * Never throws: any failure in the vector tier falls through to the
 * deterministic ranker from the same corpus.
 */
export async function retrieveServiceGuidance(
  input: RetrieveGuidanceInput,
): Promise<GuidanceResult> {
  const started = Date.now();
  const query = buildGuidanceQuery(input);

  const lexical = (reason?: string): GuidanceResult => ({
    notes: lexicalGuidance(input),
    mode: "lexical",
    ms: Date.now() - started,
    corpus_version: SERVICE_NOTE_CORPUS_VERSION,
    ...(reason ? { fallback_reason: reason } : {}),
  });

  // Demo/rehearsal runs make no live calls at all.
  if (isDemoMode()) return lexical("demo_mode");

  const db = getServerSupabase();
  if (!db) return lexical("no_database");

  const vector = await embedQuery(query.text);
  if (!vector) return lexical("embeddings_unavailable");

  try {
    await ensureServiceNoteIndex(db);
  } catch (error) {
    console.warn("[QuoteReady] service-note index refresh failed:", (error as Error).message);
  }

  const { data, error } = await db.rpc(SERVICE_NOTE_MATCH_FN, {
    query_embedding: vector,
    query_job_type: input.job_type,
    match_count: MAX_GUIDANCE_NOTES,
    min_similarity: MIN_VECTOR_SCORE,
  });

  if (error) {
    console.warn("[QuoteReady] vector search unavailable:", error.message);
    return lexical("vector_search_failed");
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const notes = rows
    .map((row) => {
      const score = Number(row.score ?? row.similarity ?? 0);
      const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      // tags explain *why* a note surfaced, without exposing the vector itself
      const matched = tags.filter((t) => query.signals.includes(t.toLowerCase()));
      return toRetrieved(row as { id: string } & Record<string, unknown>, score, matched);
    })
    .filter((n): n is RetrievedNote => n !== null);

  if (notes.length === 0) return lexical("no_vector_matches");

  return {
    notes,
    mode: "vector",
    ms: Date.now() - started,
    corpus_version: SERVICE_NOTE_CORPUS_VERSION,
  };
}

/**
 * The deterministic tier, callable synchronously.
 *
 * Used directly by seeding (which must not await a network call) and by every
 * vector-tier failure path. No key, no database, no embeddings — same corpus,
 * same job-type filtering, same citations.
 */
export function lexicalGuidance(input: RetrieveGuidanceInput): RetrievedNote[] {
  return rankNotesLexically(
    buildGuidanceQuery(input),
    MAX_GUIDANCE_NOTES,
  ).map((r) => ({
    id: r.note.id,
    title: r.note.title,
    body: r.note.body,
    source: r.note.source,
    reference: r.note.reference,
    job_type: r.note.job_type,
    score: r.score,
    matched_on: r.matched_on,
  }));
}

/* ── Derived index maintenance ───────────────────────────────────────────── */

/**
 * Bring the Postgres index in line with the in-code corpus.
 *
 * The corpus is the source of truth and the table is a cache: notes are hashed
 * by content, so only new or edited notes are re-embedded. Memoised per server
 * instance so concurrent analyses don't stampede the embeddings API.
 */
let indexPromise: Promise<{ upserted: number; total: number }> | null = null;

export function ensureServiceNoteIndex(
  db: SupabaseClient,
  options: { force?: boolean } = {},
): Promise<{ upserted: number; total: number }> {
  if (options.force) indexPromise = null;
  if (!indexPromise) {
    indexPromise = refreshIndex(db).catch((error) => {
      indexPromise = null; // allow a later retry
      throw error;
    });
  }
  return indexPromise;
}

async function refreshIndex(db: SupabaseClient): Promise<{ upserted: number; total: number }> {
  const ids = SERVICE_NOTES.map((n) => n.id);
  const { data, error } = await db
    .from(SERVICE_NOTE_TABLE)
    .select("id, content_hash")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const stored = new Map<string, string>(
    ((data ?? []) as Array<{ id: string; content_hash: string }>).map((r) => [
      r.id,
      r.content_hash,
    ]),
  );
  const stale = SERVICE_NOTES.filter((n) => stored.get(n.id) !== serviceNoteHash(n));
  if (stale.length === 0) return { upserted: 0, total: SERVICE_NOTES.length };

  const vectors = await embedDocuments(stale.map(serviceNoteText));
  if (!vectors) throw new Error("embeddings unavailable for index refresh");

  const now = new Date().toISOString();
  const rows = stale.map((note, i) => ({
    id: note.id,
    job_type: note.job_type,
    title: note.title,
    body: note.body,
    tags: note.tags,
    source: note.source,
    reference: note.reference,
    content_hash: serviceNoteHash(note),
    embedding: vectors[i],
    embedded_at: now,
    updated_at: now,
  }));

  const { error: upsertError } = await db
    .from(SERVICE_NOTE_TABLE)
    .upsert(rows, { onConflict: "id" });
  if (upsertError) throw new Error(upsertError.message);

  console.log(
    `[QuoteReady] service-note index refreshed: ${rows.length}/${SERVICE_NOTES.length} notes (corpus ${SERVICE_NOTE_CORPUS_VERSION}).`,
  );
  return { upserted: rows.length, total: SERVICE_NOTES.length };
}
