import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * PATCH /api/jobs/[id]
 * Update an existing enquiry: revise the enquiry text and/or attach new
 * evidence (photos as multipart files, or a written operator note).
 * Body: multipart with fields enquiry_text?, note?, images[]
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    let enquiryText: string | undefined;
    let note: string | undefined;
    const newImages: string[] = [];

    if (isMultipart) {
      const form = await request.formData();
      const t = typeof form.get("enquiry_text") === "string" ? (form.get("enquiry_text") as string).trim() : "";
      if (t) enquiryText = t.slice(0, 4000);
      const n = typeof form.get("note") === "string" ? (form.get("note") as string).trim() : "";
      if (n) note = n.slice(0, 2000);

      const files = form
        .getAll("images")
        .filter((v): v is File => v instanceof File && v.size > 0)
        .slice(0, MAX_IMAGES);
      for (const file of files) {
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: `Photo "${file.name}" is too large (max 6MB).` }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        newImages.push(await storeImage(buffer, file.type));
      }
    } else {
      const body = await request.json().catch(() => null) as { enquiry_text?: string; note?: string } | null;
      enquiryText = body?.enquiry_text?.trim().slice(0, 4000) || undefined;
      note = body?.note?.trim().slice(0, 2000) || undefined;
    }

    if (!enquiryText && !note && newImages.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    // persist new evidence rows (images + note)
    const ts = new Date().toISOString();
    const evidenceRows: Array<{ id: string; type: "photo_observation" | "manual_note"; claim: string; source_reference: string; storage_path?: string; created_at: string }> = [];
    newImages.forEach((p, i) => {
      evidenceRows.push({
        id: `${ts}-img-${i}`,
        type: "photo_observation",
        claim: "Photo attached by operator — awaiting analysis",
        source_reference: `image_${(job.image_paths.length ?? 0) + i + 1}`,
        storage_path: p,
        created_at: ts,
      });
    });
    if (note) {
      evidenceRows.push({
        id: `${ts}-note`,
        type: "manual_note",
        claim: note,
        source_reference: "operator",
        created_at: ts,
      });
    }
    if (evidenceRows.length > 0) {
      await store.addEvidence(id, evidenceRows);
    }

    if (enquiryText && enquiryText !== job.enquiry_text) {
      await store.updateEnquiryText(id, enquiryText);
      await store.addAudit(id, {
        actor_type: "user",
        event_type: "enquiry_updated",
        summary: "Enquiry details updated by operator.",
        metadata: { added_images: newImages.length, added_note: Boolean(note) },
      });
    } else if (evidenceRows.length > 0) {
      await store.addAudit(id, {
        actor_type: "user",
        event_type: "evidence_added",
        summary: `Operator added ${newImages.length} photo${newImages.length === 1 ? "" : "s"}${note ? " and a written note" : ""}.`,
        metadata: {},
      });
    }

    return NextResponse.json({ ok: true, new_images: newImages.length });
  } catch (error) {
    console.error("[QuoteReady] update job failed:", error);
    return NextResponse.json({ error: "Could not update the enquiry." }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs/[id]
 * Remove an enquiry (its evidence, audits, scope versions and drafts go with it).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await store.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    await store.deleteJob(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] delete job failed:", error);
    return NextResponse.json({ error: "Could not delete the enquiry." }, { status: 500 });
  }
}

async function storeImage(buffer: Buffer, mimeType: string): Promise<string> {
  const db = getServerSupabase();
  if (db) {
    try {
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const path = `jobs/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("job-images").upload(path, buffer, { contentType: mimeType, upsert: false });
      if (error) throw error;
      const { data } = db.storage.from("job-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.warn("[QuoteReady] storage upload failed, storing inline:", (error as Error).message);
    }
  }
  return `data:${mimeType || "image/jpeg"};base64,${buffer.toString("base64")}`;
}