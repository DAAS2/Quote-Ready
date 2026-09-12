import type { MessageDraft, ScopePack } from "@/lib/ai/schemas";
import { getTemplate } from "./job-templates";
import { fieldIsKnown } from "./readiness";

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic customer-message drafting.
 * Two template types only. All drafts are editable; nothing is ever sent
 * automatically. No diagnostic claims, no pricing language — ever.
 * ──────────────────────────────────────────────────────────────────────────── */

export function buildMessageDraft(
  scope: ScopePack,
  customerName?: string,
): MessageDraft {
  const first = (customerName ?? "there").split(" ")[0];
  const template = getTemplate(scope.job_type);
  const missing = scope.missing_fields.filter((m) => m.ask_customer);

  if (scope.recommended_action.type === "inspection") {
    return {
      message_type: "inspection_recommended",
      body: buildInspectionMessage(first, scope, template.label),
      requests_fields: [],
    };
  }

  return {
    message_type: "request_information",
    body: buildInfoRequest(first, scope, template, missing.map((m) => m.key)),
    requests_fields: missing.map((m) => m.key),
  };
}

function buildInspectionMessage(
  name: string,
  scope: ScopePack,
  jobLabel: string,
): string {
  const clarify = [
    ...scope.missing_fields.filter((m) => m.ask_customer).slice(0, 3).map((m) => m.label.toLowerCase()),
    ...scope.risk_flags
      .filter((f) => f.requires_inspection)
      .slice(0, 2)
      .map((f) => f.label.toLowerCase()),
  ];
  const clarifyLine =
    clarify.length > 0
      ? `The visit lets us confirm ${clarify.join(", ")} so that anything we agree on is accurate.`
      : `The visit lets us confirm the details on site so that anything we agree on is accurate.`;

  return [
    `Hi ${name},`,
    ``,
    `Thanks for your enquiry about the ${jobLabel.toLowerCase()}.`,
    ``,
    `Based on the details and photos you've provided, the most accurate next step is a short on-site inspection before we confirm anything. ${clarifyLine}`,
    ``,
    `The inspection is quick, and there is no obligation to proceed afterwards. Could you let me know a couple of times that suit you?`,
    ``,
    `Kind regards,`,
    `Alex — licensed plumber`,
  ].join("\n");
}

function buildInfoRequest(
  name: string,
  scope: ScopePack,
  template: ReturnType<typeof getTemplate>,
  missingKeys: string[],
): string {
  const questions: string[] = [];
  for (const key of missingKeys) {
    const prepared = template.questions[key];
    questions.push(prepared ?? `Could you confirm the ${scope.missing_fields.find((m) => m.key === key)?.label.toLowerCase()}?`);
  }

  const photoCount = (scope.known_facts.photo_count as number | undefined) ?? 0;
  const photoLine =
    photoCount < template.min_photos_for_good_evidence
      ? `\nA clear close-up photo would also help us see exactly what you're seeing.`
      : "";

  const urgency = fieldIsKnown(scope.known_facts, "urgency") ? "" : "";
  void urgency;

  return [
    `Hi ${name},`,
    ``,
    `Thanks for reaching out about your ${template.label.toLowerCase()}. To give you an accurate response, could you help us with a few quick details?`,
    ``,
    ...questions.map((q, i) => {
      const label = scope.missing_fields.find((m) => m.key === missingKeys[i])?.label;
      return label ? `- ${label}: ${q}` : `- ${q}`;
    }),
    photoLine,
    ``,
    `Once we have these, we'll be in touch straight away with the best next step.`,
    ``,
    `Kind regards,`,
    `Alex — licensed plumber`,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
