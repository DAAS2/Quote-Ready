"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TOUR_REQUEST_EVENT,
  TOUR_STEPS,
  finishTour,
  isTourPending,
  readTourJobId,
  readTourStep,
  resolveTourRoute,
  writeTourStep,
} from "@/lib/onboarding/tour";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

/**
 * Interactive onboarding tour.
 *
 * A blurred, dimmed overlay with a crisp "hole" cut around the real element
 * the user must interact with. The hole is produced with four backdrop panels
 * so the highlighted control stays fully clickable (and unblurred), which is
 * what makes the tour genuinely interactive rather than a slideshow.
 */
export function TourOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const jobIdRef = useRef<string | null>(null);
  const advancedRef = useRef(false);

  const begin = useCallback(() => {
    setIndex(readTourStep());
    jobIdRef.current = readTourJobId();
    setActive(true);
  }, []);

  // Pick up a pending tour request (set by signup / settings). The event lets
  // an already-mounted overlay restart the tour when replayed from Settings.
  useEffect(() => {
    if (isTourPending()) begin();
    const onRequest = () => begin();
    window.addEventListener(TOUR_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(TOUR_REQUEST_EVENT, onRequest);
  }, [begin]);

  const step = TOUR_STEPS[Math.min(index, TOUR_STEPS.length - 1)]!;

  const end = useCallback(
    (completed: boolean) => {
      setActive(false);
      setRect(null);
      finishTour(completed);
    },
    [],
  );

  const goto = useCallback(
    (next: number) => {
      if (next >= TOUR_STEPS.length) {
        end(true);
        return;
      }
      writeTourStep(next);
      advancedRef.current = false;
      setIndex(next);
    },
    [end],
  );

  // Navigate to the route a step belongs to.
  useEffect(() => {
    if (!active) return;
    const route = step.route;
    if (!route) return;
    // read the job id fresh each time — the enquiry form stores it mid-tour
    const target = resolveTourRoute(route, readTourJobId() ?? jobIdRef.current);
    if (!target || target === "/jobs/") return;
    const [base, query] = target.split("?");
    // Treat nested routes (e.g. /jobs/:id/analysing) as already "here" so the
    // tour never interrupts an in-flight analysis redirect.
    if (pathname.startsWith(`${base}/`)) return;
    if (pathname === base) {
      // Same path but the step needs a query flag (e.g. /jobs/new?tour=1 for
      // the pre-filled tour enquiry) — the plain link landed without it.
      const current = window.location.search.replace(/^\?/, "");
      if (!query || current === query) return;
    }
    router.push(query ? `${base}?${query}` : base);
  }, [active, step, pathname, router]);

  // Track the highlighted element's position while the step is active.
  useEffect(() => {
    if (!active) return;
    if (!step.target) {
      setRect(null);
      setMissing(false);
      return;
    }
    let tick = 0;
    const element = () =>
      document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const measure = () => {
      const el = element();
      if (!el) {
        tick += 1;
        if (tick > 16) {
          setRect(null);
          setMissing(true);
        }
        return;
      }
      tick = 0;
      setMissing(false);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const first = element();
    if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const interval = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  // Advance when the user clicks the highlighted element.
  useEffect(() => {
    if (!active || !step.advanceOnClick || !step.target) return;
    const onClick = (event: MouseEvent) => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      const node = event.target as Node | null;
      if (el && node && (el === node || el.contains(node)) && !advancedRef.current) {
        advancedRef.current = true;
        window.setTimeout(() => goto(index + 1), 500);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, step, index, goto]);

  if (!active) return null;

  const hole: Rect | null = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  const tooltip = positionTooltip(hole, step.placement ?? "bottom");
  const waiting = Boolean(step.advanceOnClick && hole);

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Product tour"
    >
      {hole ? (
        <>
          {/* Blurred, dimmed backdrop panels — the hole between them stays crisp
              and clickable so the user actually performs each action. */}
          <BackdropPanel style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <BackdropPanel
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <BackdropPanel
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          />
          <BackdropPanel
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          {/* Light ring + glow around the highlighted element */}
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-white/90 transition-all duration-200"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow:
                "0 0 0 1px rgba(15,118,110,0.6), 0 0 28px 6px rgba(163,250,239,0.35)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-auto bg-[#0b1524]/60 backdrop-blur-[2px]" />
      )}

      {/* Tooltip / step card */}
      <div
        className="absolute z-[101] pointer-events-auto w-[min(92vw,380px)] rounded-2xl bg-surface-container-lowest shadow-2xl p-5 flex flex-col gap-3"
        style={{ top: tooltip.top, left: tooltip.left }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-container/15 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">school</span>
            Step {index + 1} of {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => end(false)}
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Skip tour
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{step.title}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {step.body}
          </p>
        </div>
        {waiting && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-container/10 text-primary">
            <span className="material-symbols-outlined text-[18px] animate-pulse">
              touch_app
            </span>
            <span className="font-label-md text-label-md">
              Click the highlighted element to continue
            </span>
          </div>
        )}
        {missing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span className="font-label-md text-label-md">
              Take a look around, then continue when ready.
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => goto(Math.max(0, index - 1))}
            disabled={index === 0}
            className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => goto(index + 1)}
            disabled={waiting}
            className="h-9 px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {index === TOUR_STEPS.length - 1 ? "Finish" : waiting ? "Waiting…" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackdropPanel({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute pointer-events-auto bg-[#0b1524]/60 backdrop-blur-[2px]"
      style={style}
      aria-hidden
    />
  );
}

function positionTooltip(hole: Rect | null, placement: string): { top: number; left: number } {
  if (typeof window === "undefined") return { top: 0, left: 0 };
  const W = Math.min(window.innerWidth * 0.92, 380);
  const H = 240;
  if (!hole || placement === "center") {
    return {
      top: Math.max(16, (window.innerHeight - H) / 2),
      left: Math.max(16, (window.innerWidth - W) / 2),
    };
  }
  const gap = 16;
  let top = hole.top + hole.height + gap;
  let left = hole.left;
  if (placement === "top") top = hole.top - H - gap;
  if (placement === "left") {
    top = hole.top;
    left = hole.left - W - gap;
  }
  if (placement === "right") {
    top = hole.top;
    left = hole.left + hole.width + gap;
  }
  // keep within the viewport
  if (top < 12) top = hole.top + hole.height + gap;
  if (top + H > window.innerHeight - 12) top = Math.max(12, window.innerHeight - H - 12);
  if (left < 12) left = 12;
  if (left + W > window.innerWidth - 12) left = Math.max(12, window.innerWidth - W - 12);
  return { top, left };
}
