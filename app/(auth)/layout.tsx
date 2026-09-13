import Link from "next/link";
import { BrandLogoSvg } from "@/components/brand/logo";

/* ────────────────────────────────────────────────────────────────────────────
 * Auth shell — split-screen designed in the Calm Trade Precision system:
 * navy brand panel (matches the workspace sidebar) + form surface.
 * ──────────────────────────────────────────────────────────────────────────── */

const PANEL_POINTS = [
  {
    icon: "fact_check",
    title: "Structured scopes, not guesswork",
    body: "Every enquiry becomes a reviewable job scope with known facts, missing details and risk flags.",
  },
  {
    icon: "mic",
    title: "Voice notes become evidence",
    body: "A 20-second site debrief from the van turns into audit-grade scope updates.",
  },
  {
    icon: "verified_user",
    title: "Tradie sign-off on everything",
    body: "No automatic pricing, no automatic messages — you approve every step.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface font-body-md text-body-md text-on-surface">
      {/* Brand panel (desktop) */}
      <aside className="hidden lg:flex w-[44%] xl:w-[42%] bg-inverse-surface flex-col justify-between p-space-xl">
        <div className="flex items-center gap-space-sm">
          <BrandLogoSvg tone="dark" wordmark={false} className="h-9 w-auto object-contain" />
          <span className="font-headline-md text-headline-md text-inverse-on-surface tracking-tight">
            QuoteReady
          </span>
          <span className="px-space-xs py-0.5 rounded bg-tertiary text-on-tertiary font-label-sm text-label-sm uppercase tracking-wider">
            Ops
          </span>
        </div>
        <div className="flex flex-col gap-space-lg">
          <h2 className="font-display-lg text-display-lg text-inverse-on-surface tracking-tight max-w-md">
            Know what you need{" "}
            <span className="text-primary-fixed">before you quote.</span>
          </h2>
          <div className="flex flex-col gap-4">
            {PANEL_POINTS.map((point) => (
              <div key={point.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-tertiary/50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-fixed text-[20px]">
                    {point.icon}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-label-lg text-label-lg text-inverse-on-surface">
                    {point.title}
                  </span>
                  <p className="font-body-sm text-body-sm text-tertiary-fixed-dim max-w-sm">
                    {point.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 font-label-sm text-label-sm text-tertiary-fixed-dim">
          <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">
            location_on
          </span>
          <span>Engineered in Melbourne, Victoria, Australia</span>
        </div>
      </aside>

      {/* Form surface */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full flex flex-col items-center lg:hidden mb-8">
          <Link href="/" aria-label="QuoteReady home" className="flex items-center gap-space-sm">
            <BrandLogoSvg tone="light" wordmark={false} className="h-8 w-auto object-contain" />
            <span className="font-headline-sm text-headline-sm tracking-tight">QuoteReady</span>
          </Link>
        </div>
        {children}
        <p className="mt-8 text-center font-label-sm text-label-sm leading-relaxed text-on-surface-variant max-w-md">
          QuoteReady provides an AI-assisted scope-readiness assessment — it does not diagnose
          faults, guarantee pricing, or replace professional on-site assessment.
        </p>
        <Link
          href="/"
          className="mt-3 font-label-sm text-label-sm text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}
