"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BrandLogoSvg } from "@/components/brand/logo";

/* ────────────────────────────────────────────────────────────────────────────
 * Landing page — transcribed from the B2B SaaS landing design, upgraded with
 * GSAP scroll-reveal motion and a fully interactive, clickable hero demo:
 * intake → analysis loading → typed follow-up draft → approved + notification.
 * ──────────────────────────────────────────────────────────────────────────── */

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DRAFT_MESSAGE =
  "Hi Jordan, thanks for sending through photos of your bathroom tap. To help us confirm the exact repair approach and parts, could you please send a quick photo of the underside plumbing showing whether the mini-stop valves turn smoothly? Based on current details, an on-site diagnostic inspection ($89 refundable against work) is strongly recommended before fixing a price, so we don't encounter unforeseen variations.";

type DemoStage = "intake" | "analysing" | "scoped" | "sent";

function HeroShowcase() {
  const [stage, setStage] = useState<DemoStage>("intake");
  const [progress, setProgress] = useState(0);
  const [typed, setTyped] = useState("");
  const [notifications, setNotifications] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  // staged typing for the follow-up draft
  useEffect(() => {
    if (stage !== "scoped") return;
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setTyped(DRAFT_MESSAGE.slice(0, i));
      if (i >= DRAFT_MESSAGE.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [stage]);

  // pop the notification chip when the follow-up is approved
  useEffect(() => {
    if (stage !== "sent" || !root.current) return;
    const chip = root.current.querySelector(".hero-notification");
    if (chip) {
      gsap.fromTo(
        chip,
        { scale: 0.6, autoAlpha: 0, y: 8 },
        { scale: 1, autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(2)" },
      );
    }
  }, [stage]);

  const runAnalysis = useCallback(() => {
    setStage("analysing");
    setProgress(0);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.floor(Math.random() * 9) + 5;
      if (p >= 62) {
        p = 62;
        clearInterval(timer);
        setTimeout(() => setStage("scoped"), 350);
      }
      setProgress(p);
    }, 130);
  }, []);

  const approve = useCallback(() => {
    setStage("sent");
    setNotifications((n) => n + 1);
  }, []);

  const replay = useCallback(() => {
    setStage("intake");
    setProgress(0);
    setTyped("");
  }, []);

  // Endless auto-play: intake → analysing → scoped draft → approved → replay.
  useEffect(() => {
    if (stage === "intake") {
      const t = setTimeout(runAnalysis, 1800);
      return () => clearTimeout(t);
    }
    if (stage === "scoped") {
      const t = setTimeout(approve, 4200);
      return () => clearTimeout(t);
    }
    if (stage === "sent") {
      const t = setTimeout(replay, 4600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage, runAnalysis, approve, replay]);

  const analysed = stage === "scoped" || stage === "sent";
  const dashOffset = 88 * (1 - progress / 100);

  return (
    <div ref={root} className="w-full max-w-5xl mt-12 text-left">
      <div className="rounded-xl overflow-hidden bg-surface-container-lowest shadow-[0_12px_36px_rgba(16,42,67,0.09)] transition-all">
        {/* Realistic browser chrome */}
        <div className="bg-surface-container-high">
          {/* Tab strip */}
          <div className="flex items-end gap-2 px-3 pt-2.5">
            <div className="flex items-center gap-1.5 pb-2 pl-1">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-2 rounded-t-lg bg-surface-container-lowest px-3 py-1.5 max-w-[280px] min-w-0">
              <BrandLogoSvg tone="light" wordmark={false} className="h-4 w-4 shrink-0" />
              <span className="font-body-sm text-body-sm text-on-surface truncate">
                Job QR-2024-089 · QuoteReady
              </span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant shrink-0">
                close
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant pb-2">
              add
            </span>
          </div>
          {/* Toolbar + address bar */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="hidden sm:flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="material-symbols-outlined text-[18px] opacity-40">arrow_forward</span>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-0 h-8 px-3 rounded-full bg-surface-container-lowest text-on-surface-variant font-data-mono text-label-sm shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-[#15803D]">lock</span>
              <span className="truncate">
                app.quoteready.com.au/jobs/QR-2024-089
              </span>
            </div>
            <div className="hidden md:flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>Audit Sync Active</span>
              </span>
              {/* Live notification bell (clickable) */}
              <span className="relative flex items-center">
                <button
                  type="button"
                  aria-label={`Notifications (${notifications})`}
                  className="relative p-1 rounded-lg hover:bg-surface-container-lowest/60 transition-colors"
                  onClick={() => setNotifications(0)}
                >
                  <span className="material-symbols-outlined text-[18px]">notifications</span>
                  {notifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-error text-on-error font-data-mono text-[8px] font-bold flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </span>
            </div>
          </div>
        </div>
        {/* Job Header Bar inside Mockup */}
        <div className="p-4 sm:p-6 bg-surface-container-lowest flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-data-mono text-label-sm text-primary font-semibold">
                QR-2024-089
              </span>
              <span className="text-outline-variant text-label-sm">•</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Received 08:24 AM via Web Form
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
              Jordan Lee · Leaking bathroom tap · Brunswick, VIC
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Readiness Indicator (animates during analysis) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container">
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="text-outline-variant/30"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="3"
                  ></circle>
                  <circle
                    className="text-primary-container transition-all duration-300"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="14"
                    stroke="currentColor"
                    strokeDasharray="88"
                    strokeDashoffset={dashOffset}
                    strokeWidth="3"
                  ></circle>
                </svg>
                <span className="absolute font-data-mono text-[9px] font-bold text-on-surface">
                  {progress}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-on-surface-variant leading-none">
                  SCOPE READINESS
                </span>
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  {analysed ? "Needs Info" : stage === "analysing" ? "Analysing…" : "New enquiry"}
                </span>
              </div>
            </div>
            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
                analysed
                  ? "bg-[#FEF3C7] text-[#92400E]"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {stage === "analysing" ? (
                <span className="material-symbols-outlined text-[16px] text-primary animate-spin">
                  progress_activity
                </span>
              ) : (
                <span
                  className={`material-symbols-outlined text-[16px] ${analysed ? "text-[#D97706]" : "text-outline"}`}
                >
                  {analysed ? "warning" : "inbox"}
                </span>
              )}
              <span>
                {analysed
                  ? "Inspection recommended"
                  : stage === "analysing"
                    ? "Analysing intake…"
                    : "Awaiting analysis"}
              </span>
            </div>
          </div>
        </div>
        {/* Two-column Work Surface inside Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-surface-container-low/40">
          {/* Left Side: Known Details & Missing Scope */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col gap-6">
            {/* Verified Facts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    verified
                  </span>
                  Known details (Customer Provided)
                </h3>
                <span className="font-label-sm text-label-sm text-primary font-medium">
                  4 Verified Facts
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-body-sm font-body-sm py-1">
                  <span className="text-on-surface-variant">Customer Contact</span>
                  <span className="font-data-mono text-on-surface font-medium">
                    Jordan Lee (0412 884 •••)
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm py-1">
                  <span className="text-on-surface-variant">Job Location</span>
                  <span className="font-body-sm text-on-surface font-medium">
                    Brunswick, VIC 3056
                  </span>
                </div>
                {/* Fixture Verification with Thumbnail 1 */}
                <div className="flex items-start justify-between text-body-sm font-body-sm pt-2">
                  <div className="flex flex-col">
                    <span className="text-on-surface font-medium">Fixture: Basin Mixer Tap</span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">
                      Single lever chrome unit with aerator drip
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-medium">
                      Photo 1 verified
                    </span>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-container-high shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Basin mixer tap drip verification"
                        className="w-full h-full object-cover"
                        src="/demo/tap-1.jpg"
                      />
                    </div>
                  </div>
                </div>
                {/* Access Verification with Thumbnail 2 */}
                <div className="flex items-start justify-between text-body-sm font-body-sm pt-2">
                  <div className="flex flex-col">
                    <span className="text-on-surface font-medium">
                      Access: Under-vanity Cupboard
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">
                      Twin braided flexi hoses &amp; PVC S-trap visible
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-medium">
                      Photo 2 verified
                    </span>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-container-high shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Under vanity cupboard plumbing access"
                        className="w-full h-full object-cover"
                        src="/demo/tap-2.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Missing Scope Checklist (appears after analysis) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#D97706] text-[18px]">
                    pending_actions
                  </span>
                  Missing information ({analysed ? "3" : "…"} Pending flags)
                </h3>
                {analysed && (
                  <span className="font-label-sm text-label-sm text-[#B91C1C] font-semibold">
                    Blocks Fixed Quote
                  </span>
                )}
              </div>
              {analysed ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FEF3C7]/40 hero-flag">
                    <span className="material-symbols-outlined text-[#D97706] text-[20px] shrink-0 mt-0.5">
                      error_outline
                    </span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-[#92400E]">
                        Cartridge manufacturer code unconfirmed
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Cannot determine if 35mm / 40mm European disc or complete mixer replacement
                        required.
                      </p>
                    </div>
                    <span className="text-label-sm font-label-sm bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded uppercase font-semibold">
                      High risk
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-lowest hero-flag">
                    <span className="material-symbols-outlined text-outline text-[20px] shrink-0 mt-0.5">
                      radio_button_unchecked
                    </span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">
                        Water isolation valve condition unverified
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Mini-stops visible but calcification grade unknown. Main meter shutoff may
                        be required.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FEE2E2]/50 hero-flag">
                    <span className="material-symbols-outlined text-[#B91C1C] text-[20px] shrink-0 mt-0.5">
                      water_damage
                    </span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-[#B91C1C]">
                        Concealed cabinet floor moisture status unconfirmed
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Photo 2 hints at timber swelling beneath S-trap collar. Risk of structural
                        floor replacement.
                      </p>
                    </div>
                    <span className="text-label-sm font-label-sm bg-[#FEE2E2] text-[#B91C1C] px-2 py-0.5 rounded font-semibold">
                      Variation Risk
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-container-lowest p-4 shadow-sm flex items-center gap-3">
                  {stage === "analysing" ? (
                    <>
                      <span className="material-symbols-outlined text-primary text-[20px] animate-spin">
                        progress_activity
                      </span>
                      <div className="flex-1">
                        <p className="font-label-md text-label-md text-on-surface">
                          Analysing enquiry &amp; photos…
                        </p>
                        <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="font-data-mono text-label-sm text-primary font-semibold">
                        {progress}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-outline text-[20px]">
                        hourglass_empty
                      </span>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Flags will appear here after the scope analysis runs.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Right Side: AI Follow-up Draft & Action Deck */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-surface-container-lowest flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Customer follow-up draft
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  {stage === "sent" ? "Approved" : analysed ? "Ready for Review" : "Pending"}
                </span>
              </div>
              {/* Generated Message Bubble */}
              {analysed ? (
                <div
                  className={`bg-surface-container-low rounded-xl p-4 mb-4 font-body-md text-body-md text-on-surface leading-relaxed relative border-2 transition-colors ${
                    stage === "sent" ? "border-[#15803D]/40" : "border-transparent"
                  }`}
                >
                  <div className="absolute -top-2 left-6 w-3 h-3 bg-surface-container-low rotate-45"></div>
                  {stage === "sent" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 font-label-md text-label-md text-[#15803D] font-semibold mb-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Follow-up approved — logged to the audit timeline
                      </span>
                      <p className="text-on-surface-variant font-body-sm text-body-sm">
                        Nothing was sent automatically. Send through your usual customer channel.
                      </p>
                    </>
                  ) : (
                    <p>
                      {typed}
                      <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse align-middle"></span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-surface-container-low/60 rounded-xl p-4 mb-4 border-2 border-dashed border-outline-variant/40">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {stage === "analysing"
                      ? "Drafting the customer follow-up from the extracted scope…"
                      : "The draft message will be generated here once the analysis completes."}
                  </p>
                </div>
              )}
              {/* Scope Recommendation pill */}
              {analysed && (
                <div className="bg-surface-container-highest/60 rounded-lg p-3 mb-4 flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">rule</span>
                    <span className="text-on-surface">Suggested Job Type:</span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-primary-container">
                    Book On-Site Inspection (45 min)
                  </span>
                </div>
              )}
              {/* Success notification chip */}
              {stage === "sent" && (
                <div className="hero-notification p-3 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-center gap-2.5 mb-4">
                  <span className="material-symbols-outlined text-[#15803D] text-[20px]">
                    notifications_active
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-[#15803D] font-semibold">
                      Notification: follow-up approved
                    </span>
                    <span className="font-body-sm text-body-sm text-[#15803D]/80">
                      Audit event recorded · Alex Miller (Owner / Plumber)
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Dispatcher Control Buttons (interactive) */}
            <div className="pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="h-10 px-3 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center justify-center gap-1"
                  onClick={replay}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">replay</span>
                  <span>Replay demo</span>
                </button>
                {stage === "intake" ? (
                  <button
                    className="h-10 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-1 shadow-sm"
                    onClick={runAnalysis}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>Run analysis</span>
                  </button>
                ) : (
                  <button
                    className={`h-10 px-3 rounded-lg font-label-md text-label-md transition-colors flex items-center justify-center gap-1 shadow-sm ${
                      stage === "scoped"
                        ? "bg-primary-container text-on-primary hover:bg-primary"
                        : "bg-[#DCFCE7] text-[#15803D]"
                    }`}
                    onClick={stage === "scoped" ? approve : replay}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {stage === "scoped" ? "send" : "check_circle"}
                    </span>
                    <span>
                      {stage === "analysing"
                        ? "Analysing…"
                        : stage === "scoped"
                          ? "Approve follow-up"
                          : "Approved"}
                    </span>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm pt-2">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Approval logs to audit timeline. No automated dispatch.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

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

      return () => {
        // kill any triggers this page created so a route change can never
        // leave a dangling ScrollTrigger (which throws on the next tick)
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
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
              className="transition-colors text-primary font-label-lg"
              href="#top"
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
            {/* Interactive Hero Mockup — click "Run analysis", then "Approve follow-up" */}
            <div className="hero-el w-full flex justify-center">
              <HeroShowcase />
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
