"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Availability date picker — a real calendar popup styled to the Calm Trade
 * Precision tokens, replacing the old free-text "availability" input.
 * ──────────────────────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatAvailability(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AvailabilityPicker({
  value,
  onChange,
  id,
}: {
  /** ISO date (yyyy-mm-dd) or empty string. */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => (value ? startOfDay(new Date(`${value}T00:00:00`)) : null), [value]);
  const [view, setView] = useState<Date>(() => selected ?? startOfDay(new Date()));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  function pick(d: Date) {
    onChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    setOpen(false);
  }

  return (
    <div className="relative" ref={root}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "w-full h-10 pl-9 pr-9 rounded-lg bg-surface-container-lowest text-left font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all",
          selected ? "text-on-surface" : "text-outline",
        )}
      >
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          event
        </span>
        <span className="truncate">{selected ? formatAvailability(selected) : "Select a date"}</span>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Customer availability"
          className="absolute z-30 mt-2 w-[290px] rounded-xl bg-surface-container-lowest shadow-xl border border-border p-3"
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="font-label-lg text-label-lg text-on-surface">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 pb-1">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="h-7 flex items-center justify-center font-label-sm text-label-sm text-outline uppercase"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const isToday = d.getTime() === today.getTime();
              const isSelected = selected !== null && d.getTime() === selected.getTime();
              const isPast = d.getTime() < today.getTime();
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => pick(d)}
                  className={cn(
                    "h-8 rounded-lg font-body-sm text-body-sm transition-colors",
                    isSelected
                      ? "bg-primary-container text-on-primary font-semibold"
                      : isPast
                        ? "text-outline-variant cursor-not-allowed"
                        : isToday
                          ? "text-primary font-semibold hover:bg-surface-container-low"
                          : "text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(today)}
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
