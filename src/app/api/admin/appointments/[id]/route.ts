import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest, requireAdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  APPOINTMENT_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/appointments/[id] — update status and/or the internal
 * admin note. DELETE — remove a request (admin role only).
 */

const patchSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  adminNote: z
    .string()
    .trim()
    .max(2000, "Please keep the internal note under 2000 characters.")
    .nullable()
    .optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  const { id } = await ctx.params;
  const body = await readJsonBody(req);
  if ("error" in body) return body.error;

  const parsed = patchSchema.safeParse(body.data);
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

  const data = parsed.data;
  if (data.status === undefined && data.adminNote === undefined) {
    return jsonError("Nothing to update.", 400);
  }

  try {
    const existing = await db.appointmentRequest.findUnique({ where: { id } });
    if (!existing) return jsonError("Appointment request not found.", 404);

    const updated = await db.appointmentRequest.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.adminNote !== undefined ? { adminNote: data.adminNote } : {}),
      },
    });
    return adminJson(session, { ok: true, appointment: updated });
  } catch (err) {
    return serverError("appointments/update", err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  const forbidden = requireAdminRole(session);
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  try {
    const existing = await db.appointmentRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return jsonError("Appointment request not found.", 404);

    await db.appointmentRequest.delete({ where: { id } });
    return adminJson(session, { ok: true });
  } catch (err) {
    return serverError("appointments/delete", err);
  }
}
