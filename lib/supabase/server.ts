import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_SERVER_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let serviceClient: SupabaseClient | null = null;

/**
 * Server-side client. Uses the service role key when present (bypasses RLS —
 * fine for a key-controlled MVP demo) and falls back to the anon key.
 * Returns null when Supabase is not configured; callers must fall back
 * to the local demo store.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!SUPABASE_SERVER_CONFIGURED) return null;
  if (!serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}
