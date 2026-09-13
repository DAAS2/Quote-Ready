"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────────────────────
 * Add evidence — jobs are never frozen. An operator can append a written
 * note, photos, or record a voice note at any stage (including once a job is
 * ready for estimate), then re-run the analysis into a new scope version.
 * ──────────────────────────────────────────────────────────────────────────── */

const MAX_PHOTOS = 6;

export function AddEvidencePanel({
  jobId,
  onRecordVoice,
  defaultOpen = false,
}: {
  jobId: string;
  onRecordVoice: () => void;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.size <= 6 * 1024 * 1024);
    if (next.length !== list.length) toast.error("Photos must be under 6 MB.");
    setFiles((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  }

  async function save() {
    if (!note.trim() && files.length === 0) {
      toast.error("Add a written note or at least one photo.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      if (note.trim()) form.set("note", note.trim());
      files.forEach((f) => form.append("images", f));
      const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the evidence.");

      // re-run the scope analysis so readiness reflects the new evidence
      await fetch(`/api/jobs/${jobId}/analyse`, { method: "POST" }).catch(() => null);

      toast.success("Evidence added — the scope has been re-analysed.");
      setNote("");
      setFiles([]);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-tour="add-evidence"
      className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-container-low/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">add_notes</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Add more evidence
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Written note, photos or a voice note — anytime, even after the scope is ready.
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-outline shrink-0">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="font-label-md text-label-md text-on-surface-variant"
              htmlFor="evidence-note"
            >
              Written note
            </label>
            <textarea
              id="evidence-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer called back — the drip only happens when the hot tap is running."
              className="w-full p-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all resize-y"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant">Photos</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  add_a_photo
                </span>
                Attach photos ({files.length}/{MAX_PHOTOS})
              </button>
              <button
                type="button"
                onClick={onRecordVoice}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-tertiary">mic</span>
                Record voice note
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">image</span>
                    {f.name}
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                {busy ? "progress_activity" : "save"}
              </span>
              {busy ? "Saving & re-analysing…" : "Save evidence"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
