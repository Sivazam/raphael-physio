import { NextRequest, NextResponse } from "next/server";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { APPOINTMENT_STATUSES, serverError } from "../_lib/helpers";

/**
 * GET /api/admin/appointments?status=requested — list appointment requests,
 * newest first. Dates/slots are clinic-local strings and are returned as
 * stored (no UTC math).
 */
export async function GET(req: NextRequest) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  const status = req.nextUrl.searchParams.get("status");
  const where =
    status && (APPOINTMENT_STATUSES as readonly string[]).includes(status)
      ? { status }
      : {};

  try {
    const rows = await db.appointmentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return adminJson(session, { ok: true, appointments: rows });
  } catch (err) {
    return serverError("appointments/list", err);
  }
}
