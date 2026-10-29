import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, authorizeApiRequest, requireAdminRole } from "@/lib/auth";
import { listAppUsers, setAppUserAccess } from "@/lib/app-users";
import {
  jsonError,
  readJsonBody,
  serverError,
  zodFieldErrors,
  EMAIL_RE,
} from "../_lib/helpers";

/**
 * /api/admin/users — the staff access registry (Firestore `users` docs).
 *
 * GET   — list registered app users (admin only; the list carries emails).
 * PATCH — approve (appAccess=true) or revoke (false) one account. The gate
 *         is re-read server-side on the user's next page load, so this is
 *         the whole approval workflow: flip the flag, done.
 */

const patchSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(160)
    .refine((v) => EMAIL_RE.test(v), "That email address doesn't look right."),
  appAccess: z.boolean(),
});

export async function GET() {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;
  const denied = requireAdminRole(session);
  if (denied) return denied;

  try {
    const users = await listAppUsers();
    return adminJson(session, { ok: true, users });
  } catch (err) {
    return serverError("users/list", err);
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;
  const denied = requireAdminRole(session);
  if (denied) return denied;

  const body = await readJsonBody(req);
  if ("error" in body) return body.error;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, fieldErrors: zodFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const user = await setAppUserAccess(parsed.data.email, parsed.data.appAccess);
    return adminJson(session, {
      ok: true,
      user,
      message: parsed.data.appAccess
        ? `${user.email} can now open the dashboard (on their next page load).`
        : `Access revoked for ${user.email} (on their next page load).`,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("not signed in")
        ? "That account has not signed in yet — nothing to approve."
        : undefined;
    if (message) return jsonError(message, 404);
    return serverError("users/access", err);
  }
}
