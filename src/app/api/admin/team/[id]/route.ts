import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CONTENT_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/team/[id] — edit therapist profile basics.
 *
 * Honest-content guard: publishing is a staff decision, but new/changed
 * names and credentials remain the clinic's responsibility — the public
 * team page only shows published profiles.
 *
 * Languages/expertise arrive as arrays and are stored as JSON strings
 * (SQLite has no list primitives).
 */

const stringList = z
  .array(z.string().trim().min(1).max(60))
  .max(12, "Please keep the list under 12 items.");

/**
 * Optional photo URL: "" or null clears the field; absent key leaves the
 * stored value untouched (partial PATCHes — e.g. the status dropdown —
 * must never wipe the photo). The .transform() runs BEFORE .nullable/.optional
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
    .min(2, "Please enter the therapist's name.")
    .max(120)
    .optional(),
  title: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),
  qualifications: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(0)
    .max(80)
    .nullable()
    .optional(),
  bio: z
    .string()
    .trim()
    .max(4000)
    .nullable()
    .optional(),
  photoUrl: optionalMediaUrl("photo"),
  languages: stringList.optional(),
  expertise: stringList.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
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

  const dbData = {
    name: data.name,
    title: data.title,
    qualifications: data.qualifications,
    experienceYears: data.experienceYears,
    bio: data.bio,
    photoUrl: data.photoUrl,
    sortOrder: data.sortOrder,
    status: data.status,
    ...(data.languages !== undefined
      ? { languages: JSON.stringify(data.languages) }
      : {}),
    ...(data.expertise !== undefined
      ? { expertise: JSON.stringify(data.expertise) }
      : {}),
  };

  try {
    const existing = await db.therapist.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return jsonError("Therapist not found.", 404);

    const updated = await db.therapist.update({ where: { id }, data: dbData });
    return adminJson(session, { ok: true, therapist: updated });
  } catch (err) {
    return serverError("team/update", err);
  }
}
