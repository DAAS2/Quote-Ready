"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
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

const MAX_IMAGES = 6;

export function EnquiryEditor({
  jobId,
  initialText,
}: {
  jobId: string;
  initialText: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(initialText);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (accepted.length + files.length >= MAX_IMAGES) break;
      if (!f.type.startsWith("image/")) continue;
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
  }

  async function save() {
    setSaving(true);
    try {
      const form = new FormData();
      if (text.trim().length >= 5) form.append("enquiry_text", text.trim());
      if (note.trim().length > 0) form.append("note", note.trim());
      files.forEach((f) => form.append("images", f));
      const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the update.");
        return;
      }
      toast.success("Enquiry updated. Re-running analysis…");
      setOpen(false);
      setNote("");
      setFiles([]);
      await fetch(`/api/jobs/${jobId}/analyse`, { method: "POST" });
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" aria-hidden />
        Update enquiry
      </Button>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update enquiry</DialogTitle>
            <DialogDescription>
              Revise the enquiry text, add photos or a written operator note. The analysis
              re-runs and a new scope version is created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="enq_text" className="text-[13px]">Enquiry text</Label>
              <Textarea
                id="enq_text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="leading-relaxed"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="op_note" className="text-[13px]">
                Operator note{" "}
                <span className="font-normal text-muted-foreground">
                  (e.g. what the customer added on a second call)
                </span>
              </Label>
              <Textarea
                id="op_note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional — added as evidence from the operator…"
                className="leading-relaxed"
              />
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
                aria-label="Add photos"
              />
              <Label className="mb-1.5 block text-[13px]">Add photos</Label>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="group relative size-16 overflow-hidden rounded-md border bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={`New photo ${i + 1}: ${f.name}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 flex size-4.5 items-center justify-center rounded-full bg-background/90 text-foreground"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="size-2.5" aria-hidden />
                    </button>
                  </div>
                ))}
                {files.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    aria-label="Add a photo"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {saving ? "Updating…" : "Save & re-analyse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}