import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTENT_TYPES: Record<string, string> = {
  webm: "audio/webm",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
};

/**
 * GET /api/jobs/[id]/voice-note/audio[?evidence=<id>]
 * Streams a saved field recording so the operator can replay the voicenote.
 * Without `evidence`, the most recent recording is served. The `voice-notes`
 * bucket is private, so the audio is only ever served through this server
 * route (404 when no recording was saved).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const evidenceId = new URL(request.url).searchParams.get("evidence");
    const recording = [...job.evidence]
      .reverse()
      .find(
        (e) =>
          e.type === "voice_note" &&
          e.storage_path &&
          (!evidenceId || e.id === evidenceId),
      );
    if (!recording?.storage_path) {
      return NextResponse.json({ error: "No saved recording for this note." }, { status: 404 });
    }

    const db = getServerSupabase();
    if (!db) {
      return NextResponse.json({ error: "Audio storage is not configured." }, { status: 503 });
    }

    const { data, error } = await db.storage.from("voice-notes").download(recording.storage_path);
    if (error || !data) {
      console.warn("[QuoteReady] voice-note audio download failed:", error?.message);
      return NextResponse.json({ error: "The recording could not be loaded." }, { status: 502 });
    }

    const ext = recording.storage_path.split(".").pop()?.toLowerCase() ?? "webm";
    return new NextResponse(await data.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "audio/webm",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[QuoteReady] voice-note audio failed:", error);
    return NextResponse.json({ error: "The recording could not be loaded." }, { status: 500 });
  }
}
