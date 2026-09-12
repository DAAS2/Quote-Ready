"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveBusinessProfile, loadBusinessProfile, type BusinessProfile } from "@/lib/auth/session";

/* ────────────────────────────────────────────────────────────────────────────
 * Settings — restyled to the Calm Trade Precision design tokens (no dedicated
 * design screen exists; styles mirror the workspace design system exactly).
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

export function SettingsPage({ storeKind }: { storeKind: "supabase" | "memory" }) {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile>(() => ({
    business_name: "",
    trade: TRADES[0],
    suburb: "",
    ...(loadBusinessProfile() ?? {}),
  }));
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  function save() {
    saveBusinessProfile(profile);
    setSaved(true);
    toast.success("Business profile saved.");
    setTimeout(() => setSaved(false), 2000);
  }

  async function resetDemo() {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed.");
      toast.success("Demo workspace reset to the seeded jobs.");
      router.refresh();
    } catch {
      toast.error("Reset failed — please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              settings
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Workspace settings</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Business details, onboarding and demo controls.
            </p>
          </div>
        </div>
      </div>

      {/* Business profile */}
      <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              storefront
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Business profile</h2>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">check</span>
              Saved
            </span>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant -mt-2">
          Used to personalise follow-up drafts and workspace labels.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="s_business">
              Business name
            </label>
            <input
              id="s_business"
              value={profile.business_name}
              onChange={(e) => setProfile((p) => ({ ...p, business_name: e.target.value }))}
              className="h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
              placeholder="Northside Plumbing"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="s_trade">
              Trade
            </label>
            <div className="relative flex items-center">
              <select
                id="s_trade"
                value={profile.trade}
                onChange={(e) => setProfile((p) => ({ ...p, trade: e.target.value }))}
                className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
              >
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="s_suburb">
              Service area
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                location_on
              </span>
              <input
                id="s_suburb"
                value={profile.suburb}
                onChange={(e) => setProfile((p) => ({ ...p, suburb: e.target.value }))}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all"
                placeholder="Melbourne, VIC"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary/90 transition-all"
            onClick={save}
            type="button"
          >
            Save profile
          </button>
        </div>
      </section>

      {/* Workspace & data */}
      <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary-container text-[20px]">
            database
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Data &amp; demo</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Data source
              </span>
              <span className="font-body-md text-body-md text-on-surface font-medium">
                {storeKind === "supabase" ? "Supabase (persistent)" : "Local demo (in-memory)"}
              </span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${storeKind === "supabase" ? "bg-[#15803D]" : "bg-amber-500"}`}
            ></span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Licence
              </span>
              <span className="font-body-md text-body-md text-on-surface font-medium">
                Lic. #48291 · Residential
              </span>
            </div>
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            className="h-10 px-4 rounded-lg bg-surface-container-lowest border border-border hover:bg-error-container/40 hover:text-error hover:border-error/30 text-on-surface font-label-lg text-label-lg transition-colors disabled:opacity-60"
            onClick={resetDemo}
            disabled={resetting}
            type="button"
          >
            {resetting ? "Resetting…" : "Reset demo workspace"}
          </button>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Resetting restores the seeded enquiries (Jordan, Priya, Sam and the wider backlog) and
          clears every audit event.
        </p>
      </section>

      {/* Guardrail */}
      <div className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            Tradie Oversight Guaranteed
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            QuoteReady assists scope readiness. All prices and customer messages require tradie
            approval before dispatch.
          </p>
        </div>
      </div>
    </div>
  );
}
