import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/rules/status";
import type { JobStatus } from "@/lib/ai/schemas";
import {
  CircleCheck,
  ClipboardList,
  Clock,
  Inbox,
  MessageSquareText,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "warning" | "inspect" | "success" | "safety";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-transparent",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  inspect: "bg-inspect/10 text-inspect border-inspect/25",
  success: "bg-success/10 text-success border-success/25",
  safety: "bg-safety/10 text-safety border-safety/25",
};

export function toneForStatus(status: JobStatus): Tone {
  switch (status) {
    case "ready_for_estimate":
      return "success";
    case "needs_information":
      return "warning";
    case "inspection_recommended":
      return "inspect";
    case "inspection_requested":
      return "info";
    case "follow_up_drafted":
    case "follow_up_approved":
      return "info";
    default:
      return "neutral";
  }
}

const TONE_ICONS: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: Inbox,
  info: MessageSquareText,
  warning: Clock,
  inspect: Wrench,
  success: CircleCheck,
  safety: ShieldAlert,
};

export function StatusBadge({
  status,
  safetyFlag = false,
  className,
}: {
  status: JobStatus;
  safetyFlag?: boolean;
  className?: string;
}) {
  if (safetyFlag) {
    return (
      <Badge className={cn("gap-1.5 font-medium", TONE_CLASSES.safety, className)}>
        <ShieldAlert className="size-3.5" aria-hidden />
        Safety attention
      </Badge>
    );
  }
  const tone = toneForStatus(status);
  const Icon = TONE_ICONS[tone];
  return (
    <Badge className={cn("gap-1.5 font-medium", TONE_CLASSES[tone], className)}>
      <Icon className="size-3.5" aria-hidden />
      {statusLabel(status)}
    </Badge>
  );
}

export function JobTypeBadge({ label, className }: { label: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-muted-foreground", className)}>
      <ClipboardList className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
