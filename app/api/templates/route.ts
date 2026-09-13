import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data/jobs";
import { JobTypeEnum } from "@/lib/ai/schemas";
import { normaliseTemplateDocument } from "@/lib/rules/template-resolve";

export const runtime = "nodejs";

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  base_type: JobTypeEnum,
  name: z.string().trim().min(2).max(120),
  blurb: z.string().trim().max(300).optional().or(z.literal("")),
  is_default: z.boolean().default(false),
  document: z.unknown(),
});

/** GET /api/templates — the organisation's service templates. */
export async function GET() {
  const templates = await store.listTemplates();
  return NextResponse.json({ templates });
}

/** POST /api/templates — create or update a template. */
export async function POST(request: Request) {
  try {
    const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Check the template — a name, base job type and at least one required detail are needed." },
        { status: 400 },
      );
    }
    const { id, base_type, name, blurb, is_default, document } = parsed.data;
    const doc = normaliseTemplateDocument(document);
    if (doc.required_fields.length === 0) {
      return NextResponse.json(
        { error: "Add at least one required detail for the AI to grade against." },
        { status: 400 },
      );
    }
    doc.label = name;
    doc.blurb = blurb || "";

    const savedId = await store.saveTemplate({
      ...(id ? { id } : {}),
      base_type,
      name,
      blurb: blurb || null,
      is_default,
      document: doc,
    });
    return NextResponse.json({ ok: true, id: savedId }, { status: 201 });
  } catch (error) {
    console.error("[QuoteReady] template save failed:", error);
    return NextResponse.json({ error: "Could not save the template." }, { status: 500 });
  }
}

/** DELETE /api/templates?id=... — remove a template. */
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "A template id is required." }, { status: 400 });
    }
    await store.deleteTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] template delete failed:", error);
    return NextResponse.json({ error: "Could not delete the template." }, { status: 500 });
  }
}
