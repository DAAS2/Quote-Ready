"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { TemplateRow } from "@/lib/data/types";
import type { IntakeExtraction } from "@/lib/ai/schemas";
import { AvailabilityPicker, formatAvailability } from "@/components/jobs/availability-picker";
import { setTourJobId } from "@/lib/onboarding/tour";

/* ────────────────────────────────────────────────────────────────────────────
 * New enquiry — transcribed 1:1 from the new-enquiry design.
 * Submits to POST /api/jobs (multipart with photos); "Analyse enquiry"
 * continues into the preparing-scope screen, "Save as draft" opens the job.
 * Custom service templates (from /templates) appear as filing options and the
 * analysis grades the enquiry against them.
 * ──────────────────────────────────────────────────────────────────────────── */

const JOB_TYPES: Array<{ label: string; value: string }> = [
  { label: "Leaking tap or mixer", value: "leaking_tap" },
  { label: "Hot water system fault", value: "hot_water_system" },
  { label: "Blocked toilet or drain", value: "toilet_repair" },
  { label: "Pipe leak / Burst pipe", value: "leaking_tap" },
  { label: "Rough-in renovation", value: "toilet_repair" },
];

const CUSTOM_PREFIX = "custom:";

const URGENCY_OPTIONS = [
  { label: "Standard", value: "standard" },
  { label: "Soon (48h)", value: "soon" },
  { label: "Urgent (Today)", value: "urgent" },
] as const;

const PROPERTY_TYPES = [
  "Victorian Terrace (Double storey)",
  "Single storey brick",
  "Apartment / Unit block",
  "Commercial suite",
];

interface Photo {
  file: File;
  url: string;
}

export function NewEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTour = searchParams.get("tour") === "1";
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [jobType, setJobType] = useState(JOB_TYPES[0]!.label);
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]["value"]>("standard");
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]!);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [submitting, setSubmitting] = useState<null | "draft" | "analyse">(null);
  const [ref, setRef] = useState("");
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [dictating, setDictating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [customTemplates, setCustomTemplates] = useState<TemplateRow[]>([]);

  // Guided-tour mode: pre-fill a realistic enquiry so the user can click through
  // the whole flow without inventing data.
  useEffect(() => {
    if (!isTour) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDictating(true);
    setCustomerName("Jordan Lee");
    setPhone("0412 884 921");
    setEmail("jordan.lee@example.com.au");
    setSuburb("Brunswick, VIC 3056");
    setJobType(JOB_TYPES[0]!.label);
    setPropertyType(PROPERTY_TYPES[0]!);
    setMessage(
      "My bathroom basin tap has a slow drip that is getting worse and leaving a water mark on the vanity. It is not urgent but I would like it looked at next week.",
    );
    const next = new Date(Date.now() + 3 * 86400_000);
    setAvailability(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
    );
  }, [isTour]);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setCustomTemplates(d.templates ?? []))
      .catch(() => setCustomTemplates([]));
  }, []);

  useEffect(() => {
    // mount-only: the enquiry ref is generated on the client so SSR and
    // hydration stay consistent (the chip renders once the ref exists).
    let hash = 492;
    for (const c of `${Date.now()}`) hash = (hash * 31 + c.charCodeAt(0)) % 9000;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRef(`ENQ-${new Date().getFullYear()}-${String(400 + (hash % 500)).padStart(4, "0")}`);
  }, []);

  // Readiness is a weighted sum of *distinct* requirements — a name and phone
  // number alone must never look like a half-finished scope.
  const readiness = useMemo(() => {
    let score = 0;
    if (customerName.trim().length >= 2) score += 10;
    if (phone.trim().length >= 6) score += 10;
    if (email.trim().length >= 5) score += 5;
    if (suburb.trim().length >= 3) score += 15;
    if (message.trim().length >= 30) score += 25;
    else if (message.trim().length > 0) score += 10;
    score += Math.min(photos.length, 2) * 12;
    if (availability) score += 8;
    if (voiceTranscript.trim().length > 0) score += 5;
    return Math.min(95, score);
  }, [customerName, phone, email, suburb, photos.length, message, availability, voiceTranscript]);

  const templateIdUsed = jobType.startsWith(CUSTOM_PREFIX)
    ? jobType.slice(CUSTOM_PREFIX.length)
    : null;

  function addPhotos(files: FileList | File[]) {
    const next = Array.from(files)
      .filter((f) => f instanceof File && f.size <= 6 * 1024 * 1024)
      .slice(0, 3 - photos.length)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (next.length === 0 && photos.length < 3) {
      toast.error("Photos must be under 6 MB.");
      return;
    }
    if (photos.length + next.length > 3) {
      toast.error("Up to 3 photos per enquiry.");
      return;
    }
    setPhotos((p) => [...p, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[index]!.url);
      return p.filter((_, i) => i !== index);
    });
  }

  const JOB_TYPE_BY_VALUE: Record<string, string> = {
    leaking_tap: "Leaking tap or mixer",
    toilet_repair: "Blocked toilet or drain",
    hot_water_system: "Hot water system fault",
  };

  function applyDictation(transcript: string, fields: IntakeExtraction, extracted: boolean) {
    if (fields.customer_name) setCustomerName(fields.customer_name);
    if (fields.phone) setPhone(fields.phone);
    if (fields.email) setEmail(fields.email);
    if (fields.suburb) setSuburb(fields.suburb);
    if (fields.job_type && JOB_TYPE_BY_VALUE[fields.job_type]) {
      setJobType(JOB_TYPE_BY_VALUE[fields.job_type]!);
    }
    if (fields.urgency === "urgent" || fields.urgency === "emergency") setUrgency("urgent");
    else if (fields.urgency === "standard" || fields.urgency === "flexible") setUrgency("standard");
    if (fields.property_type && PROPERTY_TYPES.includes(fields.property_type)) {
      setPropertyType(fields.property_type);
    }
    if (fields.message) setMessage(fields.message);
    else if (!message.trim()) setMessage(transcript);
    setVoiceTranscript(transcript);
    setVoiceOpen(false);
    setDictating(true);
    if (extracted) {
      toast.success("Transcription applied — check each field before analysing.");
    } else {
      toast.message("Transcript captured. Fill in the remaining details before analysing.");
    }
  }

  async function transcribeRecording(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "intake.webm");
      const res = await fetch("/api/intake/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed.");
      applyDictation(data.transcript ?? "", data.fields ?? {}, Boolean(data.extracted));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Recording is not supported in this browser — type the details instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) void transcribeRecording(blob);
        else toast.error("Nothing was recorded — try again.");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Could not access the microphone — type the details instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function composeEnquiryText(): string {
    const parts: string[] = [];
    const msg = message.trim() || "Customer enquiry submitted without a written message.";
    parts.push(msg);
    if (availability) {
      const parsed = new Date(`${availability}T00:00:00`);
      parts.push(`Customer stated availability: ${formatAvailability(parsed)}.`);
    }
    parts.push(`Property type: ${propertyType}.`);
    const urgencyLabel =
      urgency === "standard" ? "Standard" : urgency === "soon" ? "Soon (within 48h)" : "Urgent (today)";
    parts.push(`Urgency level: ${urgencyLabel}.`);
    if (voiceTranscript.trim()) parts.push(`Voice note transcript: ${voiceTranscript.trim()}`);
    return parts.join("\n");
  }

  async function submit(kind: "draft" | "analyse") {
    if (customerName.trim().length < 2) {
      toast.error("Add the customer name before continuing.");
      return;
    }
    if (message.trim().length < 5 && photos.length === 0) {
      toast.error("Add a short description of the job (or a photo) before continuing.");
      return;
    }
    setSubmitting(kind);
    try {
      const isCustom = jobType.startsWith(CUSTOM_PREFIX);
      const custom = isCustom ? customTemplates.find((t) => t.id === jobType.slice(CUSTOM_PREFIX.length)) : null;
      const form = new FormData();
      form.set("customer_name", customerName.trim());
      form.set("phone", phone.trim());
      form.set("email", email.trim());
      form.set("suburb", suburb.trim());
      form.set("job_type", custom ? custom.base_type : JOB_TYPES.find((t) => t.label === jobType)?.value ?? "leaking_tap");
      form.set("intake_channel", "web_form");
      form.set("enquiry_text", composeEnquiryText());
      if (custom) form.set("template_id", custom.id);
      photos.forEach((p) => form.append("images", p.file));
      const res = await fetch("/api/jobs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the enquiry.");
      if (isTour) setTourJobId(data.id);
      router.push(kind === "analyse" ? `/jobs/${data.id}/analysing` : `/jobs/${data.id}`);
    } catch (error) {
      toast.error((error as Error).message);
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* Stepper Bar */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md mb-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm w-full md:w-auto">
          <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md">
            1
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-primary-container">
              1. Enquiry details
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Intake data &amp; media
            </span>
          </div>
        </div>
        <div className="hidden md:block h-0.5 w-16 bg-primary-container/30"></div>
        <div className="flex items-center gap-space-sm w-full md:w-auto opacity-60">
          <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
            2
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface">
              2. Analysis &amp; scoping
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Fixture &amp; risk verification
            </span>
          </div>
        </div>
        <div className="hidden md:block h-0.5 w-16 bg-surface-container-highest"></div>
        <div className="flex items-center gap-space-sm w-full md:w-auto opacity-60">
          <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
            3
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface">3. Review scope</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Labour &amp; materials sign-off
            </span>
          </div>
        </div>
      </div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Create a new enquiry
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              Draft in progress
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Add what the customer has provided. QuoteReady will identify what still needs to be
            confirmed before a fixed estimate.
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-end sm:self-auto">
          {ref && (
            <span className="font-data-mono text-data-mono text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded">
              REF: {ref}
            </span>
          )}
        </div>
      </div>
      {/* Operational 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Form Left Column (~68% split) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-space-xl">
            {/* Section 1: Customer details */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm pb-space-xs" data-tour="enquiry-details">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  person
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  1. Customer details
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="customer-name">
                    Customer name
                  </label>
                  <input
                    id="customer-name"
                    className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="phone">
                    Phone number
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                      call
                    </span>
                    <input
                      id="phone"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-data-mono text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0412 884 921"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      id="email"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com.au"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="suburb">
                    Suburb &amp; Postcode
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                      location_on
                    </span>
                    <input
                      id="suburb"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                      type="text"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                      placeholder="Brunswick, VIC 3056"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-surface-container-high"></div>
            {/* Section 2: Job details */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm pb-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  handyman
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">2. Job details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="job-type">
                    Job type category
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="job-type"
                      className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all cursor-pointer"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t.label} value={t.label}>
                          {t.label}
                        </option>
                      ))}
                      {customTemplates.length > 0 && (
                        <optgroup label="Your service templates">
                          {customTemplates.map((t) => (
                            <option key={t.id} value={`${CUSTOM_PREFIX}${t.id}`}>
                              {t.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    Urgency level
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-lg">
                    {URGENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={
                          urgency === opt.value
                            ? "py-1.5 px-2 rounded-md bg-surface-container-lowest text-primary-container font-label-md text-label-md shadow-sm transition-all text-center font-semibold"
                            : "py-1.5 px-2 rounded-md text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-all text-center"
                        }
                        onClick={() => setUrgency(opt.value)}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="message">
                    Customer message or intake notes
                  </label>
                  <span className="font-label-sm text-label-sm text-outline">
                    {message.length} characters
                  </span>
                </div>
                <textarea
                  id="message"
                  className="w-full p-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all resize-y"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. My bathroom tap is leaking. It is not urgent but I would like someone next week."
                />
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="availability">
                    Customer stated availability
                  </label>
                  <AvailabilityPicker id="availability" value={availability} onChange={setAvailability} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="property-type">
                    Property type
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="property-type"
                      className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all cursor-pointer"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
              {voiceOpen && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="voice-transcript">
                      Voice note transcript
                    </label>
                    <button
                      className="font-label-sm text-label-sm text-outline hover:text-error transition-colors"
                      onClick={() => {
                        setVoiceOpen(false);
                        setVoiceTranscript("");
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    id="voice-transcript"
                    className="w-full p-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all resize-y"
                    rows={2}
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    placeholder="Paste the spoken note transcript — QuoteReady reads it during analysis."
                  />
                </div>
              )}
            </div>
            <div className="w-full h-px bg-surface-container-high"></div>
            {/* Section 3: Evidence & photos */}
            <div className="flex flex-col gap-space-md">
              <div className="flex flex-wrap items-center justify-between gap-3" data-tour="enquiry-evidence">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    photo_library
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    3. Evidence &amp; site media
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    data-tour="enquiry-voice"
                    className={
                      recording
                        ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md shadow-sm"
                        : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors shadow-sm disabled:opacity-60"
                    }
                    onClick={recording ? stopRecording : startRecording}
                    disabled={transcribing}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {recording ? "stop_circle" : "mic"}
                    </span>
                    {recording
                      ? "Stop & fill form"
                      : transcribing
                        ? "Transcribing…"
                        : "Record voice note"}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                    onClick={() => setVoiceOpen(true)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      keyboard
                    </span>
                    Type instead
                  </button>
                </div>
              </div>
              {(recording || transcribing || dictating) && (
                <div className="p-3 rounded-lg bg-surface-container-low flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-primary text-[20px] ${recording ? "animate-pulse" : "animate-spin"}`}
                  >
                    {recording ? "graphic_eq" : transcribing ? "progress_activity" : "auto_awesome"}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface">
                      {recording
                        ? "Recording — speak the customer's details, then stop."
                        : transcribing
                          ? "Transcribing with ElevenLabs Scribe…"
                          : "Voice intake applied — review the fields below."}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Voice → transcript → Gemini places each detail into the right field.
                    </span>
                  </div>
                </div>
              )}
              {templateIdUsed && (
                <div className="p-2.5 rounded-lg bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">fact_check</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    This enquiry will be graded against{" "}
                    <strong className="text-on-surface font-semibold">
                      {customTemplates.find((t) => t.id === templateIdUsed)?.name ?? "your template"}
                    </strong>
                    .
                  </span>
                </div>
              )}
              {/* Drag and Drop Zone */}
              <div
                className={`w-full p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer group transition-colors ${
                  dragging ? "bg-surface-container-low" : "bg-surface-container-low/50 hover:bg-surface-container-low"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files.length > 0) addPhotos(e.dataTransfer.files);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform mb-2 shadow-sm">
                  <span className="material-symbols-outlined text-[26px]">add_a_photo</span>
                </div>
                <p className="font-headline-sm text-headline-sm text-on-surface mb-0.5">
                  Upload customer photos
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-lg">
                  Drag images here or{" "}
                  <span className="text-primary-container font-label-md underline underline-offset-2">
                    browse files
                  </span>
                  . Photos can help identify fixture type, visible access and information gaps. They
                  are not a substitute for inspection.
                </p>
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  multiple
                  type="file"
                  onChange={(e) => {
                    if (e.target.files) addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {/* Uploaded Media Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mt-space-xs">
                  {photos.map((photo, i) => (
                    <div
                      key={photo.url}
                      className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center gap-space-md relative group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={photo.file.name}
                        className="w-20 h-20 rounded-md object-cover bg-surface-container shrink-0"
                        src={photo.url}
                      />
                      <div className="flex flex-col min-w-0 pr-6">
                        <span className="font-label-md text-label-md text-on-surface truncate">
                          {photo.file.name}
                        </span>
                        <span className="font-data-mono text-label-sm text-on-surface-variant">
                          {(photo.file.size / (1024 * 1024)).toFixed(1)} MB • Customer photo
                        </span>
                        <span className="inline-flex items-center gap-1 mt-1 text-primary-container font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Attached for analysis
                        </span>
                      </div>
                      <button
                        aria-label="Remove image"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition-colors"
                        onClick={() => removePhoto(i)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Action Footer */}
            <div className="w-full pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <button
                className="w-full sm:w-auto px-space-md py-2.5 rounded-lg bg-surface-container-low text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors text-center disabled:opacity-60"
                disabled={submitting !== null}
                onClick={() => submit("draft")}
                type="button"
              >
                {submitting === "draft" ? "Saving…" : "Save as draft"}
              </button>
              <div className="flex flex-col items-center sm:items-end w-full sm:w-auto gap-1">
                <button
                  data-tour="enquiry-submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={submitting !== null}
                  onClick={() => submit("analyse")}
                  type="button"
                >
                  <span>{submitting === "analyse" ? "Analysing…" : "Analyse enquiry"}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm mt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">
                    lock
                  </span>
                  <span>Analysis creates a scope pack. No message sent automatically.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Guidance Right Sidebar (~32% split) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md sticky top-20">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm pb-space-xs">
              <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  What QuoteReady checks
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Automated validation criteria
                </p>
              </div>
            </div>
            {/* Check items */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-start gap-3 p-space-sm rounded-lg bg-surface-container-low/40">
                <div className="w-6 h-6 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">water_damage</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    1. Job details
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Identifies fixture category, probable failure points, and scope boundaries based
                    on customer description.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-space-sm rounded-lg bg-surface-container-low/40">
                <div className="w-6 h-6 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">image_search</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    2. Supporting evidence
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Assesses whether uploaded images verify the fixture, the access point and the
                    isolation valves.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-space-sm rounded-lg bg-surface-container-low/40">
                <div className="w-6 h-6 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">meeting_room</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    3. Access and availability
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Flags clearance, potential physical obstacles, and technician schedule
                    alignment.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-space-sm rounded-lg bg-surface-container-low/40">
                <div className="w-6 h-6 rounded-full bg-surface-container text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[15px]">warning</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    4. Inspection &amp; safety signals
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Scans for concealed service risks, water damage warning signs, and relevant
                    compliance checks.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-surface-container-high my-space-xs"></div>
            {/* Trust Note */}
            <div className="p-space-sm rounded-lg bg-surface-container flex items-start gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                shield
              </span>
              <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface font-semibold">Tradie Verification:</strong>{" "}
                QuoteReady helps prepare a scope. A licensed tradie must review and approve all
                recommendations before pricing or commencing work.
              </p>
            </div>
          </div>
          {/* Quick Metrics Summary Snippet */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-2">
            <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>Enquiry Readiness Score</span>
              <span className="font-data-mono font-semibold text-primary-container">
                {readiness}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-500"
                style={{ width: `${readiness}%` }}
              ></div>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              {photos.length > 0 ? "✓" : "○"} {photos.length} photo
              {photos.length === 1 ? "" : "s"} attached
              <br />
              {customerName.trim().length >= 2 && phone.trim().length >= 6 ? "✓" : "○"} Customer
              contact {phone.trim().length >= 6 ? "captured" : "pending"}
              <br />
              {message.trim().length >= 30 ? "✓" : "○"} Job details described
              <br />
              {availability ? "✓" : "○"} Availability selected
            </p>
          </div>
          <Link
            className="text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            href="/dashboard"
          >
            ← Back to triage dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
