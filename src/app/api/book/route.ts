import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAppointmentRequest,
  getPublishedServiceRef,
} from "@/lib/store";
import { getSettings } from "@/lib/settings";
import {
  createRateLimiter,
  dayOfWeekISO,
  generateReferenceId,
  getAvailabilityForDate,
  normalizePhone,
  parseISODate,
} from "@/lib/booking";

/**
 * POST /api/book — internal-mode appointment REQUEST submission.
 *
 * Every rule the UI enforces is re-enforced here, because the client can be
 * bypassed: booking window, Sunday rule, operating hours, past cutoff, slot
 * chunking and double-booking (transactional re-check). Never logs patient
 * data. Responds with per-field JSON errors and a short reference id.
 */

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const isRateLimited = createRateLimiter(WINDOW_MS, MAX_PER_WINDOW);

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

const bookSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 letters).")
    .max(80, "Please keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can call you back on.")
    .max(24, "That phone number looks too long — please check it."),
  /** Service id, or null/omitted for "Not sure — help me decide". */
  serviceId: z.string().trim().max(64).nullish(),
  /** Clinic-local calendar date, "YYYY-MM-DD". */
  date: z.string().trim().refine((v) => parseISODate(v) !== null, {
    message: "Please pick a valid date (YYYY-MM-DD).",
  }),
  /** Clinic-local slot start, "HH:mm". */
  slot: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please choose a valid time slot."),
  notes: z
    .string()
    .trim()
    .max(1000, "Please keep notes under 1000 characters.")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  consent: z.literal(true, {
    message: "Please tick the box to confirm you understand this is a request.",
  }),
  /** Honeypot — must stay empty; humans never see it. */
  website: z.string().max(200).optional(),
});

type BookInput = z.infer<typeof bookSchema>;

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You've sent several requests in a short time. Please wait a little while, or call the centre directly.",
      },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "We couldn't read your request — please try again." },
      { status: 400, headers: NO_STORE }
    );
  }

  // Honeypot tripped: pretend success so bots get no signal; store nothing.
  if (
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).website === "string" &&
    (body as Record<string, unknown>).website !== ""
  ) {
    return NextResponse.json(
      { ok: true, reference: generateReferenceId() },
      { headers: NO_STORE }
    );
  }

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
      { status: 400, headers: NO_STORE }
    );
  }
  const data: BookInput = parsed.data;

  const settings = await getSettings().catch(() => null);

  // External mode: the clinic books through its own platform; this endpoint
  // is switched off and says so honestly.
  if (settings?.bookingMode === "external") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Online requests are currently handled through the clinic's own booking platform — please use the booking link on this page, or call the centre.",
      },
      { status: 400, headers: NO_STORE }
    );
  }

  // Phone normalisation (Indian formats, +91/10-digit tolerant, spaces stripped).
  const phone = normalizePhone(data.phone);
  if (!phone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: {
          phone:
            "Please enter a valid phone number — 10 digits (or with +91 and spacing).",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  // Belt and braces: explicit Sunday rejection even if the calendar was bypassed.
  if (dayOfWeekISO(data.date) === 0 && !(settings?.sundayBookingEnabled ?? false)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: {
          date: "The centre is closed on Sundays — please choose a weekday (Mon–Sat).",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  // Date + slot validation through the same availability engine the GET uses:
  // window, operating hours, chunking, past cutoff and existing requests.
  let availability;
  try {
    availability = await getAvailabilityForDate(data.date);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Something went wrong on our side. Please try again in a moment — or call the centre and we'll book you directly.",
      },
      { status: 500, headers: NO_STORE }
    );
  }

  if (availability.status === "unavailable") {
    const payload: Record<string, unknown> = {
      ok: false,
      error: "Please check the highlighted fields and try again.",
      fieldErrors: { date: availability.message },
    };
    if (availability.alternativeDate) {
      payload.alternativeDate = availability.alternativeDate;
    }
    return NextResponse.json(payload, { status: 400, headers: NO_STORE });
  }

  const chosen = availability.slots.find((s) => s.start === data.slot);
  if (!chosen || !chosen.available) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please choose an available time.",
        fieldErrors: {
          slot: chosen
            ? "That time was just requested by someone else — please choose another time."
            : "That time isn't offered on the chosen day — please pick from the available times.",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  // Optional service: must be a currently-published service (snapshot name).
  // Dual-path (SQLite → Firestore) through the store; a Firestore outage
  // throws here so the route's catch answers honestly.
  let service: { id: string; name: string } | null = null;
  if (data.serviceId) {
    try {
      service = await getPublishedServiceRef(data.serviceId);
    } catch {
      service = null;
    }
    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please check the highlighted fields and try again.",
          fieldErrors: {
            serviceId:
              "That service isn't selectable — please choose from the list, or select 'Not sure'.",
          },
        },
        { status: 400, headers: NO_STORE }
      );
    }
  }

  const reference = generateReferenceId();

  // Dual-path store write: transactional conflict re-check + create on
  // SQLite, fresh-list conflict check + create on Firestore (Vercel).
  let created = false;
  try {
    ({ created } = await createAppointmentRequest({
      patientName: data.name,
      phone,
      email: null,
      serviceId: service?.id ?? null,
      serviceName: service?.name ?? null,
      appointmentDate: data.date,
      appointmentSlot: data.slot,
      notes: data.notes ?? null,
      consentGiven: true,
      status: "requested",
      // Staff-visible reference so a quoted "RPH-…" can be matched later.
      adminNote: `Reference: ${reference}`,
    }));
  } catch {
    // Fixed message only — never log patient data or echoing errors.
    console.error("[book] Failed to store appointment request (store error)");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Something went wrong on our side. Please try again in a moment — or call the centre and we'll book you directly.",
      },
      { status: 500, headers: NO_STORE }
    );
  }

  if (!created) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please choose an available time.",
        fieldErrors: {
          slot: "That time was just requested by someone else — please choose another time.",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  return NextResponse.json({ ok: true, reference }, { headers: NO_STORE });
}
