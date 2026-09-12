import { Camera, FileText, MessageSquareText, Mic, UserRound } from "lucide-react";
import type { EvidenceRow } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const SOURCE_META = {
  customer_enquiry: { icon: FileText, label: "Enquiry" },
  photo_observation: { icon: Camera, label: "Photo" },
  voice_note: { icon: Mic, label: "Voice note" },
  manual_note: { icon: UserRound, label: "Operator" },
  customer_reply: { icon: MessageSquareText, label: "Customer reply" },
} as const;

const CERTAINTY_LABEL = {
  high: "High certainty",
  medium: "Medium certainty",
  low: "Low certainty",
} as const;

export function EvidenceList({ items, className }: { items: EvidenceRow[]; className?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence recorded yet.</p>;
  }
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => {
        const meta = SOURCE_META[item.type];
        const Icon = meta.icon;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary">
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{item.claim}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                <span>{item.source_reference}</span>
                {item.certainty && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{CERTAINTY_LABEL[item.certainty]}</span>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
