import type { JobFacts } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Fact merging: apply a (partial) update — e.g. from a voice note — onto
 * existing facts without losing anything already established.
 * ──────────────────────────────────────────────────────────────────────────── */

function mergeStrings(a: string | undefined, b: string | undefined): string | undefined {
  return b !== undefined && b.trim() !== "" ? b : a;
}

function mergeArrays(a: string[] | undefined, b: string[] | undefined): string[] {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]));
}

export function mergeFacts(existing: JobFacts, update: Partial<JobFacts>): JobFacts {
  const merged: JobFacts = { ...existing };

  const scalarKeys = [
    "location_in_property",
    "fixture_type",
    "system_type",
    "system_age",
    "urgency",
    "property_access",
    "water_isolation_access",
    "water_damage",
    "customer_availability",
    "suburb",
  ] as const;
  for (const key of scalarKeys) {
    const next = mergeStrings(existing[key], update[key]);
    if (next !== undefined) {
      // key exists on JobFacts as optional string
      (merged as Record<string, unknown>)[key] = next;
    }
  }

  merged.symptoms = mergeArrays(existing.symptoms, update.symptoms);
  merged.notes = mergeArrays(existing.notes, update.notes);
  merged.photo_count = Math.max(existing.photo_count, update.photo_count ?? 0);
  merged.voice_note_count = Math.max(
    existing.voice_note_count,
    update.voice_note_count ?? 0,
  );

  return merged;
}
