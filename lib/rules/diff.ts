import type { JobFacts, ScopePack } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * Scope-pack diffing: what changed between two versions, computed
 * deterministically for the "what changed" view.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FieldChange {
  key: string;
  label: string;
  from?: string;
  to: string;
  kind: "added" | "changed";
}

export interface PackDiff {
  field_changes: FieldChange[];
  new_risk_flags: string[];
  resolved_missing: string[];
  new_missing: string[];
  action_changed: boolean;
  score_delta: number;
  /**
   * Retrieved guidance that arrived with this version (by title). A site note
   * that adds facts can change which playbook notes apply — reviewers see that
   * change rather than having guidance swap silently underneath them.
   */
  new_guidance: string[];
  /** guidance that no longer applies to this job's facts */
  dropped_guidance: string[];
}

const FACT_LABELS: Record<string, string> = {
  location_in_property: "Location",
  fixture_type: "Fixture",
  system_type: "System",
  system_age: "System age",
  symptoms: "Symptoms",
  urgency: "Urgency",
  property_access: "Access",
  water_isolation_access: "Isolation",
  water_damage: "Water damage",
  customer_availability: "Availability",
  suburb: "Suburb",
};

export function diffPacks(prev: ScopePack, next: ScopePack): PackDiff {
  const fieldChanges = diffFacts(prev.facts, next.facts);

  const prevFlags = new Set(prev.risk_flags.map((f) => f.id));
  const newFlags = next.risk_flags.filter((f) => !prevFlags.has(f.id)).map((f) => f.label);

  const prevMissing = new Set(prev.missing_fields.map((m) => m.key));
  const nextMissing = new Set(next.missing_fields.map((m) => m.key));
  const resolved = [...prevMissing].filter((k) => !nextMissing.has(k));
  const added = [...nextMissing].filter((k) => !prevMissing.has(k));

  const prevGuidance = new Set((prev.guidance ?? []).map((g) => g.id));
  const nextGuidance = new Set((next.guidance ?? []).map((g) => g.id));

  return {
    field_changes: fieldChanges,
    new_risk_flags: newFlags,
    resolved_missing: resolved.map((k) => FACT_LABELS[k] ?? k),
    new_missing: added.map((k) => FACT_LABELS[k] ?? k),
    action_changed: prev.recommended_action.type !== next.recommended_action.type,
    score_delta: next.readiness_score - prev.readiness_score,
    new_guidance: (next.guidance ?? [])
      .filter((g) => !prevGuidance.has(g.id))
      .map((g) => g.title),
    dropped_guidance: (prev.guidance ?? [])
      .filter((g) => !nextGuidance.has(g.id))
      .map((g) => g.title),
  };
}

function diffFacts(a: JobFacts, b: JobFacts): FieldChange[] {
  const changes: FieldChange[] = [];
  const scalarKeys: Array<keyof JobFacts> = [
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
  ];
  const fmt = (v: unknown): string =>
    Array.isArray(v)
      ? v.map((s) => String(s).replace(/_/g, " ")).join(", ")
      : v === undefined
        ? ""
        : String(v).replace(/_/g, " ");

  for (const key of scalarKeys) {
    const from = fmt(a[key]);
    const to = fmt(b[key]);
    if (to && to !== from) {
      changes.push({
        key,
        label: FACT_LABELS[key] ?? key,
        from: from || undefined,
        to,
        kind: from ? "changed" : "added",
      });
    }
  }

  const prevSymptoms = new Set(a.symptoms);
  const addedSymptoms = b.symptoms.filter((s) => !prevSymptoms.has(s));
  if (addedSymptoms.length > 0) {
    changes.push({
      key: "symptoms",
      label: "Symptoms",
      to: addedSymptoms.map((s) => s.replace(/_/g, " ")).join(", "),
      kind: a.symptoms.length > 0 ? "changed" : "added",
    });
  }

  return changes;
}
