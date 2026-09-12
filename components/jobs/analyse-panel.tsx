"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STAGES = [
  "Extracting details…",
  "Checking required information…",
  "Identifying risk signals…",
  "Preparing scope pack…",
];

export function AnalysePanel({ jobId }: { jobId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const autoStarted = useRef(false);

  // deep-link ?analyse=1 from the create flow
  useEffect(() => {
    if (searchParams.get("analyse") === "1" && !autoStarted.current) {
      autoStarted.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1200);
    return () => clearInterval(t);
  }, [running]);

  async function run() {
    setRunning(true);
    setStage(0);
    try {
      const res = await fetch(`/api/jobs/${jobId}/analyse`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Analysis failed — please try again.");
        return;
      }
      if (data.used_fallback) {
        toast.warning("Live AI was unavailable — a precomputed analysis was applied and flagged for review.");
      } else {
        toast.success("Analysis complete — scope pack ready for review.");
      }
      router.refresh();
    } catch {
      toast.error("Network error during analysis — please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10">
        <Bot className="size-5 text-primary" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold">Ready to analyse this enquiry</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        Gemini will extract structured facts from the message and photos, then the deterministic
        readiness rules produce the scope pack. Nothing is sent to the customer.
      </p>
      {running ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {STAGES[stage]}
        </p>
      ) : (
        <Button onClick={run} className="mt-4">
          <Bot className="size-4" aria-hidden />
          Analyse enquiry
        </Button>
      )}
    </div>
  );
}
