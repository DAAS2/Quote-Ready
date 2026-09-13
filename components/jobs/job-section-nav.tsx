"use client";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Job section nav — a little navbar for every enquiry.
 *
 * This is a real tab bar, not a scroll-spy: tapping a category swaps the panel
 * below it for that category's detail, so a long job page never dumps every
 * section on the reader at once.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface JobSectionItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

export function JobSectionNav({
  items,
  active,
  onChange,
}: {
  items: JobSectionItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Job sections"
      className="sticky top-16 z-30 -mx-1 px-1 py-2 bg-surface/85 backdrop-blur-md"
    >
      <div
        role="tablist"
        className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-0.5"
      >
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors shadow-xs",
                isActive
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              {item.icon && (
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              )}
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full font-data-mono text-[10px]",
                    isActive
                      ? "bg-on-primary/20 text-on-primary"
                      : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
