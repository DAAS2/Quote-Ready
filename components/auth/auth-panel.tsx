"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { getBrowserSupabase } from "@/lib/supabase/client";

/* ────────────────────────────────────────────────────────────────────────────
 * Auth panel — restyled to the Calm Trade Precision tokens (no dedicated
 * design screen exists in the design set; every control mirrors the design
 * system's input + button specs exactly).
 * ──────────────────────────────────────────────────────────────────────────── */

export function AuthPanel({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) {
      toast.error("Auth is not configured — you can use the demo workspace instead.");
      router.push("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        // send first-time users through the setup wizard
        try {
          const res = await fetch("/api/profile");
          const { profile } = await res.json();
          router.push(profile?.onboarded_at ? "/dashboard" : "/onboarding");
        } catch {
          router.push("/dashboard");
        }
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || null } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          router.push("/login");
          return;
        }
        toast.success("Account created — let's set up your workspace.");
        router.push("/onboarding");
      }
    } catch (err) {
      toast.error((err as Error).message.replace(/^Auth\s?ApiError:\s*/i, "") || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[26rem] sm:max-w-md">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 sm:p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo href="/" tone="light" />
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {isLogin
                ? "Sign in to keep scoping enquiries."
                : "Free forever for trade businesses."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-space-md">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="name">
                Business / operator name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Melbourne Metro Plumbing"
                autoComplete="name"
                className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                mail
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com.au"
                autoComplete="email"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                lock
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full h-10 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-colors hover:bg-primary disabled:opacity-60"
          >
            {submitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            {!submitting && (
              <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
            )}
          </button>
        </form>

        <p className="mt-5 text-center font-body-sm text-body-sm text-on-surface-variant">
          {isLogin ? (
            <>
              New to QuoteReady?{" "}
              <Link href="/signup" className="font-label-md text-label-md text-primary hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-label-md text-label-md text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>

        <div className="my-5 flex items-center gap-3 font-label-sm text-label-sm uppercase tracking-widest text-outline-variant">
          <span className="h-px flex-1 bg-surface-container-high" aria-hidden />
          or
          <span className="h-px flex-1 bg-surface-container-high" aria-hidden />
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm border border-border hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">play_circle</span>
          View the live demo — no account needed
        </button>
        <p className="mt-3 text-center font-label-sm text-label-sm text-on-surface-variant">
          New accounts start with a clean workspace and a short interactive tour — you create your
          first enquiry yourself, step by step.
        </p>
      </div>
    </div>
  );
}
