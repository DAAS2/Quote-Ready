"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  CircleStop,
  ClipboardPaste,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PreviewResponse {
  ok: true;
  transcript: string;
  transcription_source: "elevenlabs" | "manual";
  extracted_via: "gemini" | "demo";
  update: { notes?: string };
  preview: {
    nextVersion: number;
    diff: {
      field_changes: Array<{ label: string; from?: string; to: string; kind: "added" | "changed" }>;
      new_risk_flags: string[];
      resolved_missing: string[];
      action_changed: boolean;
      score_delta: number;
    } | null;
  };
}

export function VoiceNotePanel({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stopTimer(), []);

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) submitAudio(blob);
      };
      recorder.start();
      setRecording(true);
      startTimer();
    } catch {
      setError("Microphone unavailable — paste the transcript instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    stopTimer();
  }

  async function submitAudio(blob: Blob) {
    setPreviewing(true);
    setPreview(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", new File([blob], "site-note.webm", { type: blob.type || "audio/webm" }));
      const res = await fetch(`/api/jobs/${jobId}/voice-note`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Transcription failed.");
        if (data.demo_transcript) setTranscript(data.demo_transcript);
        return;
      }
      setPreview(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function submitTranscript() {
    if (transcript.trim().length < 10) {
      toast.error("The transcript is too short.");
      return;
    }
    setPreviewing(true);
    setPreview(null);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/voice-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function applyUpdate() {
    if (!preview) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/voice-note/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: preview.transcript, update: preview.update }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not apply the update.");
        return;
      }
      toast.success("Site note applied — new scope version created.");
      setPreview(null);
      setTranscript("");
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setApplying(false);
    }
  }

  const blocked = status === "closed";

  return (
    <div className="space-y-4">
      {/* ── record / paste ── */}
      <div className="flex items-center gap-2">
        {recording ? (
          <Button variant="destructive" size="sm" onClick={stopRecording}>
            <CircleStop className="size-4" aria-hidden />
            Stop ({String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")})
          </Button>
        ) : (
          <Button size="sm" onClick={startRecording} disabled={previewing || applying || blocked}>
            <Mic className="size-4" aria-hidden />
            Record site note
          </Button>
        )}
        {previewing && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Processing…
          </span>
        )}
      </div>

      <div>
        <Label htmlFor="voice_transcript" className="text-[13px]">
          Or paste the transcript
          <span className="font-normal text-muted-foreground"> (works without a microphone)</span>
        </Label>
        <Textarea
          id="voice_transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={4}
          placeholder="Dictate or type what you saw on site…"
          className="mt-1.5 font-mono text-xs leading-relaxed"
          disabled={recording || previewing || applying || blocked}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={submitTranscript} disabled={previewing || applying || blocked || transcript.trim().length < 10}>
            <ClipboardPaste className="size-4" aria-hidden />
            Extract update
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTranscript(DEMO_TRANSCRIPT)}
            disabled={recording || previewing || applying}
            title="Fill the transcript with the demo site note"
          >
            <Sparkles className="size-4" aria-hidden />
            Use demo note
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-warning">
          {error}
        </p>
      )}

      {/* ── preview: what changed ── */}
      {preview && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <AudioLines className="size-3.5 text-primary" aria-hidden />
            Extracted update — scope v{preview.preview.nextVersion} preview
          </p>
          <Separator className="my-3" />
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            “{preview.transcript}”
          </p>
          <Separator className="my-3" />
          <div className="space-y-1.5">
            {preview.preview.diff?.field_changes.map((c) => (
              <p key={c.label} className="flex items-start gap-1.5 text-xs">
                <ArrowRight className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">{c.from ? ` ${c.from} → ` : " set to "}</span>
                  <span className="font-medium">{c.to}</span>
                </span>
              </p>
            ))}
            {preview.preview.diff?.new_risk_flags.map((f) => (
              <p key={f} className="text-xs font-medium text-safety">
                ⚠ {f} flagged
              </p>
            ))}
            {preview.preview.diff?.resolved_missing.map((m) => (
              <p key={m} className="text-xs text-muted-foreground">
                Resolved: {m}
              </p>
            ))}
            {preview.update.notes && (
              <Badge variant="outline" className="mt-1 text-[10px] font-normal text-muted-foreground">
                {preview.update.notes}
              </Badge>
            )}
          </div>
          <Button size="sm" className="mt-3.5 w-full" onClick={applyUpdate} disabled={applying}>
            {applying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
            {applying ? "Applying…" : "Apply update to job"}
          </Button>
        </div>
      )}

      {blocked && (
        <p className="text-xs text-muted-foreground">This job is closed — no further updates.</p>
      )}
    </div>
  );
}

const DEMO_TRANSCRIPT =
  "I inspected Jordan's bathroom tap. It is a corroded mixer. The isolation valve is accessible, but the cabinet base is damp. I cannot rule out a concealed leak, so book an inspection before providing a fixed price.";
