/**
 * Shared booking logic — slot generation, the Sunday rule, and clinic-local
 * date maths for the appointment-request flow.
 *
 * TIMEZONE CONTRACT (non-negotiable):
 * The clinic operates in Asia/Kolkata. Dates are handled as plain
 * "YYYY-MM-DD" strings in clinic-local time. The only place "now" is
 * interpreted is `todayInClinicTz()` / `nowMinutesInClinicTz()`, which use
 * Intl with an explicit timeZone. Calendar arithmetic uses pure integer
 * civil-date algorithms (days-from-civil), never `Date` UTC methods — so a
 * request can never slip to a different local day.
 *
 * This module imports the database (via `@/lib/settings` callers below);
 * it is SERVER-ONLY. Client components must not import it — they consume
 * its output through the page props and the JSON APIs.
 */

import { SITE } from "@/lib/site";
import { formatTime12h, type Session } from "@/lib/content";
import { getOperatingHours, getSettings } from "@/lib/settings";
import { takenSlotsForDate } from "@/lib/store";

export const CLINIC_TZ = SITE.timezone;

// ---------------------------------------------------------------------------
// Clinic clock — the only interpretation of "now"
// ---------------------------------------------------------------------------

/** Today's date in clinic-local time, as "YYYY-MM-DD". */
export function todayInClinicTz(): string {
  // en-CA yields ISO-like "YYYY-MM-DD". Never use `new Date()` UTC getters.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutes since midnight, right now, in clinic-local time. */
export function nowMinutesInClinicTz(): number {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return timeToMinutes(hhmm);
}

// ---------------------------------------------------------------------------
// Pure calendar maths on "YYYY-MM-DD" strings (Howard Hinnant's algorithms)
// ---------------------------------------------------------------------------

export interface CivilDate {
  y: number;
  m: number; // 1–12
  d: number; // 1–31
}

/** Days since 1970-01-01 for a proleptic Gregorian date. Pure integer math. */
function daysFromCivil(y: number, m: number, d: number): number {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400; // [0, 399]
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil. */
function civilFromDays(z: number): CivilDate {
  z += 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  ); // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153); // [0, 11]
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
  const m = mp + (mp < 10 ? 3 : -9); // [1, 12]
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses "YYYY-MM-DD" into a real calendar date, or null.
 * Rejects impossible dates (2026-02-30), non-canonical padding, and garbage.
 */
export function parseISODate(value: string): CivilDate | null {
  if (typeof value !== "string" || !ISO_RE.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  const c = { y, m, d };
  // Round-trip guarantees the date exists on the Gregorian calendar.
  const z = daysFromCivil(y, m, d);
  const back = civilFromDays(z);
  return back.y === y && back.m === m && back.d === d ? c : null;
}

export function formatISODate(c: CivilDate): string {
  return `${String(c.y).padStart(4, "0")}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

/** Adds `days` (may be negative) to a "YYYY-MM-DD" string. Pure. */
export function addDaysISO(iso: string, days: number): string {
  const c = parseISODate(iso);
  if (!c) throw new Error(`addDaysISO: invalid date "${iso}"`);
  return formatISODate(civilFromDays(daysFromCivil(c.y, c.m, c.d) + days));
}

/** Day of week, 0 = Sunday … 6 = Saturday. Pure. */
export function dayOfWeekISO(iso: string): number {
  const c = parseISODate(iso);
  if (!c) throw new Error(`dayOfWeekISO: invalid date "${iso}"`);
  // 1970-01-01 (z = 0) was a Thursday (= 4 with Sunday = 0).
  return (daysFromCivil(c.y, c.m, c.d) + 4) % 7;
}

export function isSundayISO(iso: string): boolean {
  return dayOfWeekISO(iso) === 0;
}

/** Lexicographic compare of two "YYYY-MM-DD" strings (they share a format). */
export function compareISODate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Display formatting (calendar dates only — deterministic, no "now")
// ---------------------------------------------------------------------------

const HUMAN = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC", // a date-only value has no zone; UTC keeps the calendar day fixed
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

/** "Monday, 2 November 2026" — for a clinic-local calendar date string. */
export function formatDateHuman(iso: string): string {
  const c = parseISODate(iso);
  if (!c) return iso;
  return HUMAN.format(new Date(Date.UTC(c.y, c.m - 1, c.d)));
}

/** "Monday, 2 November" (no year). */
export function formatDateHumanNoYear(iso: string): string {
  const c = parseISODate(iso);
  if (!c) return iso;
  return HUMAN_NO_YEAR.format(new Date(Date.UTC(c.y, c.m - 1, c.d)));
}

// ---------------------------------------------------------------------------
// "HH:mm" time helpers (clinic-local wall-clock strings)
// ---------------------------------------------------------------------------

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Slot generation (pure)
// ---------------------------------------------------------------------------

export type SlotSession = "morning" | "afternoon";

export interface GeneratedSlot {
  /** Slot start, "HH:mm" 24h clinic-local. */
  start: string;
  /** Slot end, "HH:mm" 24h clinic-local. */
  end: string;
  /** Display label, e.g. "9:00 AM". */
  label: string;
  /** Coarse grouping for the picker UI. */
  session: SlotSession;
}

/**
 * Chunks operating-hour sessions into appointment slots of
 * `slotDurationMinutes`. A slot is included only when it fits entirely
 * inside a session. Pure — availability marking happens at query time.
 */
export function generateSlotsForSessions(
  sessions: Session[],
  slotDurationMinutes: number
): GeneratedSlot[] {
  const duration = Math.max(5, Math.floor(slotDurationMinutes) || 30);
  const slots: GeneratedSlot[] = [];
  const seen = new Set<string>();
  for (const s of sessions) {
    const startM = timeToMinutes(s.start);
    const endM = timeToMinutes(s.end);
    if (endM <= startM) continue;
    for (let t = startM; t + duration <= endM; t += duration) {
      const start = minutesToTime(t);
      if (seen.has(start)) continue; // overlapping sessions guard
      seen.add(start);
      slots.push({
        start,
        end: minutesToTime(t + duration),
        label: formatTime12h(start),
        session: t < 12 * 60 ? "morning" : "afternoon",
      });
    }
  }
  slots.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return slots;
}

// ---------------------------------------------------------------------------
// Booking window + weekday rules (server, settings-driven)
// ---------------------------------------------------------------------------

export interface BookingWindow {
  /** Clinic-local today. */
  today: string;
  /** Earliest bookable date (today + minBookingDateOffset). */
  minDate: string;
  /** Latest bookable date (today + maxBookingDateOffset). */
  maxDate: string;
}

export function getBookingWindow(
  minOffset: number,
  maxOffset: number
): BookingWindow {
  const today = todayInClinicTz();
  const min = Math.max(0, Math.floor(minOffset) || 0);
  const max = Math.max(min, Math.floor(maxOffset) || 30);
  return {
    today,
    minDate: addDaysISO(today, min),
    maxDate: addDaysISO(today, max),
  };
}

/** Weekdays (0–6) that are closed: !isOpen, no sessions, or the Sunday rule. */
export function closedWeekdaysFromHours(
  hours: { dayOfWeek: number; isOpen: boolean; sessions: Session[] }[],
  sundayBookingEnabled: boolean
): number[] {
  const closed: number[] = [];
  for (const h of hours) {
    if (!h.isOpen || h.sessions.length === 0) closed.push(h.dayOfWeek);
  }
  if (!sundayBookingEnabled && !closed.includes(0)) closed.push(0);
  return closed.sort((a, b) => a - b);
}

/** Next open, in-window date at or after `fromISO`. Null when none exists. */
export function findNextBookableDate(
  fromISO: string,
  closedWeekdays: number[],
  window_: BookingWindow
): string | null {
  let cursor = compareISODate(fromISO, window_.minDate) < 0 ? window_.minDate : fromISO;
  for (let i = 0; i <= 60; i++) {
    if (compareISODate(cursor, window_.maxDate) > 0) return null;
    if (!closedWeekdays.includes(dayOfWeekISO(cursor))) return cursor;
    cursor = addDaysISO(cursor, 1);
  }
  return null;
}

/** Last open, in-window date at or before `fromISO`. Null when none exists. */
export function findPreviousBookableDate(
  fromISO: string,
  closedWeekdays: number[],
  window_: BookingWindow
): string | null {
  let cursor = compareISODate(fromISO, window_.maxDate) > 0 ? window_.maxDate : fromISO;
  for (let i = 0; i <= 60; i++) {
    if (compareISODate(cursor, window_.minDate) < 0) return null;
    if (!closedWeekdays.includes(dayOfWeekISO(cursor))) return cursor;
    cursor = addDaysISO(cursor, -1);
  }
  return null;
}

/**
 * Resolves a deep-linked date (`/book?date=YYYY-MM-DD`) to a bookable date:
 * clamps to the window, skips closed days (Sunday rule first), and returns an
 * honest notice explaining any move. Pure — computed with clinic-local
 * strings only, never UTC "now".
 */
export function resolveInitialDate(
  requestedISO: string,
  window_: BookingWindow,
  closedWeekdays: number[]
): { date: string; notice: string | null } {
  if (parseISODate(requestedISO) === null) {
    return { date: "", notice: null };
  }

  if (compareISODate(requestedISO, window_.today) < 0) {
    const alt = findNextBookableDate(requestedISO, closedWeekdays, window_);
    return alt
      ? {
          date: alt,
          notice: `That day has already passed — showing ${formatDateHumanNoYear(alt)} instead.`,
        }
      : { date: "", notice: "That day has already passed — please choose a coming date." };
  }

  if (compareISODate(requestedISO, window_.minDate) < 0) {
    const alt = findNextBookableDate(requestedISO, closedWeekdays, window_);
    return alt
      ? {
          date: alt,
          notice: `Requests open from ${formatDateHumanNoYear(window_.minDate)} — showing ${formatDateHumanNoYear(alt)} instead.`,
        }
      : { date: "", notice: `Requests open from ${formatDateHumanNoYear(window_.minDate)}.` };
  }

  if (compareISODate(requestedISO, window_.maxDate) > 0) {
    const alt = findPreviousBookableDate(requestedISO, closedWeekdays, window_);
    return alt
      ? {
          date: alt,
          notice: `Requests are taken up to ${formatDateHumanNoYear(window_.maxDate)} — showing ${formatDateHumanNoYear(alt)} instead.`,
        }
      : {
          date: "",
          notice: `Requests are taken up to ${formatDateHumanNoYear(window_.maxDate)} — please choose an earlier date.`,
        };
  }

  const dow = dayOfWeekISO(requestedISO);
  if (closedWeekdays.includes(dow)) {
    const closedText =
      dow === 0
        ? "The centre is closed on Sundays"
        : "The centre is closed on that day";
    const alt = findNextBookableDate(addDaysISO(requestedISO, 1), closedWeekdays, window_);
    return alt
      ? { date: alt, notice: `${closedText} — showing ${formatDateHumanNoYear(alt)} instead.` }
      : { date: "", notice: `${closedText}. Please choose another date.` };
  }

  return { date: requestedISO, notice: null };
}

// ---------------------------------------------------------------------------
// Availability (server — the single source of truth for bookable slots)
// ---------------------------------------------------------------------------

export interface AvailableSlot extends GeneratedSlot {
  /** False when already requested (non-cancelled) or in the past. */
  available: boolean;
}

export type UnavailableReason =
  | "invalid_date"
  | "sunday"
  | "closed"
  | "past"
  | "too_early"
  | "too_late";

export type AvailabilityResult =
  | {
      status: "ok";
      date: string;
      slots: AvailableSlot[];
    }
  | {
      status: "unavailable";
      date: string;
      reason: UnavailableReason;
      /** Human explanation (safe to show to patients). */
      message: string;
      /** Next open in-window date, when one exists (e.g. Sunday → Monday). */
      alternativeDate: string | null;
    };

/** Statuses that free a slot again. Everything else keeps it occupied. */
const SLOT_FREEING_STATUS = "cancelled";

/**
 * Resolves bookable slots for one clinic-local date. Enforces, in order:
 * real calendar date → booking window → Sunday rule → operating hours →
 * chunking → already-requested slots → past cutoff. Never throws for
 * patient-visible conditions; database failures throw to the route's catch.
 */
export async function getAvailabilityForDate(dateISO: string): Promise<AvailabilityResult> {
  const [settings, hours] = await Promise.all([getSettings(), getOperatingHours()]);
  return getAvailabilityForDateWith(dateISO, settings, hours);
}

/** Testable core: same logic with injected settings/hours. */
export async function getAvailabilityForDateWith(
  dateISO: string,
  settings: {
    sundayBookingEnabled: boolean;
    minBookingDateOffset: number;
    maxBookingDateOffset: number;
    slotDurationMinutes: number;
  },
  hours: { dayOfWeek: number; isOpen: boolean; sessions: Session[] }[]
): Promise<AvailabilityResult> {
  if (!parseISODate(dateISO)) {
    return {
      status: "unavailable",
      date: dateISO,
      reason: "invalid_date",
      message: "That date doesn't look valid — please pick a date from the calendar.",
      alternativeDate: null,
    };
  }

  const window_ = getBookingWindow(
    settings.minBookingDateOffset,
    settings.maxBookingDateOffset
  );

  if (compareISODate(dateISO, window_.today) < 0) {
    return {
      status: "unavailable",
      date: dateISO,
      reason: "past",
      message:
        "That day has already passed — please choose a coming date, or call the centre.",
      alternativeDate: window_.minDate,
    };
  }
  if (compareISODate(dateISO, window_.minDate) < 0) {
    return {
      status: "unavailable",
      date: dateISO,
      reason: "too_early",
      message: `Requests open from ${formatDateHuman(window_.minDate)} — please choose a later date.`,
      alternativeDate: window_.minDate,
    };
  }
  if (compareISODate(dateISO, window_.maxDate) > 0) {
    return {
      status: "unavailable",
      date: dateISO,
      reason: "too_late",
      message: `Requests are currently taken up to ${formatDateHuman(window_.maxDate)} — please choose an earlier date, or call the centre.`,
      alternativeDate: window_.maxDate,
    };
  }

  const dow = dayOfWeekISO(dateISO);
  const closedWeekdays = closedWeekdaysFromHours(hours, settings.sundayBookingEnabled);
  if (closedWeekdays.includes(dow)) {
    const isSunday = dow === 0;
    const alternative = findNextBookableDate(addDaysISO(dateISO, 1), closedWeekdays, window_);
    return {
      status: "unavailable",
      date: dateISO,
      reason: isSunday ? "sunday" : "closed",
      message: isSunday
        ? "The centre is closed on Sundays — appointment requests move to the next working day."
        : "The centre is closed on that day — please choose another date.",
      alternativeDate: alternative,
    };
  }

  const day = hours.find((h) => h.dayOfWeek === dow);
  const generated = generateSlotsForSessions(day?.sessions ?? [], settings.slotDurationMinutes);

  // Slots already requested for this date (non-cancelled) are occupied.
  // Dual-path read (SQLite → Firestore REST): taken slots for this date.
  // UNCACHED and throwing on store failure by design — the route's catch
  // turns an outage into an honest error instead of phantom free slots.
  const taken = await takenSlotsForDate(dateISO, SLOT_FREEING_STATUS);

  // Same-day requests must be in the future (clinic-local clock).
  const nowMinutes =
    compareISODate(dateISO, window_.today) === 0 ? nowMinutesInClinicTz() : -1;

  const slots: AvailableSlot[] = generated.map((s) => ({
    ...s,
    available: !taken.has(s.start) && (nowMinutes < 0 || timeToMinutes(s.start) > nowMinutes),
  }));

  return { status: "ok", date: dateISO, slots };
}

// ---------------------------------------------------------------------------
// Patient-input helpers
// ---------------------------------------------------------------------------

/**
 * Normalises phone input to a stored canonical form ("+91…"). Tolerant of
 * Indian formats: 10-digit local, leading 0, +91/91 prefixes, and spacing
 * or punctuation. Returns null when not a plausible reachable number.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed) || trimmed.length > 24) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (hasPlus) {
    if (/^91\d{10}$/.test(digits)) return `+${digits}`;
    if (/^\d{10,12}$/.test(digits)) return `+${digits}`;
    return null;
  }
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  return null;
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

/** Patient-facing reference, e.g. "RPH-K7Q2XM" (6 chars from crypto random). */
export function generateReferenceId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const b of bytes) suffix += REF_ALPHABET[b % REF_ALPHABET.length];
  return `RPH-${suffix}`;
}

// ---------------------------------------------------------------------------
// Light in-memory rate limiter (per route instance)
// ---------------------------------------------------------------------------

export function createRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();
  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return true;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 500) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return false;
  };
}
