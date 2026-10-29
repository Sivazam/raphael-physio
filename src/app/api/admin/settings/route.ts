import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest, requireAdminRole } from "@/lib/auth";
import { saveClinicSettings } from "@/lib/store";
import {
  EMAIL_RE,
  TIME_RE,
  clientIp,
  emptyToNull,
  isValidHttpUrl,
  isValidPhone,
  jsonError,
  makeRateLimiter,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../_lib/helpers";

/**
 * PUT /api/admin/settings — clinic contact details, booking rules, social
 * links, and per-day operating hours (open/closed + session times).
 *
 * Only the fields editable in /admin/settings are accepted. SMS provider
 * configuration is intentionally untouched (owned elsewhere). Values are
 * validated, normalised (empty → null) and written to the ClinicSetting
 * singleton + OperatingHour rows.
 */

// Keep honest about accidental rapid-fire saves, but generous enough for
// normal staff use.
const isRateLimited = makeRateLimiter(60 * 1000, 20);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(isValidHttpUrl, "Please enter a full http(s) link — or leave it empty.");

const optionalPhone = z
  .string()
  .trim()
  .max(24)
  .refine((v) => v === "" || isValidPhone(v), "That phone number doesn't look right.");

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .refine((v) => v === "" || EMAIL_RE.test(v), "That email address doesn't look right.");

const sessionSchema = z
  .object({
    start: z.string().regex(TIME_RE, "Use a valid time (HH:mm)."),
    end: z.string().regex(TIME_RE, "Use a valid time (HH:mm)."),
  })
  .refine((s) => s.end > s.start, {
    message: "The session must end after it starts.",
    path: ["end"],
  });

const hoursSchema = z
  .array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      isOpen: z.boolean(),
      sessions: z.array(sessionSchema).max(3, "At most 3 sessions per day."),
    })
  )
  .length(7, "All seven days are required.")
  .refine((days) => new Set(days.map((d) => d.dayOfWeek)).size === 7, {
    message: "Each day may only appear once.",
  })
  .refine((days) => days.every((d) => !d.isOpen || d.sessions.length > 0), {
    message: "Open days need at least one session time.",
  });

const settingsSchema = z
  .object({
    // Contact
    phonePrimary: z
      .string()
      .trim()
      .min(7, "Please enter the primary phone number.")
      .max(24)
      .refine(isValidPhone, "That phone number doesn't look right."),
    phoneAlternate: optionalPhone,
    email: optionalEmail,
    addressLine1: z
      .string()
      .trim()
      .min(4, "Please enter the street address.")
      .max(200),
    addressLine2: z.string().trim().max(200).nullable().optional(),
    addressLine3: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().min(2, "Please enter the city.").max(100),
    state: z.string().trim().max(100).nullable().optional(),
    postcode: z.string().trim().max(20).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    mapsUrl: optionalUrl,
    googleReviewsUrl: optionalUrl,

    // Booking
    bookingMode: z.enum(["internal", "external"]),
    externalBookingUrl: optionalUrl,
    sundayBookingEnabled: z.boolean(),
    minBookingDateOffset: z
      .number()
      .int()
      .min(0, "Earliest bookable day can't be negative.")
      .max(365),
    maxBookingDateOffset: z
      .number()
      .int()
      .min(1, "Furthest bookable day must be at least 1.")
      .max(365),
    slotDurationMinutes: z
      .number()
      .int()
      .min(5, "Slots can't be shorter than 5 minutes.")
      .max(120, "Slots can't be longer than 120 minutes."),
    bookingNotes: z.string().trim().max(1000).nullable().optional(),

    // Socials
    facebookUrl: optionalUrl,
    instagramUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    youtubeUrl: optionalUrl,

    hours: hoursSchema,
  })
  .refine(
    (s) =>
      s.bookingMode !== "external" ||
      (s.externalBookingUrl ?? "").trim() !== "",
    {
      message:
        "External booking mode needs the full booking link patients should be sent to.",
      path: ["externalBookingUrl"],
    }
  )
  .refine((s) => s.maxBookingDateOffset >= s.minBookingDateOffset, {
    message: "The furthest bookable day can't be before the earliest one.",
    path: ["maxBookingDateOffset"],
  });

export async function PUT(req: NextRequest) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  const forbidden = requireAdminRole(session);
  if (forbidden) return forbidden;

  if (isRateLimited(clientIp(req))) {
    return jsonError(
      "That's a lot of saves in one minute — please wait a moment and try again.",
      429
    );
  }

  const body = await readJsonBody(req);
  if ("error" in body) return body.error;

  const parsed = settingsSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: zodFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  const s = parsed.data;

  try {
    // Dual-path store write: the ClinicSetting singleton + 7 OperatingHour
    // rows in SQLite, or config/clinic + hours/{day} docs in Firestore
    // (database-less deployments). Same validated payload either way.
    const result = await saveClinicSettings(
      {
        phonePrimary: s.phonePrimary,
        phoneAlternate: emptyToNull(s.phoneAlternate),
        email: emptyToNull(s.email),
        addressLine1: s.addressLine1,
        addressLine2: emptyToNull(s.addressLine2),
        addressLine3: emptyToNull(s.addressLine3),
        city: s.city,
        state: emptyToNull(s.state),
        postcode: emptyToNull(s.postcode),
        country: emptyToNull(s.country),
        mapsUrl: emptyToNull(s.mapsUrl),
        googleReviewsUrl: emptyToNull(s.googleReviewsUrl),
        bookingMode: s.bookingMode,
        externalBookingUrl: emptyToNull(s.externalBookingUrl),
        sundayBookingEnabled: s.sundayBookingEnabled,
        minBookingDateOffset: s.minBookingDateOffset,
        maxBookingDateOffset: s.maxBookingDateOffset,
        slotDurationMinutes: s.slotDurationMinutes,
        bookingNotes: emptyToNull(s.bookingNotes),
        facebookUrl: emptyToNull(s.facebookUrl),
        instagramUrl: emptyToNull(s.instagramUrl),
        linkedinUrl: emptyToNull(s.linkedinUrl),
        youtubeUrl: emptyToNull(s.youtubeUrl),
      },
      s.hours
    );

    return adminJson(session, {
      ok: true,
      settings: result.settings,
      hours: result.hours,
    });
  } catch (err) {
    return serverError("settings/update", err);
  }
}
