import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ProfileSchema = z.object({
  full_name: z.string().trim().max(120).optional(),
  business_name: z.string().trim().max(120).optional(),
  trade: z.string().trim().max(60).optional(),
  service_area: z.string().trim().max(120).optional(),
  onboarded: z.boolean().optional(),
});

/**
 * PUT /api/profile — save the signed-in user's profile (business setup).
 * Returns 401 in demo mode (no signed-in user); the client keeps a local copy.
 */
export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save your business profile." }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile details." }, { status: 400 });
  }

  const { onboarded, ...fields } = parsed.data;
  const patch: Record<string, unknown> = { ...fields };
  if (onboarded !== undefined) patch.onboarded_at = onboarded ? new Date().toISOString() : null;

  await db.from("profiles").upsert(
    { id: user.id, ...patch },
    { onConflict: "id" },
  );

  return NextResponse.json({ ok: true });
}

/** GET /api/profile — the signed-in user's profile (null in demo mode). */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ profile: null });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ profile: null });
  const { data } = await db
    .from("profiles")
    .select("id, full_name, business_name, trade, service_area, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  return NextResponse.json({ profile: data ? { ...data, email: user.email } : null });
}
