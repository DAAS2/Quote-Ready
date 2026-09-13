"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RecordSiteNoteModal } from "@/components/jobs/record-site-note-modal";
import { FollowUpModal } from "@/components/jobs/follow-up-modal";
import { AddEvidencePanel } from "@/components/jobs/add-evidence-panel";
import type { DraftRow } from "@/lib/data/types";

/* ────────────────────────────────────────────────────────────────────────────
 * Job detail — transcribed 1:1 from the job-detail design (v1) and the
 * site-note-applied scope v2 design (shown once a voice note has been applied,
 * i.e. scope version ≥ 2). All actions hit the live API.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DetailProps {
  jobId: string;
  refJob: string;
  refQr: string;
  title: string;
  operatorName: string;
  customerName: string;
  customerInitials: string;
  phone: string;
  suburbLine: string;
  createdLine: string;
  updatedLine: string;
  jobTypeLabel: string;
  statusPill: string;
  statusLabel: string;
  statusIcon: string;
  statusKey: string;
  readiness: number;
  readinessTone: "primary" | "secondary" | "error" | "neutral";
  readinessDelta: number | null;
  missingCount: number;
  missingAskCount: number;
  scopeVersion: number | null;
  enquiryText: string;
  intakeLabel: string;
  urgencyLabel: string;
  photoCount: number;
  photos: Array<{ src: string; caption: string }>;
  knownFacts: Array<{ label: string; value: string; wide?: boolean }>;
  missingFields: Array<{ key: string; title: string; why: string; icon: string }>;
  evidenceTimeline: Array<{ id: string; title: string; sub: string; time: string; tone: "primary" | "secondary" }>;
  advisory: {
    recommended: boolean;
    safety: boolean;
    actionTitle: string;
    body: string;
    reasons: string[];
  };
  assumptions: string[];
  exclusions: string[];
  inspectionTriggers: string[];
  nextActions: Array<{ key: string; label: string }>;
  versions: Array<{
    version: number;
    latest: boolean;
    producedLabel: string;
    score: number;
    band: string;
    summary: string;
  }>;
  diffRows: Array<{
    param: string;
    before: string;
    after: string;
    pill?: string;
    pillTone: "primary" | "amber" | "error";
    afterTone: "default" | "amber" | "error";
  }>;
  hasScope: boolean;
  inspectionRecommended: boolean;
  /** `audioUrl` points at the saved recording; null when only the transcript was stored */
  voiceEvidence: { transcript: string; time: string; audioUrl: string | null } | null;
  drafts: DraftRow[];
  showAppliedBanner: boolean;
  auditCount: number;
  /** server-rendered quote panel, slotted into the left column */
  quotePanel?: ReactNode;
}

const READINESS_CIRCUMFERENCE = 113.1;

export function JobDetailView(props: DetailProps) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "note" | "followup">(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(props.nextActions.map((a) => [a.key, a.key === props.nextActions[0]?.key || a.key === props.nextActions[1]?.key])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(true);
  const [playing, setPlaying] = useState(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  /** Replay the saved field recording (the ElevenLabs-transcribed site note). */
  function toggleVoicePlayback() {
    const audio = voiceAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => toast.error("Could not play the saved recording."));
    } else {
      audio.pause();
    }
  }

  const isV2 = (props.scopeVersion ?? 1) >= 2 && props.versions.length >= 2;

  async function deleteEnquiry() {
    const confirmed = window.confirm(
      "Delete this enquiry? Its photos, voice notes, scope versions and drafts are removed permanently.",
    );
    if (!confirmed) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/jobs/${props.jobId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not delete the enquiry.");
      toast.success("Enquiry deleted.");
      router.push("/jobs");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(null);
    }
  }

  async function approveScope() {
    setBusy("approve");
    try {
      const res = await fetch(`/api/jobs/${props.jobId}/scope-approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not record the sign-off.");
      toast.success("Scope approved as-is — sign-off recorded to the audit timeline.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function scheduleInspection() {
    setBusy("inspect");
    try {
      const res = await fetch(`/api/jobs/${props.jobId}/inspect`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not request the inspection.");
      toast.success("On-site inspection requested — status updated.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function viewDiff() {
    document.getElementById("scope-diff")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const readinessOffset = READINESS_CIRCUMFERENCE * (1 - Math.min(props.readiness, 100) / 100);

  /* ── v2 readiness widget arc (percent-based path) ── */
  const arc = `M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831`;

  return (
    <>
      {/* v2: Top Success/Activity Banner */}
      {isV2 && props.showAppliedBanner && (
        <section className="w-full bg-surface-container-low rounded-xl p-space-md shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Site note applied
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-data-mono text-label-sm">
                    Applied just now · Scope v{props.scopeVersion}.0
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  QuoteReady created Scope version {props.scopeVersion} and updated the
                  recommendation based on new evidence.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container font-label-md text-label-md transition-colors shadow-sm"
                onClick={viewDiff}
                type="button"
              >
                <span>View diff</span>
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* v1: Top Breadcrumb & Status Navigation Anchor */}
      {!isV2 && (
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <Link className="hover:text-primary transition-colors" href="/jobs">
              Jobs
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-semibold">{props.customerName}</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface-variant">{props.title}</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Residential Maintenance
            </span>
            <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-data-mono text-label-sm">
              {props.refJob}
            </span>
          </div>
        </div>
      )}

      {/* v2: Breadcrumb Context */}
      {isV2 && (
        <header className="w-full flex flex-col gap-space-md">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <Link className="hover:text-primary transition-colors" href="/jobs">
              Jobs
            </Link>
            <span className="text-outline">/</span>
            <span>{props.customerName}</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-label-md">{props.title}</span>
          </div>
          {/* Title and Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                  {props.title}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm shadow-sm">
                  <span
                    className={`w-2 h-2 rounded-full bg-amber-600 ${props.inspectionRecommended ? "animate-pulse" : ""}`}
                  ></span>
                  {props.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap font-body-sm text-body-sm text-on-surface-variant">
                <span className="font-label-md text-on-surface">{props.customerName}</span>
                <span className="text-outline">•</span>
                <span>{props.suburbLine}</span>
                <span className="text-outline">•</span>
                <span className="font-data-mono text-data-mono text-secondary">{props.refQr}</span>
              </div>
              <div className="flex items-center gap-1.5 font-data-mono text-label-sm text-tertiary-fixed-dim">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>
                  {props.createdLine} · {props.updatedLine}
                </span>
              </div>
            </div>
            {/* Readiness Widget & Actions */}
            <div className="flex items-center gap-space-md flex-wrap shrink-0">
              <div
                data-tour="scope-readiness"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-sm"
              >
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container-highest"
                      d={arc}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    ></path>
                    <path
                      className={`transition-all duration-1000 ease-out ${
                        props.readinessTone === "primary"
                          ? "text-primary"
                          : props.readinessTone === "error"
                            ? "text-error"
                            : "text-amber-600"
                      }`}
                      d={arc}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${Math.min(props.readiness, 100)}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    ></path>
                  </svg>
                  <span className="absolute font-headline-sm text-headline-sm text-on-surface font-bold">
                    {props.readiness}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Readiness Score
                    </span>
                    {props.readinessDelta !== null && props.readinessDelta !== 0 && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded font-data-mono text-[10px] font-bold ${
                          props.readinessDelta < 0
                            ? "bg-amber-50 text-amber-800"
                            : "bg-[#DCFCE7] text-[#15803D]"
                        }`}
                      >
                        {props.readinessDelta < 0 ? "▼" : "▲"}{" "}
                        {props.readinessDelta > 0 ? "+" : ""}
                        {props.readinessDelta}%
                      </span>
                    )}
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-tight max-w-[190px]">
                    {props.readinessDelta !== null && props.readinessDelta < 0
                      ? "Site note added new risk signals"
                      : "Scope updated from the spoken site note"}
                  </p>
                </div>
              </div>
              {/* Quick Primary/Secondary CTAs */}
              <div className="flex items-center gap-2">
                <button
                  data-tour="record-site-note"
                  className="h-10 px-4 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container-low transition-colors flex items-center gap-2"
                  onClick={() => setModal("note")}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">mic</span>
                  <span>Record note</span>
                </button>
                <button
                  className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                  onClick={() => setModal("followup")}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">outgoing_mail</span>
                  <span>Review inspection message</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* v1: Header Section with Readiness Meter & Primary Controls */}
      {!isV2 && (
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-lg">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {props.title}
              </h1>
              {/* Prominent Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md font-semibold ${
                  props.readinessTone === "primary"
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : props.readinessTone === "error"
                      ? "bg-[#FEE2E2] text-[#B91C1C]"
                      : "bg-[#FEF3C7] text-[#92400E]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {props.statusIcon}
                </span>
                {props.statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-body-md text-body-md">
              <span className="font-semibold text-on-surface">{props.customerName}</span>
              <span className="text-outline">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  location_on
                </span>
                {props.suburbLine}
              </span>
              <span className="text-outline">•</span>
              <span className="flex items-center gap-1 font-data-mono text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  schedule
                </span>
                {props.createdLine}
              </span>
            </div>
          </div>
          {/* Right Side: Readiness Radial/Metric + Quick Actions */}
          <div className="flex flex-wrap items-center gap-space-lg">
            {/* Quote Readiness Visual Metric */}
            <div
              data-tour="scope-readiness"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low"
            >
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    className="text-surface-container-highest"
                    cx="22"
                    cy="22"
                    fill="none"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <circle
                    className={`text-primary transition-all duration-700 ${
                      props.readinessTone === "error" ? "text-error" : props.readinessTone === "secondary" ? "text-secondary" : ""
                    }`}
                    cx="22"
                    cy="22"
                    fill="none"
                    r="18"
                    stroke="currentColor"
                    strokeDasharray={READINESS_CIRCUMFERENCE}
                    strokeDashoffset={readinessOffset}
                    strokeLinecap="round"
                    strokeWidth="4"
                  ></circle>
                </svg>
                <span className="absolute font-display-lg text-[13px] font-bold text-on-surface tracking-tight">
                  {props.readiness}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Quote readiness
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {props.missingCount > 0
                    ? `Needs ${props.missingCount} item${props.missingCount === 1 ? "" : "s"} clarified`
                    : "All items clarified"}
                </span>
              </div>
            </div>
            {/* Action Button Group */}
            <div className="flex items-center gap-2">
              <button
                data-tour="record-site-note"
                className="h-10 px-4 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-lg text-label-lg flex items-center gap-2 shadow-sm transition-colors"
                onClick={() => setModal("note")}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">mic</span>
                <span>Record site note</span>
              </button>
              <button
                className="h-10 px-5 rounded-lg bg-primary hover:bg-[#0d655e] text-on-primary font-label-lg text-label-lg flex items-center gap-2 shadow-sm transition-all"
                onClick={() => setModal("followup")}
                type="button"
              >
                <span>Review follow-up</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Two-Column Operational Layout */}
      <div className={`grid grid-cols-1 xl:grid-cols-12 gap-space-lg ${isV2 ? "lg:grid-cols-12" : ""}`}>
        {/* LEFT COLUMN */}
        <div className={`xl:col-span-8 flex flex-col gap-space-lg min-w-0 ${isV2 ? "lg:col-span-8" : ""}`}>
          {isV2 ? (
            <>
              {/* v2 Card 1: Latest Evidence Card */}
              <section
                id="sec-required"
                className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
              >
                <div className="flex items-center justify-between border-b-0 pb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface">
                      Latest evidence on site
                    </h2>
                  </div>
                  <span className="font-data-mono text-label-sm text-outline">
                    Evidence Asset #EVD-{String(props.photoCount + 1).padStart(2, "0")}
                  </span>
                </div>
                {/* Voice Note Recording Observation Module */}
                {props.voiceEvidence && (
                  <div className="w-full rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-md shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary">
                          <span className="material-symbols-outlined text-[14px]">mic</span>
                        </span>
                        <span className="font-label-md text-label-md text-on-surface">
                          Spoken site note · Audio transcribed
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-data-mono text-label-sm text-on-surface-variant">
                        <span>{props.voiceEvidence.time}</span>
                        <span>•</span>
                        <span className="text-on-surface font-medium">{props.operatorName} (On-site)</span>
                      </div>
                    </div>
                    {/* Waveform Visualizer & Playback Mock */}
                    <div className="flex items-center gap-space-md bg-surface-container-lowest p-3 rounded-lg shadow-sm">
                      {props.voiceEvidence.audioUrl && (
                        <audio
                          className="hidden"
                          onEnded={() => setPlaying(false)}
                          onPause={() => setPlaying(false)}
                          onPlay={() => setPlaying(true)}
                          preload="none"
                          ref={voiceAudioRef}
                          src={props.voiceEvidence.audioUrl}
                        />
                      )}
                      <button
                        aria-label={playing ? "Pause the saved site note" : "Replay the saved site note"}
                        className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!props.voiceEvidence.audioUrl}
                        onClick={toggleVoicePlayback}
                        title={props.voiceEvidence.audioUrl ? "Replay the saved recording" : "No saved audio for this note"}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {playing ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      {/* SVG Audio Waveform */}
                      <div className="flex-1 flex items-center gap-0.5 h-7 overflow-hidden">
                        {[3, 5, 2, 6, 7, 4, 5, 3, 6, 4, 2, 5, 7, 3, 6, 4, 2, 5, 3, 1, 4, 6, 2, 4].map(
                          (h, i) => {
                            const hClass = ["h-1", "h-2", "h-3", "h-4", "h-5", "h-6", "h-7"][h - 1];
                            return (
                              <span
                                key={i}
                                className={`w-1 rounded-full ${hClass} ${
                                  h >= 5
                                    ? "bg-primary"
                                    : h >= 3
                                      ? "bg-primary-container"
                                      : "bg-outline-variant"
                                } ${playing ? "animate-pulse" : ""}`}
                              ></span>
                            );
                          },
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-data-mono text-label-sm">
                          0:18 audio duration
                        </span>
                      </div>
                    </div>
                    {/* Transcript Quote Box */}
                    <div className="relative pl-4 pr-3 py-2.5 bg-surface-container rounded-lg">
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r"></div>
                      <p className="font-body-md text-body-md text-on-surface italic">
                        “{props.voiceEvidence.transcript}”
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-outline">
                          Confidence: High (98% speech accuracy)
                        </span>
                        <button
                          className="text-primary hover:underline font-label-sm text-label-sm"
                          onClick={() => setModal("note")}
                          type="button"
                        >
                          View full transcript &amp; audio playback
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Site Photos Grid with Tagged Verification */}
                {props.photos.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface">
                        Inspection Photography ({props.photos.length} file
                        {props.photos.length === 1 ? "" : "s"} verified)
                      </span>
                      <span className="font-data-mono text-label-sm text-outline">
                        Uploaded via Mobile App
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      {props.photos.map((photo, i) => (
                        <div
                          key={photo.src}
                          className="relative rounded-xl overflow-hidden bg-surface-container-high aspect-video group shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            src={photo.src}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent flex flex-col justify-end p-3 text-inverse-on-surface">
                            <div className="flex items-center justify-between">
                              <span className="font-label-sm text-label-sm text-surface-container-lowest font-medium truncate">
                                Customer photo {i + 1}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-data-mono text-[10px] ${
                                  i === 1
                                    ? "bg-amber-600 text-on-primary"
                                    : "bg-primary text-on-primary"
                                }`}
                              >
                                {i === 1 ? "Access View" : "Fixture"}
                              </span>
                            </div>
                            <span className="font-body-sm text-[11px] text-surface-container-highest mt-0.5 truncate">
                              {photo.caption}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* v2 Card 2: What changed (Scope diff) */}
              <section
                id="scope-diff"
                className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-24"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface">
                      What changed (Scope v1.0 → v{props.scopeVersion}.0)
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Voice note synthesis transformed unverified customer report into technical
                      parameters.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-data-mono text-label-sm self-start sm:self-auto">
                    {props.diffRows.length} Fields Updated
                  </span>
                </div>
                {/* Before / After Parameter Table */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[540px] flex flex-col gap-2">
                    {/* Row Header */}
                    <div className="grid grid-cols-12 px-3 py-2 bg-surface-container-low rounded-lg font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      <div className="col-span-3">Parameter</div>
                      <div className="col-span-3">Scope v1.0 (Customer)</div>
                      <div className="col-span-6">Scope v{props.scopeVersion}.0 (Site Observation)</div>
                    </div>
                    {props.diffRows.map((row) => (
                      <div
                        key={row.param}
                        className="grid grid-cols-12 px-3 py-3 rounded-lg bg-surface hover:bg-surface-container-low transition-colors items-center"
                      >
                        <div className="col-span-3 font-label-md text-label-md text-on-surface">
                          {row.param}
                        </div>
                        <div className="col-span-3 font-body-sm text-body-sm text-outline">
                          {row.before}
                        </div>
                        <div className="col-span-6 flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-label-md text-label-md ${
                              row.afterTone === "amber"
                                ? "text-amber-900 font-semibold"
                                : row.afterTone === "error"
                                  ? "text-error font-semibold"
                                  : "text-on-surface"
                            }`}
                          >
                            {row.after}
                          </span>
                          {row.pill && (
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-medium ${
                                row.pillTone === "error"
                                  ? "bg-error-container text-on-error-container"
                                  : row.pillTone === "amber"
                                    ? "bg-amber-100 text-amber-800"
                                    : row.pillTone === "primary"
                                      ? "bg-primary-fixed text-on-primary-fixed"
                                      : "bg-surface-container text-primary"
                              }`}
                            >
                              {row.pill}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* v2 Card 3: Scope History Timeline Card */}
              <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-tertiary">
                      history_toggle_off
                    </span>
                    <h2 className="font-headline-md text-headline-md text-on-surface">
                      Scope history
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {props.versions.length + 1} Ledger Entries
                  </span>
                </div>
                {/* Timeline Steps */}
                <div className="flex flex-col gap-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-highest">
                  {/* Event 1 (Current Active) */}
                  <div className="flex items-start gap-space-md relative">
                    <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 z-10 shadow-sm ring-4 ring-surface-container-lowest">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <div className="flex-1 bg-surface-container-low p-space-md rounded-xl flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                            Version {props.scopeVersion}.0 (Active · Current)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-data-mono text-[10px]">
                            Site Note Added
                          </span>
                        </div>
                        <span className="font-data-mono text-label-sm text-on-surface-variant">
                          {props.updatedLine.replace("Updated at ", "")}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface">
                        {props.voiceEvidence?.transcript ?? "Site observation applied to the scope."}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-label-sm">
                        <span
                          className={`font-data-mono px-2 py-0.5 rounded ${
                            props.readinessTone === "error"
                              ? "text-error bg-error-container/40"
                              : props.readinessTone === "primary"
                                ? "text-[#15803D] bg-[#DCFCE7]"
                                : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {props.readiness}% Quote ready
                        </span>
                        <span className="text-on-surface-variant">•</span>
                        <span className="text-primary font-medium">
                          Status: {props.statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Event 2 (v1.1 Review) */}
                  <div className="flex items-start gap-space-md relative">
                    <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0 z-10 ring-4 ring-surface-container-lowest">
                      <span className="material-symbols-outlined text-[16px]">rate_review</span>
                    </div>
                    <div className="flex-1 p-space-sm rounded-lg flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-lg text-label-lg text-on-surface">
                          Version 1.1 · Tradie Review Stage
                        </span>
                        <span className="font-data-mono text-label-sm text-outline">—</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Enquiry reviewed by dispatcher. Flagged for technician audio observation upon
                        arrival.
                      </p>
                    </div>
                  </div>
                  {/* Event 3 (v1.0 Initial Intake) */}
                  {props.versions.slice(0, -1).map((v) => (
                    <div key={v.version} className="flex items-start gap-space-md relative">
                      <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0 z-10 ring-4 ring-surface-container-lowest">
                        <span className="material-symbols-outlined text-[16px]">inbox</span>
                      </div>
                      <div className="flex-1 p-space-sm rounded-lg flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-label-lg text-label-lg text-on-surface">
                            Version {v.version}.0 · Initial enquiry analysis
                          </span>
                          <span className="font-data-mono text-label-sm text-outline">
                            {v.score}% ready
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{v.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Audit Ledger Footer */}
                <div className="pt-space-sm flex items-center gap-2 text-outline font-data-mono text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>
                    Scope changes signed off by {props.operatorName}. All revisions logged to job
                    ledger.
                  </span>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* v1 Card: Customer Enquiry */}
              <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                      {props.customerInitials}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          {props.customerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                          Enquiry
                        </span>
                      </div>
                      <span className="font-data-mono text-body-sm text-on-surface-variant">
                        {props.phone} • Mobile
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">photo_library</span>
                      {props.photoCount} photo{props.photoCount === 1 ? "" : "s"} attached
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                      {props.urgencyLabel} urgency
                    </span>
                  </div>
                </div>
                {/* Verbatim Quote Box */}
                <div className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                    format_quote
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-body-lg text-body-lg text-on-surface italic leading-relaxed">
                      “{props.enquiryText}”
                    </p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Submitted via {props.intakeLabel}
                    </span>
                  </div>
                </div>
                {/* Image Gallery Row */}
                {props.photos.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                        Site Inspection Photos
                      </span>
                      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-medium bg-primary-container/10 px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                        {props.photos.length} photo{props.photos.length === 1 ? "" : "s"} analyzed for
                        scope clarity
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      {props.photos.map((photo, i) => (
                        <div
                          key={photo.src}
                          className="group relative rounded-xl overflow-hidden bg-surface-container-high aspect-[4/3] shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            src={photo.src}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-space-md flex flex-col justify-end">
                            <span className="font-label-sm text-label-sm text-white font-medium">
                              Customer photo {i + 1}
                            </span>
                            <p className="font-body-sm text-body-sm text-white/90 truncate">
                              {photo.caption}
                            </p>
                          </div>
                          <button
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all opacity-90 group-hover:opacity-100"
                            onClick={() => setLightbox(photo.src)}
                            type="button"
                            aria-label="Zoom photo"
                          >
                            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* v1 Card: What we know */}
              {props.knownFacts.length > 0 && (
                <article
                  id="sec-required"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        Required details
                      </h2>
                    </div>
                    <span className="font-data-mono text-label-sm text-on-surface-variant">
                      {props.knownFacts.length} confirmed items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {props.knownFacts.map((fact, index) => (
                      <div
                        key={`${fact.label}-${index}`}
                        className={`p-3 rounded-lg bg-surface-container-low flex items-start gap-3 ${fact.wide ? "md:col-span-2" : ""}`}
                      >
                        <span className="material-symbols-outlined text-[#15803D] text-[20px] shrink-0">
                          check_circle
                        </span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                            {fact.label}
                          </span>
                          <span className="font-body-md text-body-md text-on-surface font-medium">
                            {fact.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {/* v1 Card: Still needed before fixed estimate */}
              {props.missingFields.length > 0 && (
                <article
                  id="sec-missing"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        Still needed before fixed estimate
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-data-mono text-label-sm font-semibold">
                      {props.missingFields.length} pending
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {props.missingFields.map((field) => (
                      <div
                        key={field.key}
                        className="p-3.5 rounded-xl bg-[#FFFBEB] flex items-start gap-3.5"
                      >
                        <span className="material-symbols-outlined text-[#D97706] text-[20px] shrink-0 mt-0.5">
                          {field.icon}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-label-lg text-label-lg text-on-surface">
                            {field.title}
                          </span>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {field.why}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Helper Alert Banner */}
                  <div className="rounded-lg bg-surface-container-high p-3 flex items-center gap-2.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[18px]">info</span>
                    <span className="font-body-sm text-body-sm">
                      <strong className="font-semibold text-on-surface">Notice for tradies:</strong>{" "}
                      Missing details can alter the required repair method, stock run, and billable
                      on-site labour duration.
                    </span>
                  </div>
                </article>
              )}

            </>
          )}

          <AddEvidencePanel jobId={props.jobId} onRecordVoice={() => setModal("note")} />

          {/* server-rendered panel — the explicit key keeps React happy now that
              it sits in a static children array with the other cards */}
          {props.quotePanel && <Fragment key="quote-panel">{props.quotePanel}</Fragment>}

          {/* Destructive action — kept at the very bottom, away from daily flow */}
          <div className="flex items-center justify-between gap-space-md rounded-xl border border-error/20 bg-error/5 p-space-md">
            <div className="flex flex-col min-w-0">
              <span className="font-label-lg text-label-lg text-on-surface">Delete this enquiry</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Removes the enquiry with its evidence, scope versions and drafts. This cannot be undone.
              </span>
            </div>
            <button
              type="button"
              onClick={deleteEnquiry}
              disabled={busy === "delete"}
              className="shrink-0 h-10 px-4 rounded-lg border border-error/40 text-error font-label-lg text-label-lg flex items-center gap-2 hover:bg-error/10 transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>{busy === "delete" ? "Deleting…" : "Delete"}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={`xl:col-span-4 flex flex-col gap-space-lg min-w-0 ${isV2 ? "lg:col-span-4" : ""}`}>
          {isV2 ? (
            <>
              {/* v2 Card 1: Strong Amber/Red Recommendation Card */}
              <section
                id="sec-triggers"
                className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
              >
                <div className="flex items-start gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">warning</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-amber-800 font-semibold uppercase tracking-wider">
                      Protocol Alert
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {props.inspectionRecommended
                        ? "Inspection required before fixed pricing"
                        : "Scope updated from the site"}
                    </h3>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {props.advisory.body}
                </p>
                {/* Structured "Why This Changed" Breakdown */}
                <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-lg">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Why this changed:
                  </span>
                  {props.advisory.reasons.map((reason, index) => (
                    <div key={`${reason}-${index}`} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
                        {props.inspectionRecommended ? "water_damage" : "check_circle"}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{reason}</span>
                    </div>
                  ))}
                </div>
                {/* Quote Status Pill */}
                <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">lock</span>
                    <span className="font-label-sm text-label-sm text-on-surface font-medium">
                      {props.inspectionRecommended ? "Fixed pricing locked" : "Pricing pathway open"}
                    </span>
                  </div>
                  <span className="font-data-mono text-[11px] text-on-surface-variant">
                    {props.inspectionRecommended ? "Awaiting physical test" : "Tradie review"}
                  </span>
                </div>
              </section>

              {/* v2 Card 2: Next Best Action Card */}
              <section
                id="sec-missing"
                className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Recommended Next Action
                  </h3>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    assistant_navigation
                  </span>
                </div>
                {/* Action Step Checklist */}
                <div className="flex flex-col gap-3">
                  {[
                    {
                      title: "Book inspection",
                      sub: "Schedule on-site pressure & cavity testing with the customer.",
                    },
                    {
                      title: "Confirm access and damage extent",
                      sub: "Inspect sub-floor crawlspace & vanity backing panel.",
                    },
                    {
                      title: "Document findings before estimate",
                      sub: "Provide customer formal diagnostic report and fixed variation.",
                    },
                  ].map((step, i) => (
                    <div key={step.title} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5 ${
                          i === 0
                            ? "bg-primary-container text-on-primary-container"
                            : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">{step.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {step.sub}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    className="w-full h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    onClick={() => setModal("followup")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">mark_chat_read</span>
                    <span>Draft inspection message</span>
                  </button>
                  <button
                    className="w-full h-10 rounded-lg bg-surface-container-low text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    onClick={scheduleInspection}
                    disabled={busy === "inspect"}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-tertiary">
                      calendar_add_on
                    </span>
                    <span>{busy === "inspect" ? "Requesting…" : "Schedule inspection visit"}</span>
                  </button>
                </div>
              </section>

              {/* v2 Card: Assumptions & exclusions */}
              {(props.assumptions.length > 0 || props.exclusions.length > 0) && (
                <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                  <div
                    id="sec-assumptions"
                    className="flex flex-col gap-2.5 scroll-mt-32"
                  >
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Assumptions
                    </h3>
                    {props.assumptions.length === 0 && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        None recorded for this scope.
                      </p>
                    )}
                    {props.assumptions.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">
                          check
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    id="sec-exclusions"
                    className="flex flex-col gap-2.5 pt-3 border-t border-border scroll-mt-32"
                  >
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Exclusions
                    </h3>
                    {props.exclusions.length === 0 && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        None recorded for this scope.
                      </p>
                    )}
                    {props.exclusions.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">
                          close
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {/* v1 Card: Prominent Recommendation Card (Focal Point) */}
              <article
                className={`rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md ${
                  props.advisory.safety
                    ? "bg-[#FEE2E2]"
                    : props.advisory.recommended
                      ? "bg-[#FFFBEB]"
                      : "bg-surface-container-lowest"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      props.advisory.safety ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        props.advisory.safety ? "text-error" : "text-[#D97706]"
                      }`}
                    >
                      warning
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-label-sm text-label-sm uppercase tracking-wider font-bold ${
                        props.advisory.safety ? "text-error" : "text-[#92400E]"
                      }`}
                    >
                      Tradie Advisory
                    </span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                      {props.advisory.actionTitle}
                    </h3>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {props.advisory.body}
                </p>
                {/* Expandable "Why?" Rationale Box */}
                {props.advisory.reasons.length > 0 && (
                  <div className="bg-surface-container-lowest/80 backdrop-blur-sm rounded-xl p-space-md flex flex-col gap-2.5">
                    <button
                      className="flex items-center justify-between w-full"
                      onClick={() => setShowWhy((v) => !v)}
                      type="button"
                    >
                      <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#D97706]">
                          analytics
                        </span>
                        {props.advisory.recommended ? "Why recommend inspection?" : "Why this advisory?"}
                      </span>
                      <span className="material-symbols-outlined text-outline text-[18px]">
                        {showWhy ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {showWhy && (
                      <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant pl-1">
                        {props.advisory.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`} className="flex items-start gap-2">
                            <span className="text-[#D97706] font-bold">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>

              {/* v1 Card: Scope assumptions */}
              {props.assumptions.length > 0 && (
                <article
                  id="sec-assumptions"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Assumptions
                    </h3>
                    <button
                      className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center transition-colors"
                      onClick={() => toast.info("Assumptions are generated by the deterministic rules engine for this job type.")}
                      title="Edit Assumptions"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                  <ul className="flex flex-col gap-2.5 font-body-sm text-body-sm text-on-surface-variant">
                    {props.assumptions.map((assumption, index) => (
                      <li key={`${assumption}-${index}`} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">
                          check
                        </span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm inline-block">
                      Assumptions apply until tradie site inspection
                    </span>
                  </div>
                </article>
              )}

              {/* v1 Card: Inspection triggers */}
              {props.inspectionTriggers.length > 0 && (
                <article
                  id="sec-triggers"
                  className="bg-[#FFFBEB] rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-[#92400E] font-semibold">
                      Inspection triggers
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-data-mono text-label-sm font-semibold">
                      {props.inspectionTriggers.length} active
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {props.inspectionTriggers.map((trigger, index) => (
                      <li key={`${trigger}-${index}`} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[#D97706] text-[18px] shrink-0 mt-0.5">
                          warning_amber
                        </span>
                        <span className="font-body-sm text-body-sm text-[#92400E]">{trigger}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="font-label-sm text-label-sm text-[#92400E]/80">
                    Any active trigger locks fixed pricing until the trigger is cleared on site.
                  </p>
                </article>
              )}

              {/* v1 Card: Exclusions */}
              {props.exclusions.length > 0 && (
                <article
                  id="sec-exclusions"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md scroll-mt-32"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Exclusions
                    </h3>
                    <span className="font-data-mono text-label-sm text-on-surface-variant">
                      {props.exclusions.length} items
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5 font-body-sm text-body-sm text-on-surface-variant">
                    {props.exclusions.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">
                          close
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {/* v1 Card: Recommended next action */}
              {props.nextActions.length > 0 && (
                <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
                      Action Pathway
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Request {props.missingAskCount} details, then review the job
                    </h3>
                  </div>
                  {/* Interactive Checklist */}
                  <div className="flex flex-col gap-2 pt-1">
                    {props.nextActions.map((action) => (
                      <label
                        key={action.key}
                        className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          checked={Boolean(checked[action.key])}
                          className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                          onChange={(e) =>
                            setChecked((prev) => ({ ...prev, [action.key]: e.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{action.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="w-full h-11 rounded-lg bg-primary hover:bg-[#0d655e] text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm transition-all mt-1"
                    onClick={() => setModal("followup")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Draft customer follow-up</span>
                  </button>
                </article>
              )}
            </>
          )}

          {/* Trust / Guardrail Card (shared) */}
          <article className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
              verified_user
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Human review required
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                QuoteReady assists scope readiness. Final trade assessment and warranty
                responsibility stay with the qualified professional, and every price and customer
                message needs your approval before dispatch.
              </p>
              <span className="font-data-mono text-[11px] text-on-surface-variant">
                Reviewed by {props.operatorName}
              </span>
            </div>
          </article>
        </div>
      </div>

      {/* v1: Bottom Full-Width Section: Scope History & Tradie Sign-Off */}
      {!isV2 && props.hasScope && (
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                history_edu
              </span>
              <div className="flex flex-col">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Scope history &amp; review stage
                </h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Track intake revisions and your trade sign-off status
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Awaiting your review &amp; sign-off
              </span>
            </div>
          </div>
          {/* Timeline Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {props.versions.slice(-1).map((v) => (
              <div
                key={v.version}
                className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">
                    Version {v.version}.0
                  </span>
                  <span className="font-data-mono text-label-sm text-on-surface-variant">
                    {v.score}% ready
                  </span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {v.producedLabel}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{v.summary}</p>
              </div>
            ))}
            <div className="p-space-md rounded-xl bg-surface-container-high/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                  Version 1.1
                </span>
                <span className="font-data-mono text-label-sm text-on-surface-variant">Pending</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Your review stage
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Reviewing the photo captures against your standard callout rates.
              </p>
            </div>
            <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-2 opacity-60">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-outline">
                  Version 2.0
                </span>
                <span className="font-data-mono text-label-sm text-outline">Upcoming</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Fixed Price or Booking
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Customer confirmation of isolation valve access and on-site inspection time.
              </p>
            </div>
          </div>
          {/* Tradie Sign-off Action Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-space-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Review completed by: <strong className="text-on-surface">{props.operatorName}</strong>{" "}
              (Owner / Tradie)
            </span>
            <div className="flex flex-wrap items-center gap-space-sm">
              <button
                className="h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors disabled:opacity-60"
                onClick={approveScope}
                disabled={busy === "approve"}
                type="button"
              >
                {busy === "approve" ? "Recording…" : "Approve scope as-is"}
              </button>
              <button
                className="h-10 px-4 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center gap-1.5 transition-colors"
                onClick={() => setModal("followup")}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                <span>Request missing photos</span>
              </button>
              <button
                className="h-10 px-5 rounded-lg bg-primary hover:bg-[#0d655e] text-on-primary font-label-lg text-label-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60"
                onClick={scheduleInspection}
                disabled={busy === "inspect"}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>{busy === "inspect" ? "Requesting…" : "Schedule on-site inspection"}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-[#102A43]/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div className="relative max-w-3xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Enlarged site photo"
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              src={lightbox}
            />
            <button
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
              onClick={() => setLightbox(null)}
              type="button"
              aria-label="Close photo"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "note" && (
        <RecordSiteNoteModal
          jobId={props.jobId}
          jobRef={props.refQr.replace("#", "")}
          onClose={() => setModal(null)}
          onApplied={(id) => {
            setModal(null);
            router.push(`/jobs/${id}?applied=1`);
          }}
        />
      )}
      {modal === "followup" && (
        <FollowUpModal
          jobId={props.jobId}
          drafts={props.drafts}
          status={props.statusKey}
          inspectionRecommended={props.inspectionRecommended}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
