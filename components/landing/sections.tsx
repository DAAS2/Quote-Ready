"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Bot,
  CircleCheck,
  ClipboardCheck,
  FileQuestion,
  Mic,
  PhoneCall,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/* ── infinite marquee of job → outcome chips ─────────────────────────────── */

const MARQUEE_ITEMS = [
  { icon: Wrench, text: "Leaking mixer tap → Inspection recommended" },
  { icon: CircleCheck, text: "Close-coupled toilet, photos attached → Ready for estimate" },
  { icon: TriangleAlert, text: "Hot-water leak + gas smell → Safety escalation" },
  { icon: FileQuestion, text: "One-line text, no photos → Needs information" },
  { icon: Mic, text: "Voice site note: damp cabinet → Scope updated to v2" },
  { icon: ClipboardCheck, text: "Access + availability confirmed → Follow-up approved" },
];

export function OutcomeMarquee() {
  return (
    <div className="qr-marquee overflow-hidden border-y bg-card py-3.5" aria-label="Example enquiry outcomes">
      <div className="qr-marquee-track gap-10 pr-10">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="inline-flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">
            <item.icon
              className={cn(
                "size-4",
                item.text.includes("Safety") ? "text-safety" : item.text.includes("Ready") || item.text.includes("Approved") ? "text-success" : item.text.includes("Inspection") || item.text.includes("v2") ? "text-inspect" : "text-warning",
              )}
              aria-hidden
            />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── before / after ──────────────────────────────────────────────────────── */

export function BeforeAfter() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-ba]",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
          },
        );
        gsap.fromTo(
          "[data-ba-line]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.9,
            ease: "power2.inOut",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <p data-ba className="text-xs font-semibold uppercase tracking-widest text-primary">
        The gap
      </p>
      <h2 data-ba className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
        The quote isn&apos;t lost at the price list. It&apos;s lost at the first reply.
      </h2>

      <div data-ba-line className="mt-10 h-px w-full origin-left bg-gradient-to-r from-safety/50 via-border to-success/50" />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div data-ba className="rounded-xl border border-safety/25 bg-safety/[0.03] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-safety">
            <PhoneCall className="size-4" aria-hidden />
            Today — quoting from memory
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              "Re-read the text, open the photos, guess the fixture",
              "Call back for basics the customer already mentioned",
              "Commit to a price with unknown access and damage",
              "Discover the concealed leak — on site, mid-job",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-safety/70" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div data-ba className="rounded-xl border border-success/30 bg-success/[0.03] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <Bot className="size-4" aria-hidden />
            With QuoteReady — scoping before pricing
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              "Every fact extracted, sourced and readable at a glance",
              "Missing details turned into one precise follow-up message",
              "Risk rules block fixed prices on unsafe assumptions",
              "Voice notes from the field update the scope in seconds",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── features ────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Bot,
    title: "Multimodal intake",
    text: "Gemini reads the message and the photos, extracting structured facts with a visible source for every claim — low-quality photos get labelled low-certainty, never trusted blind.",
  },
  {
    icon: ClipboardCheck,
    title: "Explainable readiness",
    text: "A transparent 0–100 score from five visible components — details, evidence, access, confirmation, risk. When a rule caps the score, you see exactly which rule and why.",
  },
  {
    icon: ShieldCheck,
    title: "Human-approved by default",
    text: "Follow-up drafts ask only what's missing. Nothing is sent, booked, or priced until you approve it — and every approval is recorded in the audit timeline.",
  },
  {
    icon: Mic,
    title: "Field voice notes",
    text: "Record hands-free on site. ElevenLabs transcribes, the engine merges the update and shows what changed — a new scope version in seconds, mid-job.",
  },
];

export function Features() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-feature-card]",
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.12,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
          },
        );

        // live demo card: continuous cycling of "job → status" states
        const states = [
          { label: "Jordan's leaking tap", status: "Inspection recommended", tone: "text-inspect", score: 62 },
          { label: "Priya's toilet swap", status: "Ready for estimate", tone: "text-success", score: 90 },
          { label: "Sam's hot-water unit", status: "Safety attention", tone: "text-safety", score: 47 },
        ];
        const card = root.current?.querySelector("[data-live-demo]");
        if (!card) return;
        const labelEl = card.querySelector("[data-live-label]");
        const statusEl = card.querySelector("[data-live-status]");
        const scoreEl = card.querySelector("[data-live-score]");
        const barEl = card.querySelector("[data-live-bar]");
        let idx = 0;
        const cycle = () => {
          const s = states[idx];
          idx = (idx + 1) % states.length;
          const tl = gsap.timeline();
          tl.to([labelEl, statusEl, scoreEl, barEl], {
            opacity: 0, y: -6, duration: 0.25, stagger: 0.03, ease: "power2.in",
          })
            .add(() => {
              labelEl!.textContent = s.label;
              statusEl!.textContent = s.status;
              statusEl!.className = `text-sm font-semibold ${s.tone}`;
              (barEl as HTMLElement)!.style.width = `${s.score}%`;
              scoreEl!.textContent = `${s.score}%`;
            })
            .to([labelEl, statusEl, scoreEl, barEl], {
              opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power2.out",
            });
        };
        const timer = setInterval(cycle, 2800);
        return () => clearInterval(timer);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            The product
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Four moving parts. One complete scope, every time.
          </h2>
        </div>
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Try it in the workspace
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            data-feature-card
            className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_20px_45px_-20px_rgb(37_64_233/0.22)]"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              aria-hidden
            />
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <f.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
          </div>
        ))}

        {/* live demo card — cycles real job outcomes */}
        <div
          data-feature-card
          data-live-demo
          className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.04] p-6"
        >
          <div
            className="pointer-events-none absolute -left-12 -bottom-12 size-40 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <p className="text-[11px] font-medium uppercase tracking-widest text-primary">
            Live · every 3s
          </p>
          <div className="mt-4 space-y-3">
            <p data-live-label className="text-sm font-semibold">
              Jordan&apos;s leaking tap
            </p>
            <p data-live-status className="text-sm font-semibold text-inspect">
              Inspection recommended
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  data-live-bar
                  className="h-full rounded-full bg-inspect transition-all duration-500"
                  style={{ width: "62%" }}
                />
              </div>
              <span data-live-score className="w-10 text-right font-mono text-sm font-semibold tabular-nums text-inspect">
                62%
              </span>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success qr-anim-pulse-dot" aria-hidden />
            Real outputs from the deterministic engine
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── pipeline (scroll-drawn) ─────────────────────────────────────────────── */

const STEPS = [
  { n: "01", title: "Enquiry lands", text: "Text, photos, a phone call transcript — messy is fine. That's the point.", actor: "customer" },
  { n: "02", title: "Gemini extracts", text: "Structured facts with sources: what was said, what the photos show, how sure it is.", actor: "ai" },
  { n: "03", title: "Rules score it", text: "Trade templates check required fields; the weighted formula scores readiness; overrides route inspections and safety cases.", actor: "rules" },
  { n: "04", title: "You decide", text: "Review the scope pack, edit the follow-up, approve it — or book the inspection. Your call, always.", actor: "human" },
  { n: "05", title: "The field updates it", text: "A spoken site note becomes evidence, re-runs the rules, and produces scope v2 with a visible diff.", actor: "ai" },
];

export function Pipeline() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-pipe-line]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top 65%", end: "bottom 75%", scrub: 0.7 },
          },
        );
        gsap.fromTo(
          "[data-pipe-step]",
          { opacity: 0, x: -18 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.14,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">The pipeline</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Deterministic where it matters.
      </h2>

      <div className="relative mt-12 space-y-10 pl-2">
        <span
          data-pipe-line
          className="absolute left-[19px] top-2 h-[calc(100%-24px)] w-px origin-top bg-gradient-to-b from-primary via-primary/60 to-success"
          aria-hidden
        />
        {STEPS.map((s) => (
          <div key={s.n} data-pipe-step className="relative flex items-start gap-5">
            <span
              className={cn(
                "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-card font-mono text-[11px] font-semibold",
                s.actor === "ai" && "border-primary/40 text-primary",
                s.actor === "rules" && "border-success/50 text-success",
                s.actor === "human" && "border-warning/50 text-warning",
                s.actor === "customer" && "border-border text-muted-foreground",
              )}
            >
              {s.n}
            </span>
            <div className="pt-1">
              <p className="text-sm font-semibold">
                {s.title}
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 align-middle font-mono text-[10px] font-medium uppercase",
                    s.actor === "ai" && "bg-primary/10 text-primary",
                    s.actor === "rules" && "bg-success/10 text-success",
                    s.actor === "human" && "bg-warning/10 text-warning",
                    s.actor === "customer" && "bg-secondary text-muted-foreground",
                  )}
                >
                  {s.actor}
                </span>
              </p>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── metrics (count-up) ──────────────────────────────────────────────────── */

const METRICS = [
  { value: 10, suffix: "/10", label: "evaluation fixtures passing" },
  { value: 42, suffix: "", label: "automated tests on the rules engine" },
  { value: 3, suffix: "", label: "job types, deeply supported" },
  { value: 100, suffix: "%", label: "of outbound actions human-approved" },
];

export function Metrics() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        for (const el of root.current?.querySelectorAll("[data-count]") ?? []) {
          gsap.fromTo(
            el,
            { textContent: 0 },
            {
              textContent: Number(el.getAttribute("data-count")),
              duration: 1.4,
              snap: { textContent: 1 },
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        }
        gsap.fromTo(
          "[data-metric]",
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="border-y bg-card/60">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} data-metric className="text-center">
            <p className="font-mono text-4xl font-semibold tabular-nums text-primary sm:text-5xl">
              <span data-count={m.value}>0</span>
              {m.suffix}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── closing CTA ─────────────────────────────────────────────────────────── */

export function ClosingCta() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-cta-child]",
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top 72%", once: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div
        className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl qr-anim-float"
        style={{ animationDuration: "12s" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 data-cta-child className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Stop quoting blind.
        </h2>
        <p data-cta-child className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Three seeded jobs are waiting in the demo workspace — including the leaking tap that
          gets worse the moment a voice note lands.
        </p>
        <div data-cta-child className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "group px-6")}>
            Open demo workspace
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link href="/evaluation" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-5")}>
            See the evaluation suite
          </Link>
        </div>
      </div>
    </section>
  );
}
