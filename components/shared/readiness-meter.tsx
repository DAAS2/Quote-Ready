import {
  CircleCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessBand } from "@/lib/ai/schemas";

export function bandTone(band: ReadinessBand) {
  switch (band) {
    case "ready_for_estimate":
      return { text: "text-success", bg: "bg-success" } as const;
    case "inspection_recommended":
      return { text: "text-inspect", bg: "bg-inspect" } as const;
    default:
      return { text: "text-warning", bg: "bg-warning" } as const;
  }
}

export function ReadinessMeter({
  score,
  band,
  size = "md",
  showLabel = true,
  className,
}: {
  score: number | null;
  band?: ReadinessBand;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const tone = band ? bandTone(band) : score == null ? null : bandTone(scoreToBand(score));
  const pct = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-secondary w-full",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={typeof score === "number" ? `Quote readiness ${score} percent` : "Not analysed"}
      >
        <div
          data-bar-fill
          className={cn("qr-bar-fill h-full rounded-full transition-[width] duration-500 ease-out", tone?.bg ?? "bg-muted-foreground/40")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-mono tabular-nums font-medium shrink-0",
            size === "sm" ? "text-xs" : "text-sm",
            tone?.text ?? "text-muted-foreground",
          )}
        >
          {typeof score === "number" ? `${score}%` : "—"}
        </span>
      )}
    </div>
  );
}

export function scoreToBand(score: number): ReadinessBand {
  if (score < 40) return "needs_information";
  if (score < 70) return "inspection_recommended";
  return "ready_for_estimate";
}

export function BandExplainer({ band, className }: { band: ReadinessBand; className?: string }) {
  const map = {
    ready_for_estimate: {
      icon: CircleCheck,
      label: "Ready for estimate",
      text: "Details and evidence are sufficient for owner-reviewed estimate preparation.",
    },
    inspection_recommended: {
      icon: Wrench,
      label: "Inspection recommended",
      text: "The job is understood, but uncertainty means a fixed price would be premature.",
    },
    needs_information: {
      icon: TriangleAlert,
      label: "Needs information",
      text: "Critical job facts are missing — request them before anything else.",
    },
  } as const;
  const { icon: Icon, label, text } = map[band];
  const tone = bandTone(band);
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone.text)} aria-hidden />
      <div>
        <p className={cn("text-sm font-medium", tone.text)}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
