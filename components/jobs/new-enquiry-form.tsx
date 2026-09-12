"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JOB_TEMPLATES } from "@/lib/rules/job-templates";
import type { JobType } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;

export function NewEnquiryForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobType, setJobType] = useState<JobType>("leaking_tap");
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (accepted.length + files.length >= MAX_IMAGES) break;
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" is not an image.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" is over 6MB.`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      files.forEach((f) => form.append("images", f));
      const res = await fetch("/api/jobs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/jobs/${data.id}?analyse=1`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="space-y-5">
        <fieldset className="space-y-4" disabled={submitting}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="customer_name" required>
              <Input id="customer_name" name="customer_name" placeholder="e.g. Jordan Lee" required autoComplete="off" />
            </Field>
            <Field label="Suburb" htmlFor="suburb">
              <Input id="suburb" name="suburb" placeholder="e.g. Brunswick, VIC" autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="phone" optional>
              <Input id="phone" name="phone" type="tel" placeholder="Optional" autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="email" optional>
              <Input id="email" name="email" type="email" placeholder="Optional" autoComplete="off" />
            </Field>
          </div>

          <Field label="Job type" htmlFor="job_type" required>
            <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)} name="job_type">
              <SelectTrigger id="job_type" className="w-full">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(JOB_TEMPLATES).map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">{JOB_TEMPLATES[jobType].blurb}</p>
          </Field>

          <Field label="What did the customer say?" htmlFor="enquiry_text" required>
            <Textarea
              id="enquiry_text"
              name="enquiry_text"
              rows={6}
              required
              minLength={5}
              placeholder="Paste the customer's message or describe the phone call as close to their words as possible…"
              className="resize-y"
            />
          </Field>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              "Create enquiry"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            You&apos;ll review the analysis before anything is approved.
          </p>
        </div>
      </div>

      {/* ── image upload panel ── */}
      <div className="space-y-3">
        <Label>
          Photos{" "}
          <span className="font-normal text-muted-foreground">(up to {MAX_IMAGES}, under 6MB each)</span>
        </Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          aria-label="Add customer photos"
        />
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt={`Selected photo ${i + 1}: ${f.name}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          ))}
          {files.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60",
              )}
              aria-label="Add a photo"
            >
              <Camera className="size-5" aria-hidden />
              <span className="text-[11px]">Add photo</span>
            </button>
          )}
        </div>
        <p className="rounded-md bg-secondary/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Customer-provided information; verify before quoting. Photos are analysed as visual
          evidence only — low-quality photos are marked as low certainty.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-[13px]">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {children}
    </div>
  );
}
