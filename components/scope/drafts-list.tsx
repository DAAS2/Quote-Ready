import { CircleCheck, FileEdit } from "lucide-react";
import type { DraftRow } from "@/lib/data/types";
import { relativeTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

export function DraftsList({ drafts }: { drafts: DraftRow[] }) {
  if (drafts.length === 0) {
    return <p className="text-sm text-muted-foreground">No drafts yet.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {drafts.map((d) => (
        <li key={d.id} className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2">
            <FileEdit className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-xs font-medium">
              {d.message_type === "inspection_recommended" ? "Inspection message" : "Information request"}
            </span>
            {d.status === "approved" ? (
              <Badge className="ml-auto gap-1 bg-success/10 text-success border-success/25">
                <CircleCheck className="size-3" aria-hidden />
                Approved draft
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-[11px] text-muted-foreground">
                Draft
              </Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {d.body}
          </p>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">
            {relativeTime(d.created_at)}
            {d.approved_at && ` · approved ${relativeTime(d.approved_at)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
