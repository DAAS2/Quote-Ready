import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/**
 * Cookie-bound anon client — used to resolve the signed-in user on the
 * server (the service-role client deliberately holds no session).
 * Next 16: cookies() is async.
 */
export async function getCookieSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_SERVER_CONFIGURED) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    },
  );
}

/** The signed-in user (or null when browsing the demo workspace). */
export async function getAuthUser(): Promise<{ id: string; email?: string } | null> {
  const db = await getCookieSupabase();
  if (!db) return null;
  try {
    const { data } = await db.auth.getUser();
    if (!data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}
