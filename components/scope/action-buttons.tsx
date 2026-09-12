"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils/format";

type ActionType = "request_information" | "inspection" | "estimate_review" | "safety_escalation";

export function ActionButtons({
  jobId,
  actionType,
  status,
  safetyFlag,
}: {
  jobId: string;
  actionType: ActionType;
  status: string;
  safetyFlag: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<"request_information" | "inspection_recommended">("request_information");
  const [requests, setRequests] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  const canAct =
    status !== "closed" &&
    status !== "follow_up_approved" &&
    status !== "inspection_requested";

  async function createDraft() {
    setCreating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/message-draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create the draft.");
        return;
      }
      setDraftBody(data.draft.body);
      setDraftId(data.draft_id);
      setDraftType(data.draft.message_type);
      setRequests(data.draft.requests_fields ?? []);
      setOpen(true);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function approveDraft() {
    if (!draftId) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/message-draft/${draftId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draftBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not approve.");
        return;
      }
      setOpen(false);
      toast.success("Follow-up approved — recorded in the audit timeline (nothing was sent).");
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setApproving(false);
    }
  }

  async function requestInspection() {
    setInspecting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/inspect`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not request the inspection.");
        return;
      }
      toast.success("Inspection requested — status updated.");
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setInspecting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {canAct ? (
          <>
            <Button onClick={createDraft} disabled={creating} size="sm">
              {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageSquareText className="size-4" aria-hidden />}
              {creating ? "Preparing draft…" : "Draft customer follow-up"}
            </Button>
            {(actionType === "inspection" || actionType === "safety_escalation") &&
              status !== "inspection_requested" && (
                <Button
                  onClick={requestInspection}
                  disabled={inspecting}
                  size="sm"
                  variant={actionType === "safety_escalation" ? "destructive" : "outline"}
                >
                  {inspecting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CalendarCheck className="size-4" aria-hidden />}
                  {inspecting ? "Requesting…" : "Request on-site inspection"}
                </Button>
              )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Drafts require your approval. QuoteReady never sends messages or books work on its
              own.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "follow_up_approved" && "Follow-up approved. Use the timeline below to track what happens next."}
            {status === "inspection_requested" && "Inspection requested. The next step is scheduling — outside QuoteReady's scope."}
            {status === "closed" && "This job is closed."}
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => !approving && setOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review customer follow-up</DialogTitle>
            <DialogDescription>
              {draftType === "inspection_recommended"
                ? "This draft recommends an on-site inspection. Edit anything before approving."
                : "This draft asks the customer the missing questions. Edit anything before approving."}
            </DialogDescription>
          </DialogHeader>

          {requests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {requests.map((k) => (
                <Badge key={k} variant="outline" className="text-[11px] font-normal text-muted-foreground">
                  asks: {titleCase(k)}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="draft_body" className="text-[13px]">
              Message body
            </Label>
            <Textarea
              id="draft_body"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={12}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={approving}>
              Save as draft
            </Button>
            <Button onClick={approveDraft} disabled={approving || draftBody.trim().length === 0} size="sm">
              {approving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {approving ? "Approving…" : "Approve follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
