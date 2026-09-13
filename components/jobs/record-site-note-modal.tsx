"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VoiceUpdate } from "@/lib/ai/schemas";

/* ────────────────────────────────────────────────────────────────────────────
 * "Add a site note" modal — transcribed 1:1 from the record-site-note design.
 * Flow: record (timer + real capture) → transcript (live browser speech-to-
 * text, with automatic Gemini audio transcription as the fallback) →
 * extraction preview → user-approved apply (POST voice-note/apply).
 * ──────────────────────────────────────────────────────────────────────────── */

interface ExtractedUpdates {
  fixtureType?: string;
  isolation?: string;
  waterDamage?: string;
  recommendation?: { title: string; sub: string; tone: "amber" | "teal" };
}

/* Web Speech API typings (browser-specific, not in lib.dom everywhere) */
interface SpeechResultAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechResultAlternative;
  length: number;
}
interface SpeechEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const WAVEFORM_BARS = [
  "bg-teal-400 h-3", "bg-teal-500 h-5", "bg-teal-600 h-8", "bg-teal-700 h-10",
  "bg-[#102A43] h-6", "bg-teal-600 h-9", "bg-teal-500 h-11", "bg-[#0F766E] h-7",
  "bg-teal-600 h-12", "bg-[#102A43] h-8", "bg-teal-700 h-11", "bg-teal-500 h-6",
  "bg-teal-600 h-9", "bg-teal-700 h-12", "bg-[#102A43] h-10", "bg-teal-600 h-5",
  "bg-teal-500 h-9", "bg-teal-400 h-4", "bg-slate-300 h-3", "bg-slate-300 h-2",
];

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Convert a MediaRecorder blob into 16 kHz mono PCM WAV with leading/trailing
 * silence trimmed — far more reliable for speech-to-text than the raw webm
 * (which some engines misread, returning empty transcripts).
 */
async function blobToWav(blob: Blob): Promise<Blob | null> {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const srcRate = decoded.sampleRate;
    const rate = Math.min(srcRate, 16000);
    const src = decoded.getChannelData(0);

    // resample (linear)
    const count = Math.floor((src.length * rate) / srcRate);
    const samples = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const pos = (i * srcRate) / rate;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      samples[i] = (src[idx] ?? 0) * (1 - frac) + (src[idx + 1] ?? 0) * frac;
    }

    // trim silence (threshold on peak amplitude)
    const threshold = 0.004;
    let start = 0;
    let end = samples.length;
    while (start < end && Math.abs(samples[start]!) < threshold) start++;
    while (end > start && Math.abs(samples[end - 1]!) < threshold) end--;
    const trimmed = samples.slice(Math.max(0, start - Math.floor(rate * 0.15)), Math.min(samples.length, end + Math.floor(rate * 0.3)));
    if (trimmed.length < rate * 0.3) {
      void ctx.close();
      return null; // effectively silent
    }

    // encode WAV (16-bit PCM)
    const buffer = new ArrayBuffer(44 + trimmed.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + trimmed.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, trimmed.length * 2, true);
    for (let i = 0; i < trimmed.length; i++) {
      const clamped = Math.max(-1, Math.min(1, trimmed[i]!));
      view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }
    void ctx.close();
    return new Blob([buffer], { type: "audio/wav" });
  } catch {
    return null;
  }
}

export function RecordSiteNoteModal({
  jobId,
  jobRef,
  onClose,
  onApplied,
}: {
  jobId: string;
  jobRef: string;
  onClose: () => void;
  onApplied: (jobId: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "recording" | "captured">("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [updates, setUpdates] = useState<ExtractedUpdates | null>(null);
  const [fieldsReady, setFieldsReady] = useState(0);
  const [update, setUpdate] = useState<VoiceUpdate | null>(null);
  const [applying, setApplying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechTextRef = useRef("");

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const runPreview = useCallback(async (text: string) => {
    if (text.trim().length < 10) {
      setUpdates(null);
      setUpdate(null);
      setFieldsReady(0);
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/voice-note/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      const u = data.update as VoiceUpdate;
      const f = u.facts;
      const concealed = u.risk_flags.includes("possible_concealed_leak") || u.risk_flags.includes("water_damage");
      const next: ExtractedUpdates = {
        fixtureType: f.fixture_type
          ? f.fixture_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : undefined,
        isolation: f.water_isolation_access
          ? f.water_isolation_access === "accessible"
            ? "Accessible"
            : "Constrained"
          : undefined,
        waterDamage:
          f.water_damage === "possible"
            ? "Damp cabinet base"
            : f.water_damage === "confirmed"
              ? "Water damage confirmed"
              : undefined,
        recommendation: concealed
          ? { title: "Inspection required", sub: "Fixed quote held until on-site test", tone: "amber" }
          : { title: "Review scope pack", sub: "Details captured for tradie review", tone: "teal" },
      };
      const ready = [next.fixtureType, next.isolation, next.waterDamage, next.recommendation]
        .filter(Boolean).length;
      setUpdates(next);
      setUpdate(u);
      setFieldsReady(ready);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPreviewing(false);
    }
  }, [jobId]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (transcript.trim().length >= 10) void runPreview(transcript);
    }, 700);
    return () => clearTimeout(handle);
  }, [transcript, runPreview]);

  useEffect(
    () => () => {
      stopTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        recognitionRef.current?.abort();
      } catch {
        /* already ended */
      }
    },
    [],
  );

  /** Automatic transcription of the recorded blob (server-side Scribe/Gemini). */
  async function transcribeOnServer(rawBlob: Blob) {
    setTranscribing(true);
    try {
      // prefer a cleaned 16 kHz WAV — raw MediaRecorder webm sometimes yields
      // empty transcripts from the speech engines
      const wav = await blobToWav(rawBlob);
      const payload = wav ?? rawBlob;
      const ext = wav ? "wav" : "webm";
      const form = new FormData();
      form.append("audio", payload, `site-note.${ext}`);
      const res = await fetch(`/api/jobs/${jobId}/voice-note/transcribe`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Automatic transcription failed.");
      setTranscript((data.transcript as string).trim());
    } catch (error) {
      toast.error((error as Error).message);
      textareaRef.current?.focus();
    } finally {
      setTranscribing(false);
    }
  }

  function startRecording() {
    setPhase("recording");
    setSeconds(0);
    speechTextRef.current = "";
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

    // live speech-to-text (Chromium browsers) — transcript fills as you speak
    const SRCtor = getSpeechRecognition();
    if (SRCtor) {
      try {
        const recognition = new SRCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-AU";
        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]!;
            if (result.isFinal) {
              speechTextRef.current = `${speechTextRef.current} ${result[0].transcript.trim()}`.trim();
            } else {
              interim += result[0].transcript;
            }
          }
          setTranscript(
            `${speechTextRef.current}${interim ? ` ${interim}` : ""}`.trimStart(),
          );
        };
        recognition.onerror = () => {
          /* permission denied or no-input — the recorded blob is the fallback */
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    // real audio capture (used for playback preview + server transcription)
    try {
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          chunksRef.current = [];
          const rec = new MediaRecorder(stream);
          rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          rec.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(URL.createObjectURL(blob));
            // nothing captured by the browser speech engine? transcribe the audio
            if (speechTextRef.current.trim().length < 10) {
              void transcribeOnServer(blob);
            }
          };
          rec.start();
          recorderRef.current = rec;
        })
        .catch(() => {
          /* microphone unavailable — timer-only capture */
        });
    } catch {
      /* timer-only capture */
    }
  }

  function stopRecording() {
    stopTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already ended */
    }
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhase("captured");
  }

  function reRecord() {
    stopTimer();
    setPhase("idle");
    setSeconds(0);
    setTranscript("");
    speechTextRef.current = "";
    setUpdates(null);
    setUpdate(null);
    setFieldsReady(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }

  function playPreview() {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => (audioRef.current = null);
    void audio.play();
  }

  async function apply() {
    if (!update || transcript.trim().length < 10) {
      toast.error("Record or write a transcript first — QuoteReady needs the spoken note.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/voice-note/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim(), update }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply the update.");
      toast.success(
        `Site note applied — scope v${data.scope?.version ?? ""} (${data.scope?.readiness_score ?? "—"}%).`,
      );
      onApplied(jobId);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setApplying(false);
    }
  }

  const captured = phase !== "idle";
  const hasTranscript = transcript.trim().length >= 10;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#0B1E2F]/60 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-note-title"
    >
      <div
        className="relative w-full max-w-[740px] max-h-[92vh] flex flex-col bg-[#F8F9F7] rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
      >
        {/* Modal Header */}
        <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-start justify-between flex-shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#102A43] tracking-tight" id="site-note-title">
                Add a site note
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Record what you observed. QuoteReady will turn it into reviewable job evidence.
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </header>

        {/* Scrollable Content Body */}
        <div className="px-6 py-5 overflow-y-auto custom-scroll space-y-6 flex-1">
          {/* Voice Recording Section */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {captured ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        transcribing
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${transcribing ? "bg-amber-500" : "bg-red-600 animate-ping"}`}
                      ></span>
                      <span>
                        {transcribing
                          ? "Transcribing audio…"
                          : phase === "recording"
                            ? "● Recording"
                            : "Audio captured"}
                      </span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {fmt(seconds)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    Ready when you are — press the microphone to record.
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 text-center sm:text-right">
                Speak clearly: fixture condition, pipe isolation, leaks &amp; access.
              </div>
            </div>
            <div className="py-5 flex flex-col items-center justify-center">
              <div
                aria-label="Audio waveform visualization"
                className="w-full max-w-md h-12 flex items-center justify-center gap-1 sm:gap-1.5 px-4 mb-4"
              >
                {WAVEFORM_BARS.map((bar, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full ${bar} ${phase === "recording" ? "animate-pulse" : ""}`}
                  ></span>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                  onClick={reRecord}
                  disabled={phase === "idle"}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Re-record</span>
                </button>
                <div className="relative flex items-center justify-center">
                  {phase === "recording" && (
                    <div className="absolute w-16 h-16 rounded-full bg-teal-100/70 recording-pulse"></div>
                  )}
                  <button
                    className="relative z-10 w-12 h-12 rounded-full bg-[#0F766E] hover:bg-teal-800 text-white shadow-md flex items-center justify-center transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                    onClick={phase === "recording" ? stopRecording : startRecording}
                    title={phase === "recording" ? "Stop recording" : "Start recording"}
                    type="button"
                  >
                    {phase === "recording" ? (
                      <div className="w-4 h-4 rounded-xs bg-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                  onClick={playPreview}
                  disabled={!audioUrl}
                  type="button"
                >
                  <svg className="w-4 h-4 text-teal-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Play preview</span>
                </button>
              </div>
            </div>
            <div className="mt-2 text-center text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="font-medium text-slate-700">Tradie tip:</span> Mention fixture type,
              isolation access, dampness, and whether physical testing is needed. Speech appears in
              the transcript automatically — live while recording, or transcribed the moment you
              press stop.
            </div>
          </section>

          {/* Transcript Review Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="transcript-input">
                  Transcript
                </label>
                {hasTranscript && !transcribing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                    Transcribed
                  </span>
                )}
                {transcribing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Transcribing…
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Review before applying to job</span>
            </div>
            <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-teal-600">
              <textarea
                ref={textareaRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full text-xs sm:text-sm text-slate-800 leading-relaxed resize-none border-none p-0 focus:ring-0 focus:outline-none placeholder-slate-400"
                id="transcript-input"
                rows={3}
                placeholder="Speak your note above — the transcript appears here automatically. You can also type or paste it directly."
              />
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-teal-700 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  Click text to make direct edits
                </span>
                <span>{transcript.length} characters</span>
              </div>
            </div>
          </section>

          {/* Extracted Updates Preview */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                  Updates QuoteReady found
                </h3>
                <p className="text-[11px] text-slate-500">
                  Proposed modifications for Job #{jobRef} based on your note
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {previewing || transcribing ? "Reading note…" : `${fieldsReady} fields ready`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Fixture Type */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Fixture type
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#102A43] block truncate">
                    {updates?.fixtureType ?? "Not identified"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {updates?.fixtureType ? "Cartridge code scope updated" : "Describe the fixture in your note"}
                  </span>
                </div>
              </div>
              {/* Card 2: Water Isolation */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Water isolation
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-teal-900 block truncate">
                    {updates?.isolation ?? "Not reported"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {updates?.isolation ? "Under-basin mini-stops checked" : "Report whether valves turn freely"}
                  </span>
                </div>
              </div>
              {/* Card 3: Possible Water Damage */}
              <div
                className={`rounded-xl p-3 flex items-start gap-3 shadow-xs border ${
                  updates?.waterDamage
                    ? "bg-amber-50/50 border-amber-200/90"
                    : "bg-white border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    updates?.waterDamage
                      ? "bg-amber-100 text-amber-700 border-amber-300"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider block ${
                      updates?.waterDamage ? "text-amber-800" : "text-slate-400"
                    }`}
                  >
                    Possible water damage
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold block truncate ${
                      updates?.waterDamage ? "text-amber-950" : "text-slate-600"
                    }`}
                  >
                    {updates?.waterDamage ?? "Not observed"}
                  </span>
                  <span className={`text-[10px] ${updates?.waterDamage ? "text-amber-700" : "text-slate-400"}`}>
                    {updates?.waterDamage ? "Sub-floor moisture risk flagged" : "Report dampness or swelling"}
                  </span>
                </div>
              </div>
              {/* Card 4: Scope Recommendation */}
              <div
                className={`rounded-xl p-3 flex items-start gap-3 shadow-xs border ${
                  updates?.recommendation?.tone === "amber"
                    ? "bg-amber-50/50 border-amber-200/90"
                    : "bg-white border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    updates?.recommendation?.tone === "amber"
                      ? "bg-amber-100 text-amber-700 border-amber-300"
                      : "bg-teal-50 text-teal-700 border-teal-100"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider block ${
                      updates?.recommendation?.tone === "amber" ? "text-amber-800" : "text-teal-700"
                    }`}
                  >
                    Scope recommendation
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#102A43] block truncate">
                    {updates?.recommendation?.title ?? "Awaiting transcript"}
                  </span>
                  <span className={`text-[10px] ${updates?.recommendation?.tone === "amber" ? "text-amber-700" : "text-slate-500"}`}>
                    {updates?.recommendation?.sub ?? "QuoteReady reads your note before any change"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer Action Bar */}
        <footer className="px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2.5 justify-end">
              <button
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
                onClick={() => textareaRef.current?.focus()}
                type="button"
              >
                Edit transcript
              </button>
              <button
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 disabled:opacity-60"
                onClick={apply}
                disabled={applying || !update}
                type="button"
              >
                <span>{applying ? "Applying…" : "Apply update to job"}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              Applying creates a new scope version and audit event for Alex Miller.
            </span>
            <span className="font-mono text-[10px]">Job {jobRef}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
