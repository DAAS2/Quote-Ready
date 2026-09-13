"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────────────────────
 * "Preparing the job scope" — transcribed 1:1 from the preparing-scope design.
 * Runs the real analysis (POST /api/jobs/[id]/analyse) while the staged
 * progress sequence plays, then routes to the job detail review screen.
 * ──────────────────────────────────────────────────────────────────────────── */

function basename(path: string): string {
  const clean = path.split("?")[0]!;
  const parts = clean.split("/");
  return parts[parts.length - 1] || "customer-photo.jpg";
}

function shortLabel(s: string, max = 44): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function AnalysingView({
  jobId,
  queueRef,
  enquiryRef,
  customerName,
  jobTypeLabel,
  photoPaths,
  photoClaims,
  urgencyLabel,
}: {
  jobId: string;
  queueRef: string;
  enquiryRef: string;
  customerName: string;
  jobTypeLabel: string;
  photoPaths: string[];
  photoClaims: string[];
  urgencyLabel: string;
}) {
  const router = useRouter();
  const [scanProgress, setScanProgress] = useState(58);
  const [photoProgress, setPhotoProgress] = useState(20);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(1);
  const [eta, setEta] = useState("~8 seconds");
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // staged progress animation
    const ticker = setInterval(() => {
      setScanProgress((p) => (p < 92 ? p + Math.floor(Math.random() * 4) + 1 : p));
      setPhotoProgress((p) => (p < 96 ? p + Math.floor(Math.random() * 6) + 2 : p));
    }, 1200);
    timers.push(ticker as unknown as ReturnType<typeof setTimeout>);
    timers.push(
      setTimeout(() => setEta("~5 seconds"), 2500) as unknown as ReturnType<typeof setTimeout>,
    );
    timers.push(
      setTimeout(() => setEta("~2 seconds"), 4500) as unknown as ReturnType<typeof setTimeout>,
    );

    // run the real analysis
    void (async () => {
      const startedAt = Date.now();
      try {
        const res = await fetch(`/api/jobs/${jobId}/analyse`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, 3200 - elapsed);
        timers.push(
          setTimeout(() => {
            if (cancelled || finishedRef.current) return;
            finishedRef.current = true;
            clearInterval(ticker);
            setStage(3);
            setScanProgress(100);
            setPhotoProgress(100);
            if (data.used_fallback) {
              toast.message("Analysis completed with the offline rule engine.");
            }
            setTimeout(() => router.replace(`/jobs/${jobId}`), 700);
          }, wait) as unknown as ReturnType<typeof setTimeout>,
        );
      } catch (error) {
        if (cancelled) return;
        clearInterval(ticker);
        toast.error((error as Error).message);
        setTimeout(() => router.replace(`/jobs/${jobId}`), 900);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearInterval(ticker);
    };
  }, [jobId, router]);

  function cancel() {
    finishedRef.current = true;
    router.push(`/jobs/${jobId}`);
  }

  const photos = photoPaths.slice(0, 2);

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb & Status Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-lg">
        <div className="flex items-center gap-space-xs font-label-md text-label-md">
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            href="/jobs"
          >
            <span className="material-symbols-outlined text-[16px]">handyman</span>
            <span>Jobs</span>
          </Link>
          <span className="text-outline-variant font-label-sm">/</span>
          <Link className="text-on-surface-variant hover:text-primary transition-colors" href="/jobs/new">
            New enquiry
          </Link>
          <span className="text-outline-variant font-label-sm">/</span>
          <span className="text-primary font-label-md font-semibold bg-surface-container-low px-2 py-0.5 rounded">
            Preparing scope
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-data-mono text-label-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span>Analysis queue · ID {queueRef}</span>
        </div>
      </div>
      {/* Stepper Component */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md mb-space-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Step 1: Complete */}
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface">
                1. Enquiry details
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                Customer &amp; job requirements captured
              </span>
            </div>
          </div>
          {/* Step 2: Active / Analysing */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-2 rounded-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 relative">
              <span
                className={`material-symbols-outlined text-[18px] ${stage < 3 ? "animate-spin" : ""}`}
              >
                {stage >= 3 ? "check" : "sync"}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  2. Analysis &amp; scoping
                </span>
                <span className="px-1.5 py-0.2 bg-primary/15 text-primary text-[10px] font-data-mono rounded uppercase tracking-wider">
                  {stage >= 3 ? "Complete" : "In Flight"}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-primary truncate font-medium">
                {stage >= 3 ? "Scope pack ready for review" : "Analysing intake data & media..."}
              </span>
            </div>
          </div>
          {/* Step 3: Upcoming */}
          <div className={`flex items-center gap-space-sm ${stage >= 3 ? "" : "opacity-60"}`}>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0">
              <span className="font-data-mono text-label-sm font-semibold">3</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface">3. Review scope</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                Check trade assumptions &amp; quote items
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Focused Workspace Layout (Split 8 / 4 column balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Main Analysis Card (Cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm p-space-lg relative overflow-hidden">
          {/* Top Decorative Scanning Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-surface-container-high">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
          {/* Card Header */}
          <div className="flex flex-col gap-space-sm pb-space-md">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm">
                <span className="relative flex h-2 w-2">
                  {stage < 3 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="font-semibold tracking-wide">
                  {stage >= 3 ? "Scope analysis complete" : "Scope analysis in progress"}
                </span>
              </div>
              <span className="font-data-mono text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded">
                {stage >= 3 ? "Opening review…" : `ETA ${eta}`}
              </span>
            </div>
            <div className="flex items-start gap-space-md pt-2">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[28px]">search_insights</span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                  Preparing the job scope
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant pt-0.5">
                  We’re turning the enquiry and attached evidence into a reviewable quote-readiness
                  assessment.
                </p>
              </div>
            </div>
            {/* Enquiry Metadata Strip */}
            <div className="mt-space-sm p-space-sm rounded-lg bg-surface-container-low flex flex-wrap items-center gap-y-1.5 gap-x-3 text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-1.5 font-data-mono font-semibold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  receipt_long
                </span>
                <span>REF: {enquiryRef}</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                  person
                </span>
                <span className="text-on-surface font-medium">{customerName}</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                  water_damage
                </span>
                <span>{jobTypeLabel}</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1 text-primary font-medium">
                <span className="material-symbols-outlined text-[15px]">image</span>
                <span>{photoPaths.length} photo{photoPaths.length === 1 ? "" : "s"} attached</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                  schedule
                </span>
                <span>{urgencyLabel}</span>
              </div>
            </div>
          </div>
          {/* Vertical Progress Sequencing Flow */}
          <div className="flex flex-col gap-space-md pt-space-sm">
            {/* Step 1: Customer Details (Complete) */}
            <div className="flex items-start gap-space-md p-space-sm rounded-lg bg-surface-container-lowest transition-colors">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Reading customer details
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider bg-surface-container-low px-2 py-0.5 rounded">
                    Processed
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                  Extracted contact details, the customer&apos;s service suburb, and the requested
                  urgency timeline ({urgencyLabel}).
                </p>
              </div>
            </div>
            {/* Step 2: Attached Photos (Active with Photo Previews) */}
            <div className="flex items-start gap-space-md p-space-md rounded-xl bg-surface-container-low transition-all">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <span
                  className={`material-symbols-outlined text-[20px] ${stage >= 3 ? "" : "animate-spin"}`}
                >
                  {stage >= 3 ? "check" : "progress_activity"}
                </span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Reviewing attached photos
                    </span>
                    <span className="text-primary font-data-mono text-label-sm font-semibold">
                      {photoPaths.length === 0 ? "No photos" : `${photoProgress}%`}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    {photoPaths.length === 0 ? "Text-only analysis" : "Vision parsing active"}
                  </span>
                </div>
                {/* Mini Progress Bar */}
                <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${photoPaths.length === 0 ? 100 : photoProgress}%` }}
                  ></div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-2">
                  {photoPaths.length === 0
                    ? "No photos were attached — analysis continues from the written enquiry details..."
                    : `Detecting fixture model, basin spout drip rate, and under-sink isolation valve visibility across ${photoPaths.length} file${photoPaths.length === 1 ? "" : "s"}...`}
                </p>
                {/* Embedded Image Evidence Cards */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-sm">
                    {photos.map((src, i) => (
                      <div
                        key={src}
                        className="flex items-center gap-space-sm p-2 rounded-lg bg-surface-container-lowest shadow-sm"
                      >
                        <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-surface-container">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={`Attached evidence ${i + 1}`} className="w-full h-full object-cover" src={src} />
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <span
                              className={`material-symbols-outlined text-primary text-[18px] ${i === 0 ? "animate-pulse" : "animate-spin"}`}
                            >
                              {i === 0 ? "document_scanner" : "center_focus_strong"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-sm text-label-sm font-data-mono text-on-surface truncate">
                            {basename(src)}
                          </span>
                          {i === 0 ? (
                            <div className="flex items-center gap-1 text-[11px] text-primary font-medium pt-0.5">
                              <span className="material-symbols-outlined text-[13px]">
                                check_small
                              </span>
                              <span>
                                {photoClaims[i]
                                  ? shortLabel(photoClaims[i]!, 30)
                                  : "Fixture patterns detected"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-secondary font-medium pt-0.5">
                              <span className="material-symbols-outlined text-[13px] animate-spin">
                                refresh
                              </span>
                              <span>
                                {photoClaims[i] ? shortLabel(photoClaims[i]!, 30) : "Scanning access..."}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Step 3: Required Scope Details */}
            <div
              className={`flex items-start gap-space-md p-space-sm rounded-lg transition-colors ${
                stage >= 3 ? "bg-surface-container-lowest" : "bg-surface-container-lowest opacity-75"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  stage >= 3
                    ? "bg-surface-container text-primary"
                    : "bg-surface-container-high text-outline"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {stage >= 3 ? "check_circle" : "radio_button_unchecked"}
                </span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-medium">
                    Checking required scope details
                  </span>
                  <span className="font-label-sm text-label-sm font-data-mono text-primary">
                    {stage >= 3 ? "Processed" : "Queued"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                  Verifying fixture specifications, isolation access, AS/NZS 3500 expectations, and
                  water meter isolation requirements.
                </p>
              </div>
            </div>
            {/* Step 4: Next-step Recommendation */}
            <div
              className={`flex items-start gap-space-md p-space-sm rounded-lg transition-colors ${
                stage >= 3 ? "bg-surface-container-lowest" : "bg-surface-container-lowest opacity-60"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  stage >= 3
                    ? "bg-surface-container text-primary"
                    : "bg-surface-container-high text-outline"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {stage >= 3 ? "check_circle" : "hourglass_empty"}
                </span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-medium">
                    Preparing next-step recommendation
                  </span>
                  <span className="font-label-sm text-label-sm font-data-mono text-primary">
                    {stage >= 3 ? "Processed" : "Pending"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                  Synthesising scope completeness score, required labour allowance, and drafting
                  tradie review options.
                </p>
              </div>
            </div>
          </div>
          {/* Action Footer Strip */}
          <div className="mt-space-lg pt-space-md bg-surface-container-low/40 rounded-lg p-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">lock_clock</span>
              <span>Analysing against your own standard rate cards — no prices are generated</span>
            </div>
            <button
              className="w-full sm:w-auto px-space-md py-2 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-error hover:bg-error-container/40 font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 shadow-sm"
              onClick={cancel}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>Cancel and return to draft</span>
            </button>
          </div>
        </div>
        {/* Right Side Mini Panel: "What happens next" (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Guidance Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col">
            <div className="flex items-center justify-between pb-space-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                What happens next
              </h2>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                info
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant pb-space-md">
              QuoteReady structures raw customer enquiries into standard trade job scopes before
              quotes are prepared.
            </p>
            {/* Bulleted Guidance List */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">fact_check</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Known facts will be extracted
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                    Customer suburb, fixture area, stated urgency, and photo-confirmed details are
                    organized cleanly.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">checklist</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Missing info will be highlighted
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                    Unconfirmed measurements, brand codes, or hidden under-bench access hurdles are
                    flagged for confirmation.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">warning_amber</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Inspection signals checked
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                    Concealed leaks, seized isolation valves, or high water pressure indicators (over
                    500 kPa) flagged early.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">
                    assignment_turned_in
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    You review &amp; approve every action
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant pt-0.5">
                    You retain 100% control over hourly rates, parts margin markup, and all client
                    messages.
                  </span>
                </div>
              </div>
            </div>
            {/* Metric pill summary */}
            <div className="mt-space-md pt-space-md bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-label-sm text-label-sm">
                  Pricing
                </span>
                <span className="font-data-mono font-bold text-on-surface text-label-lg">
                  Your rate card
                </span>
              </div>
              <div className="h-8 w-px bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-label-sm text-label-sm">
                  Rates &amp; margins
                </span>
                <span className="font-data-mono font-bold text-primary text-label-lg">
                  Stay under your review
                </span>
              </div>
            </div>
          </div>
          {/* Tradie trust & safety shield card */}
          <div className="bg-surface-container-high rounded-xl p-space-md shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Tradie Oversight Guarantee
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-1 leading-snug">
                  QuoteReady never auto-sends quotes or texts customers without your explicit
                  sign-off. Every material estimate remains completely under your manual review.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-on-surface-variant font-data-mono text-[11px] pt-2">
              <span>Your workspace rulebook</span>
              <span className="flex items-center gap-1 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Strict Manual Dispatch
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
