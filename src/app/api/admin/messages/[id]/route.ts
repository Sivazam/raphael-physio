import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  MESSAGE_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/messages/[id] — mark a contact message read/unread or
 * archive/restore it.
 */

const patchSchema = z.object({
  status: z.enum(MESSAGE_STATUSES),
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
        error: "Please choose a valid status.",
        fieldErrors: zodFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const existing = await db.contactMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return jsonError("Message not found.", 404);

    const updated = await db.contactMessage.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return adminJson(session, { ok: true, message: updated });
  } catch (err) {
    return serverError("messages/update", err);
  }
}
