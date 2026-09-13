"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Job section nav — a little navbar for every enquiry. Each section of the
 * scope (required details, inspection triggers, assumptions, exclusions, still
 * needed) is one tap away, so a long job page never feels overwhelming.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface JobSectionItem {
  id: string;
  label: string;
  count?: number;
}

export function JobSectionNav({ items }: { items: JobSectionItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: [0, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  return (
    <nav
      aria-label="Job sections"
      className="sticky top-16 z-30 -mx-1 px-1 py-2 bg-surface/85 backdrop-blur-md"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-0.5">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors shadow-xs",
                isActive
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full font-data-mono text-[10px]",
                    isActive ? "bg-on-primary/20 text-on-primary" : "bg-surface-container text-on-surface-variant",
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
