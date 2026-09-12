import Link from "next/link";
import { Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DemoResetButton } from "@/components/dashboard/demo-reset-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Jobs" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/evaluation", label: "Evaluation" },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard"
              className="mr-1 flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring/60 sm:mr-2"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_rgb(37_64_233/0.5)]">
                <Wrench className="size-4" aria-hidden />
              </span>
              <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
                QuoteReady
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60 sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DemoResetButton />
            <Link href="/jobs/new" className={cn(buttonVariants({ size: "sm" }), "group")}>
              <span className="hidden sm:inline">New enquiry</span>
              <span className="sm:hidden">New</span>
              <svg viewBox="0 0 24 24" className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 sm:px-6">
          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            QuoteReady provides an AI-assisted scope-readiness assessment based on supplied
            information. It does not diagnose faults, guarantee pricing, or replace professional
            on-site assessment. Urgent safety concerns require appropriate professional/emergency
            action.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link
              href="/evaluation"
              className="rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              Evaluation suite
            </Link>
            <span className="font-mono text-muted-foreground/60">
              Built in 48h · Track 1 · Built With ElevenLabs
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}