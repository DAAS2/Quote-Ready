import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser, getServerSupabase } from "@/lib/supabase/server";

/* ────────────────────────────────────────────────────────────────────────────
 * Per-user workspaces. Every signed-in user owns an organisation; the demo
 * organisation is only used when browsing without an account.
 * ──────────────────────────────────────────────────────────────────────────── */

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export interface ServerProfile {
  id: string;
  email?: string;
  full_name: string | null;
  business_name: string | null;
  trade: string | null;
  service_area: string | null;
  onboarded_at: string | null;
}

/**
 * Resolve the organisation for the current request:
 * - signed-in user → their organisation (created on first use)
 * - anonymous → the shared demo organisation
 */
export async function resolveOrgId(db: SupabaseClient): Promise<string> {
  const user = await getAuthUser();
  if (!user) return DEMO_ORG_ID;


  // ensure the profile row exists (the signup trigger usually does this)
  await db
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data: member } = await db
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (member?.organisation_id) return member.organisation_id;

  // first sign-in: create the workspace + membership
  const { data: profile } = await db
    .from("profiles")
    .select("business_name, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    profile?.business_name ||
    (profile?.full_name ? `${profile.full_name}'s workspace` : "My workspace");

  const { data: org, error: orgError } = await db
    .from("organisations")
    .insert({ name })
    .select("id")
    .single();
  if (orgError || !org) return DEMO_ORG_ID;

  await db
    .from("organisation_members")
    .upsert(
      { organisation_id: org.id, user_id: user.id, role: "owner" },
      { onConflict: "organisation_id,user_id", ignoreDuplicates: true },
    );

  return org.id;
}

/** The signed-in user's profile (or null in demo mode). */
export async function getServerProfile(): Promise<ServerProfile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const db = getServerSupabase();
  if (!db) return null;
  const { data } = await db
    .from("profiles")
    .select("id, full_name, business_name, trade, service_area, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { ...data, email: user.email };
}
