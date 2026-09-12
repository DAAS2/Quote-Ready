import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";
import { JobTypeEnum } from "@/lib/ai/schemas";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const CreateJobForm = z.object({
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  suburb: z.string().trim().max(60).optional().or(z.literal("")),
  job_type: JobTypeEnum,
  intake_channel: z.enum(["text", "call", "web_form", "email", "in_person"]).default("text"),
  enquiry_text: z.string().trim().min(5).max(4000),
});

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const parsed = CreateJobForm.safeParse({
      customer_name: form.get("customer_name"),
      phone: form.get("phone") || "",
      email: form.get("email") || "",
      suburb: form.get("suburb") || "",
      job_type: form.get("job_type"),
      intake_channel: form.get("intake_channel") || "text",
      enquiry_text: form.get("enquiry_text"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form — some details are missing or invalid.", issues: parsed.error.issues.map((i) => i.path.join(".")) },
        { status: 400 },
      );
    }

    const files = form
      .getAll("images")
      .filter((v): v is File => v instanceof File && v.size > 0)
      .slice(0, MAX_IMAGES);

    const imagePaths: string[] = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Photo "${file.name}" is too large — keep photos under 6MB.` },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await storeImage(buffer, file.type);
      imagePaths.push(path);
    }

    const jobId = await store.createJob({
      customer: {
        full_name: parsed.data.customer_name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        suburb: parsed.data.suburb || null,
      },
      job_type: parsed.data.job_type,
      enquiry_text: parsed.data.enquiry_text,
      image_paths: imagePaths,
      intake_channel: parsed.data.intake_channel,
    });

    return NextResponse.json({ id: jobId }, { status: 201 });
  } catch (error) {
    console.error("[QuoteReady] create job failed:", error);
    return NextResponse.json(
      { error: "Could not create the enquiry. Please try again." },
      { status: 500 },
    );
  }
}

async function storeImage(buffer: Buffer, mimeType: string): Promise<string> {
  const db = getServerSupabase();
  if (db) {
    try {
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const path = `jobs/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage
        .from("job-images")
        .upload(path, buffer, { contentType: mimeType, upsert: false });
      if (error) throw error;
      const { data } = db.storage.from("job-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.warn("[QuoteReady] storage upload failed, storing inline:", (error as Error).message);
    }
  }
  // memory-mode fallback: inline data URL
  return `data:${mimeType || "image/jpeg"};base64,${buffer.toString("base64")}`;
}
