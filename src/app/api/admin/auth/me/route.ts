import { NextResponse } from "next/server";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { serverError } from "../../_lib/helpers";

/**
 * GET /api/admin/auth/me — the current signed-in user (200) or 401.
 * Also carries sliding session renewal via adminJson().
 */
export async function GET() {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  try {
    // Re-read from the DB so name changes are reflected; the token alone
    // remains the source of truth for authentication.
    const user = await db.adminUser.findUnique({
      where: { id: session.sub },
      select: { email: true, name: true, role: true },
    });
    if (!user) {
      // Account removed after the token was issued — treat as signed out.
      const res = NextResponse.json(
        { ok: false, error: "Please sign in to continue." },
        { status: 401 }
      );
      return res;
    }
    return adminJson(session, { ok: true, user });
  } catch (err) {
    return serverError("auth/me", err);
  }
}
