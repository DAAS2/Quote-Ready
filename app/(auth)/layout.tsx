import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative z-10 flex w-full flex-col items-center">
        {children}
        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          QuoteReady provides an AI-assisted scope-readiness assessment — it does not diagnose
          faults, guarantee pricing, or replace professional on-site assessment.
        </p>
        <Link
          href="/"
          className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}