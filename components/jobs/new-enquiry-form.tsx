"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Camera,
  FileText,
  Loader2,
  MessageSquareText,
  Phone,
  UserRound,
  X,
} from "lucide-react";
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
import { INTAKE_CHANNEL_LABELS, type IntakeChannel, type JobType } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;

const CHANNELS: Array<{
  id: IntakeChannel;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  placeholder: string;
}> = [
  {
    id: "text",
    icon: MessageSquareText,
    hint: "Paste the customer's message word-for-word.",
    placeholder: "“My bathroom tap is leaking. Not urgent, but can someone come next week? I attached two photos.”",
  },
  {
    id: "call",
    icon: Phone,
    hint: "Type what was said on the call, as close to the customer's words as you can.",
    placeholder: "Customer called: tap has been dripping for a few days, bench underneath feels damp…",
  },
  {
    id: "web_form",
    icon: FileText,
    hint: "Paste the web form submission exactly as it arrived.",
    placeholder: "Name: … · Issue: leaking tap in bathroom · Preferred time: next week…",
  },
  {
    id: "email",
    icon: MessageSquareText,
    hint: "Paste the email body. Attachments become photos.",
    placeholder: "Hi, we noticed water on the floor near the vanity this morning…",
  },
  {
    id: "in_person",
    icon: UserRound,
    hint: "A customer walked in — note what they told you.",
    placeholder: "Walk-in at the office: described a dripping bathroom tap…",
  },
];

export function NewEnquiryForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobType, setJobType] = useState<JobType>("leaking_tap");
  const [channel, setChannel] = useState<IntakeChannel>("text");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const active = CHANNELS.find((c) => c.id === channel)!;

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
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_300px]" noValidate>
      <div className="space-y-6">
        {/* ── intake channel ── */}
        <fieldset disabled={submitting}>
          <legend className="mb-2 text-[13px] font-medium">
            How did the enquiry come in?
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                aria-pressed={channel === c.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60",
                  channel === c.id
                    ? "border-primary/50 bg-primary/[0.06] text-primary shadow-[0_4px_16px_-6px_rgb(37_64_233/0.35)]"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <c.icon className="size-4.5" aria-hidden />
                {INTAKE_CHANNEL_LABELS[c.id]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{active.hint}</p>
        </fieldset>

        <fieldset className="space-y-5" disabled={submitting}>
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
              placeholder={active.placeholder}
              className="resize-y leading-relaxed"
            />
          </Field>
        </fieldset>

        {/* ── photos ── */}
        <div>
          <Label className="mb-2 block text-[13px]">
            Photos{" "}
            <span className="font-normal text-muted-foreground">
              (up to {MAX_IMAGES}, under 6MB each — drag &amp; drop works)
            </span>
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
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-lg border-2 border-dashed p-4 transition-colors",
              dragOver ? "border-primary/60 bg-primary/[0.05]" : "border-border bg-card",
            )}
          >
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
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
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              <>
                Create enquiry
                <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            You&apos;ll review the analysis before anything is approved.
          </p>
        </div>
      </div>

      {/* ── sticky sidebar: what happens next ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            What happens next
          </p>
          {[
            ["1", "Gemini extracts the job facts from text, photos and any notes"],
            ["2", "The readiness engine scores it 0–100 against trade templates"],
            ["3", "You review the scope pack and approve the customer follow-up"],
          ].map(([n, text]) => (
            <div key={n} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                {n}
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
          <p className="rounded-lg border border-dashed bg-secondary/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Customer-provided information; verify before quoting. Photos are visual evidence only —
            low-quality photos are marked low certainty.
          </p>
        </div>
      </aside>
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