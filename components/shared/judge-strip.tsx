"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Subtle guided-demo hint for the primary demo job (Job A).
 * Walks a judge through the exact flow in the right order.
 */
export function JudgeStrip({ customerName }: { customerName: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || customerName !== "Jordan Lee") return null;

  const steps = [
    "1. Review the scope pack and why this job scored what it did",
    "2. Draft + approve the customer follow-up",
    "3. Use the voice site note (or “Use demo note”) to update the scope from the field",
  ];

  return (
    <div className="relative rounded-lg border border-primary/30 bg-primary/[0.04] px-4 py-3">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss demo guide"
      >
        <X className="size-3.5" aria-hidden />
      </button>
      <p className="text-xs font-semibold text-primary">Guided demo — Jordan&apos;s leaking tap</p>
      <ol className="mt-1.5 space-y-0.5">
        {steps.map((s) => (
          <li key={s} className="text-xs leading-relaxed text-muted-foreground">
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
