"use client";

import { useState } from "react";
import { Headphones, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BriefingPlayer({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFallbackText(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/briefing`, { method: "POST" });
      if (res.headers.get("content-type")?.includes("audio/mpeg")) {
        const blob = await res.blob();
        setAudioUrl(URL.createObjectURL(blob));
        return;
      }
      const data = await res.json();
      if (data.text) {
        setFallbackText(data.text);
        toast.info("Voice unavailable — written briefing shown.");
      } else {
        toast.error(data.error ?? "Briefing failed.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : audioUrl ? <Volume2 className="size-4" aria-hidden /> : <Headphones className="size-4" aria-hidden />}
          {loading ? "Generating…" : audioUrl ? "Replay briefing" : "Brief me before calling"}
        </Button>
        <span className="text-[11px] text-muted-foreground">AI-generated audio</span>
      </div>
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" aria-label="Pre-call briefing audio">
          Your browser does not support audio playback.
        </audio>
      )}
      {fallbackText && (
        <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {fallbackText}
        </p>
      )}
    </div>
  );
}
