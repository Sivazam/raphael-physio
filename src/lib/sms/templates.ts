/**
 * SMS message templates — SERVER-ONLY module (pure functions, but part of
 * the outbound notification pipeline; keep it out of client bundles).
 *
 * Every message the clinic sends is rendered here so the wording stays
 * reviewable in one place — and so nothing sensitive ever enters an SMS.
 *
 * SAFETY / PRIVACY RULES (see master plan §9):
 * - Appointment notifications carry NO clinical detail: no service name,
 *   no condition, no notes — only the patient's first name, the date/time,
 *   and the clinic's verified phone number.
 * - Language must stay honest: a "request received" message never claims
 *   the appointment is confirmed; only the "appointment_confirmed" type
 *   (sent after staff confirm) may say confirmed.
 *
 * INDIA / DLT NOTE: transactional SMS in India requires DLT registration of
 * the sender ID AND each message template's content. The templates below
 * are starting points — the clinic must register the final wording with
 * their provider (and TRAI DLT) before production sending is enabled. See
 * src/lib/sms/README.md.
 */

import { SITE } from "@/lib/site";

/** Job types exactly as stored in SmsJob.type (see prisma/schema.prisma). */
export const SMS_JOB_TYPES = [
  "request_received",
  "appointment_confirmed",
  "reminder",
  "rescheduled",
  "cancelled",
] as const;

export type SmsJobType = (typeof SMS_JOB_TYPES)[number];

/** Appointment facts the templates are allowed to use. Nothing clinical. */
export interface SmsAppointmentContext {
  patientName: string;
  /** YYYY-MM-DD in clinic-local time (Asia/Kolkata) — as stored on the row. */
  appointmentDate: string;
  /** HH:mm (24h) clinic-local — as stored on the row. */
  appointmentSlot: string;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "2025-11-05" → "Wed, 5 Nov" (clinic-local date string, no tz math). */
function formatClinicDate(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return dateStr.trim();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return dateStr.trim();
  // Date-only string parsed as UTC — weekday derivation is tz-safe.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS_SHORT[weekday]}, ${day} ${MONTHS_SHORT[month - 1]}`;
}

/** "14:30" → "2:30 PM" (clinic-local slot string, no tz math). */
function formatSlot(slot: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(slot.trim());
  if (!match) return slot.trim();
  const hour24 = Number(match[1]);
  const minutes = match[2];
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutes} ${meridiem}`;
}

function firstName(patientName: string): string {
  const cleaned = patientName.trim().replace(/\s+/g, " ");
  if (!cleaned) return "there";
  return cleaned.split(" ")[0].slice(0, 30);
}

/**
 * Render the message for a job type from appointment facts.
 * Deterministic — same input, same output — so DLT template registration
 * and audit logs stay meaningful.
 */
export function composeSmsMessage(
  type: SmsJobType,
  ctx: SmsAppointmentContext
): string {
  const name = firstName(ctx.patientName);
  const when = `${formatClinicDate(ctx.appointmentDate)} at ${formatSlot(ctx.appointmentSlot)}`;
  const phone = SITE.phonePrimaryDisplay;

  switch (type) {
    case "request_received":
      return `Raphael Physio: Hi ${name}, we've received your appointment request for ${when}. We'll call you to confirm. For help call ${phone}.`;
    case "appointment_confirmed":
      return `Raphael Physio: Hi ${name}, your appointment is confirmed for ${when}. Please arrive 10 minutes early. To reschedule call ${phone}.`;
    case "reminder":
      return `Raphael Physio: Hi ${name}, a reminder of your appointment on ${when}. To change it, call ${phone}.`;
    case "rescheduled":
      return `Raphael Physio: Hi ${name}, your appointment has been moved to ${when}. If this looks wrong, call ${phone}.`;
    case "cancelled":
      return `Raphael Physio: Hi ${name}, your appointment on ${when} has been cancelled. To rebook, call ${phone}.`;
  }
}
