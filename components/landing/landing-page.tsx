"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BrandLogoSvg } from "@/components/brand/logo";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing page — transcribed from the B2B SaaS landing design, upgraded with
 * GSAP scroll-reveal motion and a recorded product walkthrough in the hero.
 * ──────────────────────────────────────────────────────────────────────────── */

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The recorded product walkthrough, served straight from /public.
 *
 * Delivery contract for anyone re-recording or re-exporting it: H.264 High,
 * yuv420p, 1440x810 at 30fps, no audio track (the hero autoplays muted),
 * `+faststart` for progressive playback, and CRF 25. That keeps this 68s clip
 * near 6 MB instead of the 30 MB a default export produces.
 *
 * There is no build step and no server-side transcoding here — the file in
 * /public is the artifact that ships, so its weight is the page's weight.
 */
const DEMO_VIDEO_SRC = "/demo/quote-ready-shorter-demo.mp4";

/**
 * Hero demo — the recorded walkthrough of the real product, embedded directly.
 * The recording already shows the app, so nothing frames it: no browser chrome,
 * no controls, no pause affordance.
 *
 * It autoplays muted, inline, and loops forever. Autoplay is treated as a
 * courtesy, never a guarantee: if the browser refuses (low-power mode, data
 * saver, or a reduced-motion preference) the first frame still paints, and a
 * click starts playback without ever stopping it.
 *
 * Nothing here is derived from React state during the first render, so the
 * server and client markup match exactly and hydration stays silent.
 */
function HeroDemoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    // Set the property, not just the attribute: some browsers only honour a
    // muted video for autoplay when the DOM property is set before play().
    el.muted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void el.play().catch(() => {});
  }, []);

  /** Restart if playback was blocked. Deliberately one-way: never pauses. */
  function resume() {
    void video.current?.play().catch(() => {});
  }

  return (
    <div className="w-full max-w-5xl mt-12 text-left">
      <div className="rounded-xl overflow-hidden bg-[#0B1B2B] shadow-[0_12px_36px_rgba(16,42,67,0.09)]">
        {failed ? (
          /* If the file cannot be decoded, hand off to the live demo instead */
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="material-symbols-outlined text-[30px] text-[#b0c9e8]">
              videocam_off
            </span>
            <span className="font-headline-sm text-headline-sm text-white">
              The walkthrough could not load
            </span>
            <span className="font-body-sm text-body-sm text-[#b0c9e8] max-w-md">
              Open the live demo to run the same intake, analysis and follow-up flow yourself.
            </span>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-colors"
            >
              <span>Open live demo</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <video
            ref={video}
            src={DEMO_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            aria-label="QuoteReady product walkthrough"
            className="block w-full h-auto cursor-pointer"
            onError={() => setFailed(true)}
            onClick={resume}
          />
        )}
      </div>
    </div>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * "Product" scrolls back to the top. A plain `#top` anchor is unreliable here:
   * the smooth-scroll CSS plus GSAP's ScrollTrigger both drive the scroll
   * position, which can leave the hash jump stuck. Scrolling imperatively
   * always lands.
   */
  function scrollToTop(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState(null, "", "#top");
  }

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      // hero entrance stagger
      gsap.from(".hero-el", {
        y: 26,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.1,
      });

      // drifting background blobs
      gsap.to(".hero-blob-1", {
        xPercent: 6,
        yPercent: 10,
        duration: 9,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".hero-blob-2", {
        xPercent: -8,
        yPercent: 14,
        duration: 11,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      // scroll reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 34,
          autoAlpha: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
      });

      // step + benefit card stagger
      gsap.utils.toArray<HTMLElement>("[data-stagger-group]").forEach((group) => {
        gsap.from(group.children, {
          y: 30,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: group, start: "top 80%", once: true },
        });
      });

      ScrollTrigger.refresh();

      // No manual cleanup: useGSAP reverts this context (and only the triggers
      // it created) on unmount. Killing ScrollTrigger.getAll() here would tear
      // down triggers owned by other components and throw on the next refresh.
    },
    { scope: rootRef },
  );

  return (
    <div id="top" ref={rootRef} className="bg-surface font-body-md text-body-md text-on-surface">
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-lg">
          <Link className="flex items-center gap-space-sm" href="/#top">
            <BrandLogoSvg tone="light" wordmark={false} className="h-8 w-auto object-contain" />
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              QuoteReady
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-space-lg">
            <a
              aria-current="page"
              className="transition-colors text-primary font-label-lg cursor-pointer"
              href="#top"
              onClick={scrollToTop}
            >
              Product
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              href="#evidence-voice"
            >
              Evidence &amp; Voice
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              href="#cta"
            >
              CTA
            </a>
          </nav>
          <div className="flex items-center gap-space-sm sm:gap-space-md">
            <Link
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-md py-space-sm rounded-lg transition-colors"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex items-center justify-center h-10 px-4 sm:px-space-lg rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-colors shadow-[0_1px_2px_rgba(16,42,67,0.08)]"
              href="/signup"
            >
              Register
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full pt-16 bg-surface">
        {/* Top Hero Section */}
        <section className="relative w-full overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24">
          {/* Subtle architectural backdrop accents */}
          <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center">
            <div className="hero-blob-1 w-[1100px] h-[500px] rounded-full bg-surface-container/60 blur-3xl opacity-70 -translate-y-1/3"></div>
            <div className="hero-blob-2 w-[600px] h-[300px] rounded-full bg-primary-fixed/20 blur-2xl opacity-40 translate-x-1/3 -translate-y-1/4"></div>
          </div>
          <div className="max-w-7xl mx-auto px-margin flex flex-col items-center text-center">
            {/* Main Headline */}
            <h1 className="hero-el font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-on-surface max-w-4xl tracking-tight leading-tight mb-5">
              Know what you need <br className="hidden sm:inline" />
              <span className="text-primary-container">before you quote.</span>
            </h1>
            {/* Supporting Copy */}
            <p className="hero-el font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-8 text-balance">
              QuoteReady turns incomplete trade enquiries into structured job scopes,
              missing-detail checklists, and clear next steps—so your team quotes with absolute
              confidence.
            </p>
            {/* CTAs */}
            <div className="hero-el flex flex-col sm:flex-row items-center gap-space-md mb-6">
              <Link
                className="group inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-all shadow-[0_2px_8px_rgba(15,118,110,0.25)]"
                href="/dashboard"
              >
                <span>Open live demo</span>
                <span className="material-symbols-outlined ml-2 text-[18px] transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </Link>
              <Link
                className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg hover:bg-surface-container-low transition-colors shadow-sm"
                href="#how-it-works"
              >
                <span className="material-symbols-outlined mr-2 text-[18px] text-primary">
                  play_circle
                </span>
                <span>See how it works</span>
              </Link>
            </div>
            {/* Trust Guarantee Note */}
            <div className="hero-el inline-flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm bg-surface-container-low/70 px-4 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[16px] text-primary">security</span>
              <span>
                Built for human review. No automatic pricing. No automatic customer messages.
              </span>
            </div>
            {/* Recorded product walkthrough — autoplays muted and loops forever */}
            <div className="hero-el w-full flex justify-center">
              <HeroDemoVideo />
            </div>
          </div>
        </section>
        {/* Section 2: Methodology / 4 Horizontal Steps */}
        <section className="w-full py-16 md:py-24 bg-surface-container-low/40 scroll-mt-16" id="how-it-works">
          <div className="max-w-7xl mx-auto px-margin">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16" data-reveal>
              <span className="font-label-md text-label-md text-primary font-semibold tracking-wider uppercase mb-2 block">
                Methodology
              </span>
              <h2 className="font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-on-surface tracking-tight mb-4">
                A better workflow before the quote
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant text-balance">
                Eliminate underquoted jobs, surprise site variations, and time wasted driving across
                town for unvetted work.
              </p>
            </div>
            {/* 4 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative" data-stagger-group>
              {/* Step 1 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      1
                    </span>
                    <span className="material-symbols-outlined text-outline-variant text-[24px]">
                      mark_email_unread
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Add enquiry and photos
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Drop customer text from WhatsApp, SMS, or website intake forms. Upload homeowner
                    photos of leaks, meters, or cabinetry.
                  </p>
                </div>
                <div className="pt-6 mt-4">
                  <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">bolt</span> Instant
                    Intake
                  </span>
                </div>
              </div>
              {/* Step 2 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      2
                    </span>
                    <span className="material-symbols-outlined text-outline-variant text-[24px]">
                      construction
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Extract job details
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Extracts fixture type, clearance, accessibility constraints, and compliance tags
                    referencing relevant Australian Standards.
                  </p>
                </div>
                <div className="pt-6 mt-4">
                  <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>{" "}
                    Australian Standards
                  </span>
                </div>
              </div>
              {/* Step 3 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      3
                    </span>
                    <span className="material-symbols-outlined text-[#D97706] text-[24px]">
                      fact_check
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Check quote readiness
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Flags missing brand cartridge models, inaccessible valves, and structural water
                    damage before an unchangeable price is promised.
                  </p>
                </div>
                <div className="pt-6 mt-4">
                  <span className="font-label-sm text-label-sm text-[#D97706] font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">flag</span> Risk
                    Elimination
                  </span>
                </div>
              </div>
              {/* Step 4 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      4
                    </span>
                    <span className="material-symbols-outlined text-primary-container text-[24px]">
                      rate_review
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Review next action
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    The licensed tradie reviews pre-drafted clarification SMS or books a paid
                    diagnostic site visit with a single click.
                  </p>
                </div>
                <div className="pt-6 mt-4">
                  <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">done_all</span>{" "}
                    Human-in-the-Loop
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Section 3: Split Feature - Voice Notes Become Scope Evidence */}
        <section className="w-full py-16 md:py-24 bg-surface scroll-mt-16" id="evidence-voice">
          <div className="max-w-7xl mx-auto px-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
              {/* Left Column: Copy & Trade Context */}
              <div className="lg:col-span-6 flex flex-col gap-5" data-reveal>
                <span className="font-label-md text-label-md text-primary font-semibold tracking-wider uppercase">
                  Field-to-Office Sync
                </span>
                <h2 className="font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-on-surface tracking-tight leading-snug">
                  Voice notes become <br className="hidden sm:inline" />
                  <span className="text-primary-container">scope evidence.</span>
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant text-balance">
                  Tradies on tools don&apos;t have time to fill out complex forms. Record a fast
                  20-second site debrief from the van—QuoteReady translates trade vernacular into
                  audit-grade scope updates.
                </p>
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong className="font-semibold">
                        Hands-free field capture in under 20 seconds.
                      </strong>{" "}
                      Tradies speak naturally into their mobile browser while packing tools.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong className="font-semibold">Understands trade vernacular.</strong>{" "}
                      Accurately interprets fixture types, isolation valves, access notes, and
                      site-specific shorthand.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong className="font-semibold">Dynamic risk recalculation.</strong> If damp
                      floorboards or seized isolation valves are mentioned, fixed pricing is
                      automatically locked.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface">
                      <strong className="font-semibold">Immutable audit trail.</strong> Voice
                      audio, transcript, and changes are permanently time-stamped to technician
                      credentials.
                    </p>
                  </div>
                </div>
              </div>
              {/* Right Column: Site Note Interactive UI Card */}
              <div className="lg:col-span-6" data-reveal>
                <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgba(16,42,67,0.08)] space-y-6">
                  {/* Voice Recording Audio Bar */}
                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] animate-ping"></span>
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          Audio captured (00:18)
                        </span>
                      </div>
                      <span className="font-data-mono text-label-sm text-on-surface-variant">
                        Tech: Alex Miller (#9941)
                      </span>
                    </div>
                    {/* Inline Waveform visualization SVG */}
                    <div className="flex items-center gap-1.5 h-10 px-3 bg-surface-container-lowest rounded-lg">
                      <button
                        className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mr-2 shadow-sm hover:bg-primary-container transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      </button>
                      <div className="flex-1 flex items-center justify-between gap-1 h-6">
                        <div className="w-1 bg-primary/30 h-3 rounded-full"></div>
                        <div className="w-1 bg-primary/40 h-5 rounded-full"></div>
                        <div className="w-1 bg-primary h-6 rounded-full"></div>
                        <div className="w-1 bg-primary h-4 rounded-full"></div>
                        <div className="w-1 bg-primary h-6 rounded-full"></div>
                        <div className="w-1 bg-primary/80 h-3 rounded-full"></div>
                        <div className="w-1 bg-primary h-5 rounded-full"></div>
                        <div className="w-1 bg-primary/50 h-2 rounded-full"></div>
                        <div className="w-1 bg-primary h-6 rounded-full"></div>
                        <div className="w-1 bg-primary/70 h-4 rounded-full"></div>
                        <div className="w-1 bg-primary h-5 rounded-full"></div>
                        <div className="w-1 bg-primary/30 h-2 rounded-full"></div>
                        <div className="w-1 bg-outline-variant h-3 rounded-full"></div>
                        <div className="w-1 bg-outline-variant h-5 rounded-full"></div>
                        <div className="w-1 bg-outline-variant h-2 rounded-full"></div>
                        <div className="w-1 bg-outline-variant h-4 rounded-full"></div>
                      </div>
                      <span className="font-data-mono text-[11px] text-on-surface-variant ml-2">
                        00:18 / 00:18
                      </span>
                    </div>
                  </div>
                  {/* Verbatim Quote Bubble */}
                  <div className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary-container before:rounded-full">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">
                      Verbatim Transcript
                    </span>
                    <p className="font-body-md text-body-md text-on-surface italic font-normal">
                      “I inspected Jordan&apos;s bathroom tap. It is a corroded mixer. The isolation
                      valve is accessible, but the cabinet base is damp. I cannot rule out a
                      concealed leak, so book an inspection before providing a fixed price.”
                    </p>
                  </div>
                  {/* Extracted Scope Updates Table */}
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-3 font-semibold">
                      Real-Time Scope Updates
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            tune
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface">Fixture</span>
                        </div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">
                          Mixer Tap (Confirmed)
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            valve
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface">
                            Water Isolation
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-semibold">
                          Accessible
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#FEF3C7]/60 flex items-center justify-between sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#D97706] text-[18px]">
                            water
                          </span>
                          <span className="font-body-sm text-body-sm text-[#92400E] font-medium">
                            Cabinet Base Moisture
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-bold">
                          Damp (Concealed Leak Risk)
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Recommendation Alert Pill */}
                  <div className="p-3.5 rounded-xl bg-[#FEF3C7] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#D97706] text-[20px]">
                        notification_important
                      </span>
                      <div>
                        <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#92400E] block leading-none font-bold">
                          Scope Recommendation
                        </span>
                        <span className="font-headline-sm text-headline-sm text-[#92400E] font-bold">
                          Inspection required before fixed quote
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[#92400E] text-[18px]">lock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Section 4: Three Benefit Cards */}
        <section className="w-full py-16 md:py-24 bg-surface-container-low/40 scroll-mt-16" id="features">
          <div className="max-w-7xl mx-auto px-margin">
            <div className="text-center max-w-2xl mx-auto mb-16" data-reveal>
              <span className="font-label-md text-label-md text-primary font-semibold tracking-wider uppercase mb-2 block">
                Built for Practice
              </span>
              <h2 className="font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-on-surface tracking-tight">
                Designed for the reality of residential trade service
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter" data-stagger-group>
              {/* Card 1 */}
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-[28px]">speed</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-3">
                    Respond faster
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Turn messy SMS messages, vague emails, and portal inquiries into actionable
                    scopes in under 60 seconds. Dispatch qualified tradies without morning phone
                    tag.
                  </p>
                </div>
                <div className="pt-8 mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg text-primary font-bold">60s</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Average triage speed
                    </span>
                  </div>
                </div>
              </div>
              {/* Card 2 */}
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#D97706] text-[28px]">
                      shield_with_heart
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-3">
                    Avoid incomplete scopes
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Catch hidden sub-floor dampness, seized isolation valves, and non-standard
                    pipework before giving an unchangeable price that burns your gross margins.
                  </p>
                </div>
                <div className="pt-8 mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg text-on-surface font-bold">
                      0%
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Unaccounted variation surprises
                    </span>
                  </div>
                </div>
              </div>
              {/* Card 3 */}
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-secondary text-[28px]">
                      history_edu
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-3">
                    Keep a clear evidence trail
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Scope history v1.0 through v2.0 with technician voice notes, homeowner photos,
                    and timestamps attached to every customer-facing decision.
                  </p>
                </div>
                <div className="pt-8 mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg text-secondary font-bold">
                      100%
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Standards &amp; trade-aligned audit log
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Section 5: High-Impact Navy Call-To-Action Banner */}
        <section className="w-full py-16 md:py-24 scroll-mt-16" id="cta">
          <div className="max-w-7xl mx-auto px-margin" data-reveal>
            <div className="bg-[#102A43] text-[#ffffff] rounded-3xl p-8 md:p-16 relative overflow-hidden shadow-2xl">
              {/* Architectural Grid Background Accent */}
              <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[140px]">handyman</span>
              </div>
              <div className="relative z-10 max-w-2xl">
                <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider font-semibold block mb-3">
                  Deploy in under 15 minutes
                </span>
                <h2 className="font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-white font-bold tracking-tight mb-4 leading-tight">
                  Turn every enquiry into a better next step.
                </h2>
                <p className="font-body-lg text-body-lg text-[#d1e4ff] mb-8 leading-relaxed">
                  Give your dispatchers and technicians the confidence of structured scope
                  readiness before committing to fixed price commitments.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-space-md mb-8">
                  <Link
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-all shadow-[0_2px_12px_rgba(15,118,110,0.4)]"
                    href="/dashboard"
                  >
                    <span>Open QuoteReady demo</span>
                    <span className="material-symbols-outlined ml-2 text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#ffffff]/10 text-white font-label-lg text-label-lg hover:bg-[#ffffff]/20 transition-colors"
                    href="/signup"
                  >
                    <span>Schedule walkthrough</span>
                  </Link>
                </div>
                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[#b0c9e8] font-label-sm text-label-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">
                      check_circle
                    </span>
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">
                      gavel
                    </span>
                    <span>AS/NZS compliance aware</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">
                      verified
                    </span>
                    <span>Tradie sign-off guaranteed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full bg-surface-container-low mt-space-xl">
        <div className="max-w-7xl mx-auto px-margin py-space-xl flex flex-col gap-space-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            <div className="md:col-span-5 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm">
                <BrandLogoSvg tone="light" wordmark={false} className="h-7 w-auto object-contain" />
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                  QuoteReady
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                Scope-readiness software for trade businesses. Built for tradie oversight across
                Australian residential trade teams.
              </p>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  location_on
                </span>
                <span>Engineered in Melbourne, Victoria, Australia</span>
              </div>
            </div>
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-gutter">
              <div className="flex flex-col gap-space-sm">
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Platform
                </span>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="#top"
                  onClick={scrollToTop}
                >
                  Product
                </Link>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="#features"
                >
                  Features
                </Link>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="#how-it-works"
                >
                  How it works
                </Link>
              </div>
              <div className="flex flex-col gap-space-sm">
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Resources
                </span>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="/dashboard"
                >
                  Demo Sandbox
                </Link>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="#cta"
                >
                  Customer Stories
                </Link>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="#evidence-voice"
                >
                  Trade Assurance
                </Link>
              </div>
              <div className="flex flex-col gap-space-sm">
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Compliance
                </span>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="/settings"
                >
                  Privacy
                </Link>
                <Link
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  href="/settings"
                >
                  Terms
                </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                href="#evidence-voice"
              >
                Trade Assurance
              </Link>
            </div>
          </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-lg text-on-surface-variant font-label-sm text-label-sm">
            <p>© 2025 QuoteReady Systems Pty Ltd. All rights reserved.</p>
            <p className="text-center sm:text-right">
              Australian Standards &amp; trade-aligned operational frameworks.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
