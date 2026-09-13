"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DraftRow } from "@/lib/data/types";
import { statusLabel } from "@/lib/rules/status";
import { titleCase } from "@/lib/utils/format";

/* ────────────────────────────────────────────────────────────────────────────
 * "Review customer follow-up" modal — transcribed 1:1 from the follow-up
 * design. Drafts are created server-side, are editable, and approval is
 * human-only (never auto-sent).
 * ──────────────────────────────────────────────────────────────────────────── */

const FIELD_PILLS: Record<string, { icon: string; label: string }> = {
  fixture_type: { icon: "photo_camera", label: "Fixture photo" },
  water_isolation_access: { icon: "visibility", label: "Isolation access" },
  water_damage: { icon: "humidity_mid", label: "Water damage confirmation" },
  property_access: { icon: "directions_car", label: "Access & parking" },
  customer_availability: { icon: "event", label: "Availability" },
  location_in_property: { icon: "location_on", label: "Location in property" },
  system_type: { icon: "local_fire_department", label: "System type" },
  system_age: { icon: "history", label: "System age" },
  symptoms: { icon: "troubleshoot", label: "Symptom details" },
};

export function FollowUpModal({
  jobId,
  drafts,
  status,
  inspectionRecommended,
  onClose,
}: {
  jobId: string;
  drafts: DraftRow[];
  status: string;
  inspectionRecommended: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [approved, setApproved] = useState(drafts.some((d) => d.status === "approved"));
  const [body, setBody] = useState("");
  const [requests, setRequests] = useState<string[]>([]);
  const [busy, setBusy] = useState<"load" | "save" | "approve" | null>("load");

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const existing = drafts[0];
      if (existing && existing.status === "draft") {
        setDraftId(existing.id);
        setBody(existing.body);
        setRequests(existing.requests_fields);
        setBusy(null);
        return;
      }
      try {
        const res = await fetch(`/api/jobs/${jobId}/message-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not prepare the draft.");
        if (!cancelled) {
          setDraftId(data.draft_id);
          setBody(data.draft.body);
          setRequests(data.draft.requests_fields);
          setApproved(false);
        }
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message);
      } finally {
        if (!cancelled) setBusy(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function saveDraft() {
    if (!draftId) return;
    setBusy("save");
    try {
      const res = await fetch(`/api/jobs/${jobId}/message-draft/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the draft.");
      toast.success("Draft saved — nothing was sent.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!draftId) return;
    setBusy("approve");
    try {
      const res = await fetch(`/api/jobs/${jobId}/message-draft/${draftId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not approve the draft.");
      setApproved(true);
      toast.success("Follow-up approved — recorded to the audit timeline.");
      router.refresh();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const statusText = statusLabel(status as never);

  return (
    <div className="fixed inset-0 z-50 bg-[#102A43]/50 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-[720px] w-full bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-auto">
        <div className="p-6 pb-5 border-b border-[#E5E7EB] flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-xl text-[#102A43] tracking-tight">
                Review customer follow-up
              </h3>
              <p className="text-sm text-[#4B5563] mt-0.5">
                This draft requests the details needed to confirm the next step. Nothing will be sent automatically.
              </p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {inspectionRecommended && (
          <div className="mx-6 mt-5 p-3.5 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#D97706] text-[20px] shrink-0 mt-0.5">
              warning
            </span>
            <p className="text-xs md:text-sm font-medium text-amber-900 leading-snug">
              Inspection recommended — current evidence suggests the issue may require on-site
              assessment before a fixed estimate.
            </p>
          </div>
        )}

        <div className="px-6 pt-5 pb-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#102A43]">Customer message</label>
            <span className="text-xs font-medium text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Editable draft
            </span>
          </div>
          <div
            ref={bodyRef}
            className="rounded-lg border border-[#D1D5DB] focus-within:ring-2 focus-within:ring-[#0F766E] bg-[#FDFEFC] shadow-inner p-3.5"
          >
            {busy === "load" ? (
              <p className="w-full text-[#9CA3AF] text-sm leading-relaxed min-h-[130px]">
                Preparing draft…
              </p>
            ) : (
              <textarea
                className="w-full text-[#1F2937] text-sm leading-relaxed bg-transparent border-0 focus:outline-none resize-none font-normal min-h-[130px]"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                readOnly={approved}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs text-[#6B7280] pt-0.5">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">
                auto_awesome
              </span>
              Generated from missing scope details
            </span>
            <span>{body.length} characters</span>
          </div>
          {requests.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {requests.map((key) => {
                const pill = FIELD_PILLS[key] ?? {
                  icon: "help_outline",
                  label: titleCase(key),
                };
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium"
                  >
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      {pill.icon}
                    </span>
                    {pill.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-[#F8F9F7] border-y border-[#E5E7EB]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563] block mb-3">
            What this action records
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2 text-sm text-[#1F2937]">
              <span className="material-symbols-outlined text-[#0F766E] text-[18px]">
                check_circle
              </span>
              <span>
                {approved
                  ? "Customer follow-up approved by Alex"
                  : "Customer follow-up drafted for Alex"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1F2937]">
              <span className="material-symbols-outlined text-[#0F766E] text-[18px]">
                check_circle
              </span>
              <span>Job remains in “{statusText}”</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1F2937]">
              <span className="material-symbols-outlined text-[#0F766E] text-[18px]">
                check_circle
              </span>
              <span>The action is added to the audit timeline</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1F2937]">
              <span className="material-symbols-outlined text-[#0F766E] text-[18px]">
                check_circle
              </span>
              <span>No message is sent by QuoteReady</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-1.5 text-xs text-[#6B7280] max-w-[340px] leading-normal">
            <span className="material-symbols-outlined text-[16px] text-outline shrink-0 mt-0.5">
              info
            </span>
            <span>
              {approved
                ? "This follow-up is approved and logged. Send it through your usual customer channel."
                : "Approve creates a record only. Send through your usual customer communication channel."}
            </span>
          </div>
          <div className="flex items-center gap-2.5 justify-end">
            {approved ? (
              <button
                className="px-5 py-2.5 rounded-lg bg-[#0F766E]/10 text-[#0F766E] text-sm font-semibold flex items-center gap-2"
                type="button"
                disabled
              >
                <span>Approved</span>
                <span className="material-symbols-outlined text-[18px]">check</span>
              </button>
            ) : (
              <>
                <button
                  className="px-4 py-2.5 rounded-lg border border-[#D1D5DB] text-sm font-semibold text-[#374151] hover:bg-gray-50 transition-colors disabled:opacity-60"
                  onClick={saveDraft}
                  disabled={busy !== null || !draftId}
                  type="button"
                >
                  {busy === "save" ? "Saving…" : "Save draft"}
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-60"
                  onClick={approve}
                  disabled={busy !== null || !draftId}
                  type="button"
                >
                  <span>{busy === "approve" ? "Approving…" : "Approve follow-up"}</span>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
