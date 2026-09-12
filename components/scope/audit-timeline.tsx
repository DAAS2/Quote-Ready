import { Bot, ShieldAlert, UserRound } from "lucide-react";
import type { AuditRow } from "@/lib/data/types";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const ACTOR_META = {
  user: { icon: UserRound, label: "Operator" },
  ai: { icon: Bot, label: "AI" },
  system: { icon: ShieldAlert, label: "System" },
} as const;

export function AuditTimeline({ events, className }: { events: AuditRow[]; className?: string }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }
  return (
    <ol className={cn("relative space-y-4", className)} aria-label="Job activity timeline">
      <span
        className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
        aria-hidden
      />
      {events.map((event) => {
        const meta = ACTOR_META[event.actor_type] ?? ACTOR_META.system;
        const Icon = meta.icon;
        return (
          <li key={event.id} className="relative flex items-start gap-3.5">
            <span
              className={cn(
                "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-card",
                event.actor_type === "user" && "border-primary/30 text-primary",
                event.actor_type === "ai" && "border-border text-muted-foreground",
                event.actor_type === "system" && "border-safety/40 text-safety",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm leading-snug">{event.summary}</p>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {meta.label} · {relativeTime(event.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
