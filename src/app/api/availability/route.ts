import { NextRequest, NextResponse } from "next/server";
import {
  createRateLimiter,
  getAvailabilityForDate,
  parseISODate,
} from "@/lib/booking";

/**
 * GET /api/availability?date=YYYY-MM-DD
 *
 * Bookable slots for one clinic-local (Asia/Kolkata) date, derived from
 * OperatingHour sessions, the settings booking window, the Sunday rule, and
 * already-requested (non-cancelled) appointments. Malformed dates are a 400;
 * valid-but-unbookable dates return 200 with an honest reason and, when one
 * exists, the next bookable date.
 */

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(10 * 60 * 1000, 120);

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Too many availability lookups — please wait a moment." },
      { status: 429, headers: NO_STORE }
    );
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !parseISODate(date)) {
    return NextResponse.json(
      { ok: false, error: "Please provide a date as YYYY-MM-DD." },
      { status: 400, headers: NO_STORE }
    );
  }

  let result;
  try {
    result = await getAvailabilityForDate(date);
  } catch {
    // Availability is not patient data; a fixed message keeps internals private.
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't check times just now. Please try again in a moment — or call the centre and we'll book you directly.",
      },
      { status: 500, headers: NO_STORE }
    );
  }

  if (result.status === "ok") {
    return NextResponse.json(
      {
        ok: true,
        date: result.date,
        slots: result.slots,
      },
      { headers: NO_STORE }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      date: result.date,
      reason: result.reason,
      message: result.message,
      alternativeDate: result.alternativeDate,
    },
    { headers: NO_STORE }
  );
}
