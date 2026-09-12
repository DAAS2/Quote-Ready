"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { getBrowserSupabase } from "@/lib/supabase/client";

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
        router.push("/dashboard");
      } else {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || null } },
        });
        if (error) throw error;
        toast.success("Account created — welcome to QuoteReady!");
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error((err as Error).message.replace(/^Auth\s?ApiError:\s*/i, "") || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border bg-card p-7 shadow-[0_24px_60px_-30px_rgb(37_64_233/0.3)] sm:p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo href="/" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to keep scoping enquiries."
                : "Free forever for trade businesses."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <div className="grid gap-1.5">
              <Label htmlFor="name">Business / operator name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Melbourne Metro Plumbing"
                autoComplete="name"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com.au"
              autoComplete="email"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isLogin ? "Sign in" : "Create account"}
            {!submitting && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              New to QuoteReady?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground/60">
          <span className="h-px flex-1 bg-border" aria-hidden />
          or
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => router.push("/dashboard")}
        >
          <Sparkles className="size-4 text-primary" aria-hidden />
          View the live demo — no account needed
        </Button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          The demo workspace ships with three seeded jobs so you can try the whole flow instantly.
        </p>
      </div>
    </div>
  );
}