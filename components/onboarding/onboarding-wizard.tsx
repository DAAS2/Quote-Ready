"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandLogoSvg } from "@/components/brand/logo";
import { markOnboarded, saveBusinessProfile, loadBusinessProfile } from "@/lib/auth/session";
import { requestTour } from "@/lib/onboarding/tour";

/* ────────────────────────────────────────────────────────────────────────────
 * Setup wizard — designed with the Calm Trade Precision system (stepper from
 * the new-enquiry design). Creates the business profile for signed-in users
 * (persisted to their profile row) and teaches the workflow.
 * ──────────────────────────────────────────────────────────────────────────── */

const TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC / Air conditioning",
  "Carpentry",
  "Painting & decorating",
  "Roofing",
  "Tiling",
  "Landscaping",
  "Other trade",
];

const HOW_STEPS = [
  {
    icon: "note_add",
    title: "1 · Add an enquiry",
    body: "Drop the customer's message, photos and availability into a new enquiry — it takes under a minute.",
  },
  {
    icon: "search_insights",
    title: "2 · Let QuoteReady analyse",
    body: "QuoteReady extracts known facts, flags what's missing and recommends the safest next step.",
  },
  {
    icon: "assignment_turned_in",
    title: "3 · Review and approve",
    body: "You review the scope, record a site note, draft a follow-up and approve everything by hand.",
  },
];

export function OnboardingWizard({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]!);
  const [serviceArea, setServiceArea] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile(): Promise<boolean> {
    saveBusinessProfile({ business_name: businessName.trim(), trade, suburb: serviceArea.trim() });
    markOnboarded();
    if (!signedIn) return true;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
          ...(businessName.trim() ? { business_name: businessName.trim() } : {}),
          trade,
          ...(serviceArea.trim() ? { service_area: serviceArea.trim() } : {}),
          onboarded: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // profile persistence is best-effort — the workspace keeps working
        // from the local profile if the backend cannot store it yet.
        toast.message(data.error ?? "Profile saved on this device only.");
      }
      return true;
    } catch {
      toast.message("Profile saved on this device only.");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (step === 1) {
      const ok = await saveProfile();
      if (!ok) return;
      setStep(2);
      return;
    }
    // Launch the interactive guided tour on the dashboard — the user creates
    // their own first enquiry rather than being handed demo data.
    requestTour();
    router.push("/dashboard");
    router.refresh();
  }

  function skip() {
    saveBusinessProfile(
      loadBusinessProfile() ?? { business_name: "", trade, suburb: "" },
    );
    markOnboarded();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-surface font-body-md text-body-md text-on-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-space-lg">
        {/* Brand + stepper */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <BrandLogoSvg tone="light" wordmark={false} className="h-8 w-auto object-contain" />
            <span className="font-headline-sm text-headline-sm tracking-tight">QuoteReady</span>
          </div>
          <button
            className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={skip}
            type="button"
          >
            Skip setup
          </button>
        </div>

        {/* Stepper (from the new-enquiry design) */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md">
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex items-center gap-space-sm w-full md:w-auto">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-label-md text-label-md ${
                  step >= n
                    ? "bg-primary-container text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {n + 1}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-label-lg text-label-lg ${
                    step === n ? "text-primary-container" : step > n ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {n === 0 ? "Welcome" : n === 1 ? "Your business" : "How it works"}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {n === 0 ? "Quick orientation" : n === 1 ? "Branding & service area" : "The daily workflow"}
                </span>
              </div>
              {n < 2 && <div className="hidden md:block h-0.5 w-16 bg-primary-container/30 ml-space-md" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-space-lg">
          {step === 0 && (
            <>
              <div className="flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[28px]">
                    handshake
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    Welcome to QuoteReady
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    QuoteReady turns incomplete trade enquiries into structured job scopes — showing
                    what is known, missing, assumed or unsafe before you commit to a price.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: "photo_camera", label: "Enquiries + photos in one place" },
                  { icon: "auto_awesome", label: "Readiness scored 0–100%" },
                  { icon: "verified_user", label: "You approve every action" },
                ].map((c) => (
                  <div key={c.label} className="p-3 rounded-lg bg-surface-container-low flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                      {c.icon}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">{c.label}</span>
                  </div>
                ))}
              </div>
              <button
                className="h-11 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary transition-colors self-start"
                onClick={() => setStep(1)}
                type="button"
              >
                Set up my workspace
                <span className="material-symbols-outlined ml-2 text-[18px] align-middle">
                  arrow_forward
                </span>
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[28px]">
                    storefront
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    {signedIn ? "Set up your business" : "Add your business (demo)"}
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {signedIn
                      ? "This brands your workspace, follow-ups and audit trail."
                      : "Sign in to save this permanently — for now it is stored on this device."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="ob-name">
                    Your name
                  </label>
                  <input
                    id="ob-name"
                    className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Miller"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="ob-business">
                    Business name
                  </label>
                  <input
                    id="ob-business"
                    className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Northside Plumbing"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="ob-trade">
                    Trade
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="ob-trade"
                      className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                    >
                      {TRADES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="ob-area">
                    Service area
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                      location_on
                    </span>
                    <input
                      id="ob-area"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                      type="text"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      placeholder="e.g. Melbourne North, VIC"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-space-md">
                <button
                  className="h-10 px-4 rounded-lg bg-surface-container-low text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors"
                  onClick={() => setStep(0)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="h-11 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary transition-colors disabled:opacity-60"
                  onClick={finish}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving…" : "Save and continue"}
                  <span className="material-symbols-outlined ml-2 text-[18px] align-middle">
                    arrow_forward
                  </span>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-start gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[28px]">
                    school
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    How QuoteReady works
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Three steps, every time. We&apos;ll walk you through it interactively in your
                    workspace — creating a real, pre-filled enquiry together.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {HOW_STEPS.map((s) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        {s.icon}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-label-lg text-label-lg text-on-surface">{s.title}</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                  shield
                </span>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                  <strong className="text-on-surface font-semibold">Tradie Verification:</strong>{" "}
                  QuoteReady never prices work or messages a customer without your explicit
                  sign-off.
                </p>
              </div>
              <button
                className="h-11 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary transition-colors self-start"
                onClick={finish}
                type="button"
              >
                Open my dashboard
                <span className="material-symbols-outlined ml-2 text-[18px] align-middle">
                  arrow_forward
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
