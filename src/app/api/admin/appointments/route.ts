import { NextRequest, NextResponse } from "next/server";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { listAppointmentRows } from "@/lib/store";
import { APPOINTMENT_STATUSES, serverError } from "../_lib/helpers";

/**
 * GET /api/admin/appointments?status=requested — list appointment requests,
 * newest first. Dates/slots are clinic-local strings and are returned as
 * stored (no UTC math). Served through the dual-path store: SQLite when the
 * database exists, Firestore (Vercel) otherwise.
 */
export async function GET(req: NextRequest) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  const status = req.nextUrl.searchParams.get("status");
  const filter =
    status && (APPOINTMENT_STATUSES as readonly string[]).includes(status)
      ? { status }
      : undefined;

  try {
    const rows = await listAppointmentRows(filter);
    return adminJson(session, { ok: true, appointments: rows });
  } catch (err) {
    return serverError("appointments/list", err);
  }
}
