"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Bot, CircleCheck, Mic, TriangleAlert, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, SplitText);

const KNOWN = [
  { label: "Location", value: "Bathroom", tone: "text-foreground" },
  { label: "Urgency", value: "Standard", tone: "text-foreground" },
  { label: "Availability", value: "Next week", tone: "text-foreground" },
  { label: "Isolation access", value: "Unknown", tone: "text-warning" },
  { label: "Fixture type", value: "Unknown", tone: "text-warning" },
  { label: "Water damage", value: "Possible", tone: "text-inspect" },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = gsap.matchMedia();

      reduced.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. Headline char reveal
        const split = new SplitText("[data-hero-headline]", { type: "chars,words" });
        gsap.from(split.chars, {
          opacity: 0,
          y: 26,
          rotateX: -50,
          duration: 0.7,
          stagger: 0.016,
          ease: "expo.out",
          delay: 0.15,
        });

        // 2. Everything else rises in sequence
        gsap.from("[data-hero-rise]", {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.09,
          ease: "power3.out",
          delay: 0.5,
        });

        // 3. Scope-pack mockup: readiness bar counts up, rows cascade in
        gsap.from("[data-mock-row]", {
          opacity: 0,
          x: -14,
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
          delay: 1.0,
        });
        gsap.fromTo(
          "[data-mock-bar]",
          { width: "0%" },
          { width: "62%", duration: 1.4, ease: "power2.inOut", delay: 1.1 },
        );
        gsap.from("[data-mock-score]", {
          textContent: 0,
          duration: 1.4,
          snap: { textContent: 1 },
          ease: "power2.inOut",
          delay: 1.1,
        });

        // 4. Parallax on scroll
        gsap.to("[data-hero-visual]", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
        gsap.to("[data-hero-copy]", {
          yPercent: -8,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom 40%", scrub: 0.6 },
        });

        return () => split.revert();
      });

      // Mouse tilt on the mockup (desktop, motion allowed)
      reduced.add("(prefers-reduced-motion: no-preference) and (hover: hover)", () => {
        const card = root.current?.querySelector("[data-tilt]");
        if (!card) return;
        const onMove = (e: Event) => {
          const me = e as MouseEvent;
          const rect = card.getBoundingClientRect();
          const rx = ((me.clientY - rect.top) / rect.height - 0.5) * -6;
          const ry = ((me.clientX - rect.left) / rect.width - 0.5) * 8;
          gsap.to(card, { rotateX: rx, rotateY: ry, duration: 0.5, ease: "power2.out", transformPerspective: 900 });
        };
        const onLeave = () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1, 0.6)" });
        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
        return () => {
          card.removeEventListener("mousemove", onMove);
          card.removeEventListener("mouseleave", onLeave);
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
      {/* backdrop: layered aurora waves + faint grid kept only at the very top */}
      <div className="qr-aurora absolute inset-0" aria-hidden />
      <div
        className="absolute -top-32 left-[15%] size-[480px] rounded-full bg-primary/14 blur-3xl qr-anim-float"
        style={{ animationDuration: "11s" }}
        aria-hidden
      />
      <div
        className="absolute top-40 right-[8%] size-[380px] rounded-full bg-inspect/10 blur-3xl qr-anim-float"
        style={{ animationDuration: "13s", animationDelay: "1.4s" }}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── copy ── */}
        <div data-hero-copy>
          <p
            data-hero-rise
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs"
          >
            <span className="size-1.5 rounded-full bg-success qr-anim-pulse-dot" aria-hidden />
            Turn every enquiry into a scope — before you price it
          </p>

          <h1
            data-hero-headline
            className="mt-5 text-[2.6rem] font-semibold leading-[1.06] tracking-tight sm:text-6xl"
          >
            Every vague enquiry becomes a{" "}
            <span className="qr-text-gradient">quote-ready job scope.</span>
          </h1>

          <p data-hero-rise className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            QuoteReady shows exactly what is known, missing, assumed, unsafe, or needs a site
            inspection — before you commit to a price. No more quoting blind.
          </p>

          <div data-hero-rise className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "group px-5")}>
              Open demo workspace
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/how-it-works"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-5")}
            >
              See how it works
            </Link>
          </div>

          <p data-hero-rise className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-3.5 text-success" aria-hidden />
              10/10 evaluation fixtures passing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-3.5 text-success" aria-hidden />
              42 automated tests
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-3.5 text-success" aria-hidden />
              100% human-approved actions
            </span>
          </p>
        </div>

        {/* ── floating scope-pack mockup ── */}
        <div data-hero-visual className="relative mx-auto w-full max-w-md [perspective:900px]">
          <div
            data-tilt
            className="qr-anim-float relative rounded-2xl border bg-card/95 p-5 shadow-[0_24px_60px_-24px_rgb(37_64_233/0.28)] backdrop-blur-sm"
            style={{ ["--float-rotate" as string]: "0deg" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  JL
                </span>
                <div>
                  <p className="text-sm font-medium leading-none">Jordan Lee</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Brunswick, VIC · leaking tap</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-inspect/10 px-2 py-1 text-[10px] font-medium text-inspect">
                <Wrench className="size-3" aria-hidden />
                Inspection recommended
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Quote readiness
                </p>
                <p data-mock-score className="font-mono text-lg font-semibold tabular-nums text-inspect">
                  62%
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary" role="presentation">
                <div data-mock-bar className="h-full rounded-full bg-inspect" style={{ width: "62%" }} />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {KNOWN.map((row) => (
                <div
                  key={row.label}
                  data-mock-row
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span className={cn("text-[11px] font-medium", row.tone)}>{row.value}</span>
                </div>
              ))}
            </div>

            <div data-mock-row className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-3 py-2.5">
              <Mic className="size-4 shrink-0 text-primary" aria-hidden />
              <div className="flex h-4 flex-1 items-center gap-[3px]" aria-hidden>
                {[0.5, 0.9, 0.4, 1, 0.6, 0.85, 0.45, 0.75, 0.55, 0.95, 0.4, 0.8].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-primary/50"
                    style={{
                      height: `${h * 100}%`,
                      animation: `qr-wave 1.3s ease-in-out ${i * 0.09}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">voice note → scope update</span>
            </div>

            <p data-mock-row className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-3 shrink-0 text-inspect" aria-hidden />
              Damp cabinetry — inspection required before a fixed price.
            </p>
          </div>

          {/* floating satellites */}
          <div
            className="qr-anim-float absolute -left-6 top-16 hidden items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 shadow-md sm:flex"
            style={{ animationDuration: "8.5s", animationDelay: "0.8s" }}
            aria-hidden
          >
            <Bot className="size-4 text-primary" />
            <span className="text-[11px] font-medium">Gemini extracted 6 facts</span>
          </div>
          <div
            className="qr-anim-float absolute -right-4 bottom-14 hidden items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 shadow-md sm:flex"
            style={{ animationDuration: "9.5s", animationDelay: "1.8s" }}
            aria-hidden
          >
            <CircleCheck className="size-4 text-success" />
            <span className="text-[11px] font-medium">Follow-up approved</span>
          </div>
        </div>
      </div>
    </section>
  );
}
