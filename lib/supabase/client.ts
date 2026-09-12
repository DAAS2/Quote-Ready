import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
