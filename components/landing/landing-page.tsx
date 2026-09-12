"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Hero } from "./hero";
import { BeforeAfter, ClosingCta, Features, Metrics, OutcomeMarquee, Pipeline } from "./sections";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-15 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_rgb(37_64_233/0.5)]">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight">QuoteReady</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/how-it-works" className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              How it works
            </Link>
            <Link href="/evaluation" className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Evaluation
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "group ml-2")}>
              Open workspace
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <OutcomeMarquee />
        <BeforeAfter />
        <Features />
        <Pipeline />
        <Metrics />
        <ClosingCta />
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            QuoteReady provides an AI-assisted scope-readiness assessment based on supplied
            information. It does not diagnose faults, guarantee pricing, or replace professional
            on-site assessment. Urgent safety concerns require appropriate professional/emergency
            action.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            Built in 48h · Track 1 · Built With ElevenLabs
          </p>
        </div>
      </footer>
    </div>
  );
}
