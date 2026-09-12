import Link from "next/link";
import { Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DemoResetButton } from "@/components/dashboard/demo-reset-button";
import { activeStoreKind } from "@/lib/data/jobs";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeKind = activeStoreKind();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring/60"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="size-4" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">QuoteReady</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · Melbourne Metro Plumbing
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              title={
                storeKind === "supabase"
                  ? "Jobs persist to Supabase Postgres"
                  : "Supabase not configured — demo data served from the in-memory fallback store"
              }
            >
              <span
                className={`size-1.5 rounded-full ${storeKind === "supabase" ? "bg-success" : "bg-warning"}`}
                aria-hidden
              />
              {storeKind === "supabase" ? "Supabase connected" : "Local demo data"}
            </span>
            <DemoResetButton />
            <Link href="/jobs/new" className={buttonVariants({ size: "sm" })}>
              New enquiry
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6">
          <p className="max-w-xl flex-1 text-[11px] leading-relaxed text-muted-foreground">
            QuoteReady provides an AI-assisted scope-readiness assessment based on supplied
            information. It does not diagnose faults, guarantee pricing, or replace professional
            on-site assessment.
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <Link href="/how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="/evaluation" className="text-muted-foreground transition-colors hover:text-foreground">
              Evaluation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
