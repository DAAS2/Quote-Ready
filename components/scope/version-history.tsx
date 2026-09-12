import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CircleCheck,
  Mic,
  Minus,
  UserRound,
} from "lucide-react";
import type { ScopePack } from "@/lib/ai/schemas";
import { diffPacks } from "@/lib/rules/diff";
import { titleCase } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const SOURCE_META = {
  ai_analysis: { icon: Bot, label: "AI analysis" },
  voice_update: { icon: Mic, label: "Voice update" },
  manual_edit: { icon: UserRound, label: "Manual edit" },
  fallback: { icon: Bot, label: "Fallback analysis" },
  seed: { icon: Bot, label: "Seed analysis" },
} as const;

export function VersionHistory({ versions }: { versions: ScopePack[] }) {
  if (versions.length === 0) return null;
  const ordered = [...versions].sort((a, b) => a.version - b.version);

  return (
    <ol className="space-y-3" aria-label="Scope version history">
      {[...ordered].reverse().map((pack, idx) => {
        const prev = ordered[ordered.length - 1 - idx - 1] ?? null;
        const meta = SOURCE_META[pack.produced_by] ?? SOURCE_META.ai_analysis;
        const Icon = meta.icon;
        const delta = prev ? pack.readiness_score - prev.readiness_score : 0;
        const diff = prev ? diffPacks(prev, pack) : null;
        const isLatest = idx === 0;

        return (
          <li
            key={pack.version}
            className={cn(
              "rounded-lg border p-3.5",
              isLatest ? "border-primary/30 bg-primary/[0.03]" : "bg-card",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold tabular-nums">v{pack.version}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className="size-3" aria-hidden />
                {meta.label}
              </span>
              {isLatest && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  current
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs tabular-nums">
                {pack.readiness_score}%
                {delta !== 0 &&
                  (delta > 0 ? (
                    <span className="inline-flex items-center text-success">
                      <ArrowUpRight className="size-3" aria-hidden />
                      {delta}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-inspect">
                      <ArrowDownRight className="size-3" aria-hidden />
                      {Math.abs(delta)}
                    </span>
                  ))}
                {delta === 0 && <Minus className="size-3 text-muted-foreground/50" aria-hidden />}
              </span>
            </div>

            {diff && (diff.field_changes.length > 0 || diff.new_risk_flags.length > 0 || diff.resolved_missing.length > 0) && (
              <div className="mt-2.5 space-y-1.5">
                {diff.field_changes.map((c) => (
                  <p key={c.key} className="flex items-start gap-1.5 text-xs leading-snug">
                    <CircleCheck className="mt-0.5 size-3 shrink-0 text-success" aria-hidden />
                    <span>
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground">
                        {c.from ? ` ${c.from} → ` : " set to "}
                      </span>
                      <span className="font-medium">{c.to}</span>
                    </span>
                  </p>
                ))}
                {diff.new_risk_flags.map((f) => (
                  <p key={f} className="text-xs leading-snug text-safety">
                    ⚠ {f} flagged
                  </p>
                ))}
                {diff.resolved_missing.length > 0 && (
                  <p className="text-xs leading-snug text-muted-foreground">
                    Resolved: {diff.resolved_missing.map(titleCase).join(", ")}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
