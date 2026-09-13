/* ────────────────────────────────────────────────────────────────────────────
 * Quote numbering. Human-friendly, year-scoped and collision-safe:
 * `Q-2026-0001`, `Q-2026-0002`, ...
 * ──────────────────────────────────────────────────────────────────────────── */

const QUOTE_NUMBER_RE = /^Q-(\d{4})-(\d{1,5})$/;

/** The next quote number for `now`'s year, given every existing number. */
export function nextQuoteNumber(existing: readonly string[], now: Date = new Date()): string {
  return nextQuoteNumberForYear(existing, now.getFullYear());
}

export function nextQuoteNumberForYear(existing: readonly string[], year: number): string {
  let highest = 0;
  for (const value of existing) {
    const match = QUOTE_NUMBER_RE.exec(value.trim());
    if (!match) continue;
    if (Number(match[1]) !== year) continue;
    highest = Math.max(highest, Number(match[2]));
  }
  return `Q-${year}-${String(highest + 1).padStart(4, "0")}`;
}

/** ISO date (YYYY-MM-DD) used in the document header. */
export function isoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Long-form Australian date for documents, e.g. "13 September 2026". */
export function longDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** `valid_until` = issue date + validity window. */
export function addDaysIso(iso: string, days: number): string {
  const base = new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso);
  if (Number.isNaN(base.getTime())) return iso;
  base.setUTCDate(base.getUTCDate() + days);
  return isoDate(base);
}
