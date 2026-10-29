/**
 * Display formatting for the admin area. Clinic-local timezone (Asia/Kolkata)
 * is used everywhere — never UTC date math.
 */

import { formatTime12h } from "@/lib/content";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-10-27" → "27 Oct 2026" (manual parse — no timezone drift). */
export function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${d} ${MONTHS_SHORT[Math.min(Math.max(m, 1), 12) - 1]} ${y}`;
}

/** ISO timestamp → "27 Oct 2026, 4:30 pm" in Asia/Kolkata. */
export function formatClinicDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Today's date as "YYYY-MM-DD" in Asia/Kolkata (en-CA gives ISO order). */
export function todayYmdClinic(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "09:00" → "9:00 AM". */
export { formatTime12h };
