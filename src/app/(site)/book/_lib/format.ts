/**
 * Client-safe date helpers for the booking wizard.
 *
 * These mirror the calendar-date formatters in `src/lib/booking.ts` (which is
 * server-only because it imports the database) — keep the two in sync. Dates
 * are plain "YYYY-MM-DD" strings in clinic-local time; no UTC "now" maths
 * ever happens here. `Intl` with `timeZone: "UTC"` is used only to format a
 * *date-only* value, which pins the calendar day regardless of environment.
 */

const HUMAN = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const HUMAN_NO_YEAR = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function toUtcInstant(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Monday, 2 November 2026" for a clinic-local calendar date string. */
export function formatDateHuman(iso: string): string {
  const instant = toUtcInstant(iso);
  return instant ? HUMAN.format(instant) : iso;
}

/** "Monday, 2 November" (no year). */
export function formatDateHumanNoYear(iso: string): string {
  const instant = toUtcInstant(iso);
  return instant ? HUMAN_NO_YEAR.format(instant) : iso;
}

/**
 * "YYYY-MM-DD" → local Date holding that calendar date (for react-day-picker,
 * which reads local components). Display-only: never derived from "now".
 */
export function isoToCalendarDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** local Date → "YYYY-MM-DD" from local calendar components. */
export function calendarDateToISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
