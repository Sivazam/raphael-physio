import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { getStoryRecord, therapistExists, updateStoryFields } from "@/lib/store";
import {
  CONSENT_STATUSES,
  CONTENT_STATUSES,
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
} from "../../_lib/helpers";

/**
 * PATCH /api/admin/stories/[id] — edit a patient recovery story.
 *
 * CONSENT RULE (enforced here, not just in the UI): a story can never be
 * moved to "published" unless its consentStatus is "approved" AND a
 * consentReference is on file. This is the honest-content policy — no
 * patient story goes public without documented consent.
 */

/**
 * Optional recovery-photo URL: "" or null clears the field; absent key leaves
 * the stored value untouched (partial PATCHes — e.g. the status dropdown —
 * must never wipe the photos). The .transform() runs BEFORE .nullable/.optional
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
  title: z
    .string()
    .trim()
    .min(2, "Please give the story a title.")
    .max(160)
    .optional(),
  conditionContext: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional(),
  journey: z
    .string()
    .trim()
    .max(20000)
    .nullable()
    .optional(),
  beforeImageUrl: optionalMediaUrl("before photo"),
  afterImageUrl: optionalMediaUrl("after photo"),
  therapistId: z
    .string()
    .trim()
    .nullable()
    .optional(),
  consentStatus: z.enum(CONSENT_STATUSES).optional(),
  consentReference: z
    .string()
    .trim()
    .max(200, "Please keep the consent reference under 200 characters.")
    .nullable()
    .optional(),
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
    const existing = await getStoryRecord(id);
    if (!existing) return jsonError("Story not found.", 404);

    if (data.therapistId && !(await therapistExists(data.therapistId))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please choose a valid therapist.",
          fieldErrors: { therapistId: "That therapist no longer exists." },
        },
        { status: 400 }
      );
    }

    // Merge patch over existing state, then enforce the consent rule on the
    // resulting record (covers e.g. approving consent and publishing in one
    // call, and publishing without touching consent fields).
    const finalConsentStatus =
      data.consentStatus ?? existing.consentStatus;
    const finalConsentReference =
      data.consentReference !== undefined
        ? (data.consentReference ?? "").trim()
        : (existing.consentReference ?? "").trim();

    if (
      data.status === "published" &&
      (finalConsentStatus !== "approved" || finalConsentReference === "")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This story can't be published yet — documented patient consent is required first (consent status \"approved\" plus a consent reference on file).",
          fieldErrors: {
            consentStatus:
              finalConsentStatus !== "approved"
                ? "Consent must be approved before publishing."
                : undefined,
            consentReference:
              finalConsentReference === ""
                ? "Record where the documented consent is filed."
                : undefined,
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateStoryFields(id, data);
    return adminJson(session, { ok: true, story: updated });
  } catch (err) {
    return serverError("stories/update", err);
  }
}
