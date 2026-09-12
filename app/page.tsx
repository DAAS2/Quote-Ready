import Link from "next/link";
import { ArrowRight, Bot, ClipboardCheck, Mic, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Bot,
    title: "AI enquiry intake",
    text: "Gemini reads the message, the photos and the voice notes — and extracts structured job facts with sources.",
  },
  {
    icon: ClipboardCheck,
    title: "Scope readiness engine",
    text: "Deterministic rules score every job 0–100 with a visible breakdown — no opaque model judgement.",
  },
  {
    icon: ShieldCheck,
    title: "Human-approved follow-up",
    text: "Drafts ask the right questions. Nothing is sent until you review and approve it.",
  },
  {
    icon: Mic,
    title: "Voice field notes",
    text: "Hands-free site notes via ElevenLabs become evidence that updates the scope and the recommendation.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="size-4" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">QuoteReady</span>
        </div>
        <Link href="/dashboard" className={buttonVariants({ size: "sm", variant: "ghost" })}>
          Open workspace
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="flex flex-col items-start gap-6 py-16 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Built for small residential plumbing businesses
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Every enquiry becomes a{" "}
            <span className="text-primary">quote-ready job scope</span> — before you commit to a
            price.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            QuoteReady shows exactly what is known, missing, assumed, unsafe, or needs a site
            inspection. So you respond faster, quote fewer jobs blind, and never waste a visit.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className={buttonVariants({ size: "lg" }) + " group"}>
              Open demo workspace
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <p className="text-xs text-muted-foreground">
              Three live demo jobs · no sign-up
            </p>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 sm:pb-24">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/80 shadow-xs">
              <CardContent className="flex items-start gap-4 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-5">
        <p className="mx-auto max-w-6xl px-4 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          QuoteReady provides an AI-assisted scope-readiness assessment based on supplied
          information. It does not diagnose faults, guarantee pricing, or replace professional
          on-site assessment. Urgent safety concerns require appropriate professional/emergency
          action.
        </p>
      </footer>
    </div>
  );
}
