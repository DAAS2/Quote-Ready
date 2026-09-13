"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

/** Minimal client-side session state. Null = not signed in (demo mode). */
export function useSession(): {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      void Promise.resolve().then(() => setLoading(false));
      return;
    }
    let mounted = true;
    void sb.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? undefined,
        name: session.user.user_metadata?.full_name as string | undefined,
      }
    : null;

  async function signOut() {
    const sb = getBrowserSupabase();
    await sb?.auth.signOut();
    setSession(null);
  }

  return { session, user, loading, signOut };
}

/** Business profile stored client-side (onboarding + settings). */
export interface BusinessProfile {
  business_name: string;
  trade: string;
  suburb: string;
}

const PROFILE_KEY = "qr-business-profile";
const ONBOARDING_KEY = "qr-onboarding-done";

export function loadBusinessProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as BusinessProfile) : null;
  } catch {
    return null;
  }
}

export function saveBusinessProfile(profile: BusinessProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboarded() {
  window.localStorage.setItem(ONBOARDING_KEY, "1");
}

export function resetOnboarding() {
  window.localStorage.removeItem(ONBOARDING_KEY);
}