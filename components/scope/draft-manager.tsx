"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, FileEdit, Loader2, Pencil, RefreshCcw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils/format";
import type { DraftRow } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Purposeful draft management: edit any draft inline, approve it, or
 * regenerate from the current scope state. Nothing is ever sent.
 */
export function DraftManager({ jobId, drafts }: { jobId: string; drafts: DraftRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(draftId: string, action: "save" | "approve" | "regenerate") {
    setBusyId(draftId);
    try {
      let res: Response;
      if (action === "save") {
        res = await fetch(`/api/jobs/${jobId}/message-draft/${draftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
      } else if (action === "approve") {
        res = await fetch(`/api/jobs/${jobId}/message-draft/${draftId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
      } else {
        res = await fetch(`/api/jobs/${jobId}/message-draft`, { method: "POST" });
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      toast.success(
        action === "approve"
          ? "Follow-up approved — recorded in the audit timeline (nothing sent)."
          : action === "regenerate"
            ? "Draft regenerated from the current scope."
            : "Draft saved.",
      );
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (drafts.length === 0) {
    return <p className="text-sm text-muted-foreground">No drafts yet.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {drafts.map((d) => {
        const editing = editingId === d.id;
        const busy = busyId === d.id;
        const approved = d.status === "approved";
        return (
          <li
            key={d.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              approved ? "border-success/25 bg-success/[0.03]" : "bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <FileEdit className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="text-xs font-medium">
                {d.message_type === "inspection_recommended" ? "Inspection message" : "Information request"}
              </span>
              {approved ? (
                <Badge className="ml-auto gap-1 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success border-success/25">
                  <CircleCheck className="size-3" aria-hidden />
                  Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  Draft
                </Badge>
              )}
            </div>

            {editing ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Draft message body"
              />
            ) : (
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {d.body}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {!approved && (
                <>
                  {editing ? (
                    <>
                      <Button size="xs" onClick={() => act(d.id, "save")} disabled={busy || body.trim().length === 0}>
                        {busy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Pencil className="size-3" aria-hidden />}
                        Save
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => setEditingId(null)} disabled={busy}>
                        <X className="size-3" aria-hidden />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setEditingId(d.id);
                        setBody(d.body);
                      }}
                      disabled={busy}
                    >
                      <Pencil className="size-3" aria-hidden />
                      Edit
                    </Button>
                  )}
                  <Button
                    size="xs"
                    onClick={() => act(d.id, "approve")}
                    disabled={busy || (editing && body.trim().length === 0)}
                    title="Approve this draft — nothing is sent automatically"
                  >
                    {busy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Send className="size-3" aria-hidden />}
                    Approve
                  </Button>
                </>
              )}
              <Button size="xs" variant="ghost" onClick={() => act(d.id, "regenerate")} disabled={busy} title="Regenerate from the current scope">
                <RefreshCcw className={cn("size-3", busy && "animate-spin")} aria-hidden />
                Regenerate
              </Button>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                {relativeTime(d.created_at)}
                {d.approved_at && ` · approved ${relativeTime(d.approved_at)}`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}