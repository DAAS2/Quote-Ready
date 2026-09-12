import type { JobFacts, RiskFlag } from "@/lib/ai/schemas";
import {
  SAFETY_PATTERNS,
  INSPECTION_RISK_FLAGS,
  type JobTemplate,
} from "./job-templates";
import { fieldIsKnown } from "./readiness";

/* ────────────────────────────────────────────────────────────────────────────
 * Risk + inspection overrides. These rules can override raw readiness:
 * they never invent facts — they only re-route the recommendation.
 * ──────────────────────────────────────────────────────────────────────────── */

export function detectSafetyFlags(...texts: Array<string | undefined>): RiskFlag[] {
  const joined = texts.filter(Boolean).join(" \n ");
  const flags: RiskFlag[] = [];
  for (const { id, label, pattern } of SAFETY_PATTERNS) {
    if (pattern.test(joined)) {
      flags.push({
        id,
        label,
        severity: "safety",
        source: "customer_text",
        requires_inspection: true,
      });
    }
  }
  return flags;
}

export function normalizeRiskFlags(ids: string[]): RiskFlag[] {
  return ids.map((id) => {
    const known = INSPECTION_RISK_FLAGS[id];
    return {
      id,
      label: known?.label ?? id.replace(/_/g, " "),
      severity: known?.severity ?? "attention",
      source: "ai_analysis",
      requires_inspection: known?.requires_inspection ?? true,
    } satisfies RiskFlag;
  });
}

export interface InspectionMatch {
  matched: boolean;
  reasons: string[];
}

export function checkInspectionConditions(
  template: JobTemplate,
  facts: JobFacts,
  riskFlags: RiskFlag[],
  informationStarved = false,
): InspectionMatch {
  const reasons: string[] = [];
  const flagIds = new Set(riskFlags.map((f) => f.id));
  for (const condition of template.inspection_conditions) {
    let hit = false;
    if (condition.any_risk_flag?.some((id) => flagIds.has(id))) hit = true;
    if (condition.any_fact && !informationStarved) {
      // "unknown"-fact conditions are implied when the job simply lacks info
      hit =
        hit ||
        condition.any_fact.some(
          ({ key, value }) =>
            value === "unknown"
              ? !fieldIsKnown(facts, key)
              : String((facts as Record<string, unknown>)[key] ?? "").toLowerCase() ===
                value.toLowerCase(),
        );
    }
    if (hit) reasons.push(condition.label);
  }
  return { matched: reasons.length > 0, reasons };
}
