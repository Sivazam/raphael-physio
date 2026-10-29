import { NextResponse } from "next/server";
import { adminJson, authorizeApiRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { dbReachable } from "@/lib/store";
import { getAppUserRecord } from "@/lib/app-users";
import { serverError } from "../../_lib/helpers";

/**
 * GET /api/admin/auth/me — the current signed-in user (200) or 401.
 * Also carries sliding session renewal via adminJson().
 *
 * Two account families share this endpoint:
 *  - clinic admins/staff: resolved from the database when one is present
 *    (name changes reflected; a deleted row-based account signs out), or
 *    from the signed session for row-less identities (the baked constant,
 *    the env allowlist, Firestore `admins` docs) and database-less hosts;
 *  - app users (role "member"): the session email identifies their
 *    Firestore `users` document; `access` reports the approval flag so the
 *    client can route pending accounts to the waiting screen.
 */

export async function GET() {
  const { session, response } = await authorizeApiRequest();
  if (response) return response;

  try {
    if (session.role === "member") {
      const record = await getAppUserRecord(session.email).catch(() => null);
      return adminJson(session, {
        ok: true,
        access: record?.appAccess ? "granted" : "pending",
        user: {
          email: session.email,
          name: record?.displayName ?? null,
          role: "member",
        },
      });
    }

    // Clinic admins: prefer the database row so name changes are reflected.
    const user = await db.adminUser
      .findUnique({
        where: { id: session.sub },
        select: { email: true, name: true, role: true },
      })
      .catch(() => null);
    if (user) {
      return adminJson(session, { ok: true, access: "granted", user });
    }

    // Row-less identities never had an AdminUser row: the baked clinic
    // constant, the env allowlist, and Firestore `admins` docs (whose doc
    // id IS the email). The signed session stands on its own.
    const rowLess =
      session.sub.startsWith("baked:") ||
      session.sub.startsWith("fb:") ||
      session.sub.includes("@");
    if (rowLess) {
      return adminJson(session, {
        ok: true,
        access: "granted",
        user: {
          email: session.email,
          name: session.email.split("@")[0],
          role: session.role,
        },
      });
    }

    // A row-based identity that no longer resolves: with the database
    // reachable the account was removed after the token was issued —
    // treat as signed out. Without a database there is nothing to check.
    if (await dbReachable()) {
      return NextResponse.json(
        { ok: false, error: "Please sign in to continue." },
        { status: 401 }
      );
    }
    return adminJson(session, {
      ok: true,
      access: "granted",
      user: {
        email: session.email,
        name: session.email.split("@")[0],
        role: session.role,
      },
    });
  } catch (err) {
    return serverError("auth/me", err);
  }
}
