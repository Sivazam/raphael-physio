import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import {
  exerciseCategoryExists,
  getExerciseRecord,
  updateExerciseFields,
} from "@/lib/store";
import {
  CONTENT_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/exercises/[id] — edit basic exercise fields.
 * Slug stays fixed (public share URLs must not break).
 */

/**
 * Optional media URL: "" or null clears the field; absent key leaves the
 * stored value untouched (partial PATCHes — e.g. the status dropdown —
 * must never wipe media). The .transform() runs BEFORE .nullable/.optional
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

/** YouTube links only (watch / shorts / youtu.be / embed / nocookie). */
const optionalYoutubeUrl = () =>
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) =>
        v === "" ||
        /https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//.test(v),
      "Please paste a YouTube link (youtube.com or youtu.be) — or clear the field.",
    )
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const patchSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Please give the exercise a title (at least 2 characters).")
    .max(120)
    .optional(),
  summary: z
    .string()
    .trim()
    .min(10, "Please write a short summary (at least 10 characters).")
    .max(600, "Please keep the summary under 600 characters.")
    .optional(),
  purpose: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  instructions: z
    .string()
    .trim()
    .min(10, "Please keep the step-by-step instructions (one per line).")
    .max(20000)
    .optional(),
  imageUrl: optionalMediaUrl("image"),
  videoUrl: optionalMediaUrl("video upload"),
  youtubeUrl: optionalYoutubeUrl(),
  categoryId: z
    .string()
    .trim()
    .nullable()
    .optional(),
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
    // A category id must reference a real exercise category (dual-path).
    if (data.categoryId && !(await exerciseCategoryExists(data.categoryId))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please choose a valid category.",
          fieldErrors: { categoryId: "That category no longer exists." },
        },
        { status: 400 }
      );
    }

    const existing = await getExerciseRecord(id);
    if (!existing) return jsonError("Exercise not found.", 404);

    const updated = await updateExerciseFields(id, data);
    return adminJson(session, { ok: true, exercise: updated });
  } catch (err) {
    return serverError("exercises/update", err);
  }
}
