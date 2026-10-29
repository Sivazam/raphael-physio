import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { getServiceRecord, updateServiceFields } from "@/lib/store";
import {
  CONTENT_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/services/[id] — edit basic service fields.
 * The slug is deliberately NOT editable here: it is part of public URLs and
 * changing it would break links and printed QR codes.
 */

/**
 * Optional image URL: "" or null clears the field; absent key leaves the
 * stored value untouched (partial PATCHes — e.g. the status dropdown —
 * must never wipe the image). The .transform() runs BEFORE .nullable/.optional
 * so zod omits the key entirely when it is absent from the request body.
 */
const optionalMediaUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) =>
        v === "" ||
        /^https?:\/\/.+\..+/.test(v) ||
        /^\/(?!\/)[^\s]*$/.test(v),
      `Please paste a full http(s) link — or clear the ${label} field.`,
    )
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please give the service a name (at least 2 characters).")
    .max(120)
    .optional(),
  tagline: z
    .string()
    .trim()
    .max(200, "Please keep the tagline under 200 characters.")
    .nullable()
    .optional(),
  summary: z
    .string()
    .trim()
    .min(10, "Please write a short summary (at least 10 characters).")
    .max(600, "Please keep the summary under 600 characters.")
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Please write the description (at least 10 characters).")
    .max(20000)
    .optional(),
  imageUrl: optionalMediaUrl("image"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  featured: z.boolean().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
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
  if (Object.keys(data).length === 0) {
    return jsonError("Nothing to update.", 400);
  }

  try {
    const existing = await getServiceRecord(id);
    if (!existing) return jsonError("Service not found.", 404);

    const updated = await updateServiceFields(id, data);
    return adminJson(session, { ok: true, service: updated });
  } catch (err) {
    return serverError("services/update", err);
  }
}
