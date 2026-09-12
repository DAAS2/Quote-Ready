import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { speakText, ELEVENLABS_CONFIGURED } from "@/lib/elevenlabs/client";
import { isDemoMode } from "@/lib/ai/demo-mode";
import { titleCase } from "@/lib/utils/format";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pre-call briefing: deterministic summary text → ElevenLabs TTS (MP3). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job || !job.scope) {
      return NextResponse.json(
        { error: "Analyse the job before requesting a briefing." },
        { status: 409 },
      );
    }

    const text = composeBriefing(job);
    const briefingText = text;

    if (isDemoMode() || !ELEVENLABS_CONFIGURED) {
      return NextResponse.json(
        { error: "Voice briefings are unavailable in this mode — the written briefing is shown instead.", text: briefingText },
        { status: 503 },
      );
    }

    try {
      const mp3 = await speakText(briefingText);
      return new NextResponse(new Uint8Array(mp3), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-Briefing-Text": encodeURIComponent(briefingText),
        },
      });
    } catch (error) {
      console.warn("[QuoteReady] TTS failed:", (error as Error).message);
      return NextResponse.json(
        { error: "Speech generation failed — the written briefing is shown instead.", text: briefingText },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("[QuoteReady] briefing failed:", error);
    return NextResponse.json({ error: "Briefing failed — please try again." }, { status: 500 });
  }
}

function composeBriefing(job: NonNullable<Awaited<ReturnType<typeof store.getJob>>>): string {
  const scope = job.scope!;
  const first = job.customer.full_name.split(" ")[0];
  const sentences: string[] = [];

  sentences.push(
    `${first}'s ${JOB_TYPE_LABELS[scope.job_type].toLowerCase()} enquiry is ${scope.readiness_score} percent quote ready.`,
  );

  if (scope.safety_flag) {
    sentences.push(
      "This one needs safety attention. Do not use the assessment as a safety diagnosis — follow the appropriate professional or emergency process.",
    );
    return sentences.join(" ");
  }

  if (scope.readiness_band === "ready_for_estimate") {
    sentences.push("Details and evidence are sufficient to prepare an owner-reviewed estimate.");
  } else if (scope.readiness_band === "inspection_recommended") {
    sentences.push(
      scope.inspection_recommended
        ? "An on-site inspection is recommended before any fixed price."
        : "There is enough context to understand the job, but fixed pricing would be premature.",
    );
  } else {
    sentences.push("Critical details are still missing.");
  }

  const asks = scope.missing_fields.filter((m) => m.ask_customer).slice(0, 3);
  if (asks.length > 0) {
    sentences.push(
      `Before calling, ask about ${asks.map((m) => m.label.toLowerCase()).join(", ")}.`,
    );
  } else {
    const flags = scope.risk_flags.slice(0, 2);
    if (flags.length > 0) {
      sentences.push(`Watch for: ${flags.map((f) => f.label.toLowerCase()).join(", ")}.`);
    }
  }

  sentences.push(
    `${titleCase(scope.recommended_action.type.replace(/_/g, " "))} is the recommended next step. This briefing is AI-generated.`,
  );

  return sentences.join(" ");
}
