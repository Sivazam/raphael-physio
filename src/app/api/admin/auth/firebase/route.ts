import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import {
  clientIp,
  jsonError,
  makeRateLimiter,
  readJsonBody,
  zodFieldErrors,
} from "../../_lib/helpers";
import { BAKED_ADMINS } from "@/lib/baked-content";
import { findFirestoreAdmin } from "@/lib/store";
import {
  FIREBASE_CONFIG,
  firebaseAllowlistEmails,
} from "@/lib/firebase-config";

/**
 * POST /api/admin/auth/firebase
 *
 * Exchanges a Firebase ID token (obtained client-side via email/password or
 * Google sign-in) for the clinic's admin session cookie.
 *
 * Verification: the token is presented to Google's identitytoolkit
 * `accounts:lookup` endpoint over HTTPS with the project's web API key —
 * Google itself confirms the token is authentic and returns the account.
 * Only that endpoint's response is trusted; nothing client-supplied is.
 *
 * Authorization: the confirmed email must resolve to a clinic admin
 * identity through ANY of these tiers —
 *   1. an AdminUser row (SQLite — local dev and hosts with the database),
 *   2. the ADMIN_FIREBASE_EMAILS env allowlist,
 *   3. an `admins` document in the clinic's Firestore (added staff),
 *   4. BAKED_ADMINS (the deployment constant — the documented clinic
 *      identity, so sign-in works even on a database-less serverless host
 *      with an empty Firestore).
 * Firebase sign-in alone never grants access — this stays true even if the
 * Firebase project's own rules are wide open (test mode).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 15;
const isRateLimited = makeRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

const GENERIC_FAILURE =
  "That account is not registered for clinic admin access.";

const schema = z.object({
  idToken: z
    .string()
    .min(150, "Firebase token missing — please sign in again.")
    .max(4096, "Firebase token malformed — please sign in again."),
});

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return jsonError(
      "Too many sign-in attempts. Please wait a few minutes and try again.",
      429
    );
  }

  const body = await readJsonBody(req);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, fieldErrors: zodFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  // ---- verify the ID token with Google --------------------------------
  let account: { email: string | null; emailVerified: boolean };
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_CONFIG.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: parsed.data.idToken }),
      }
    );
    const data = (await res.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!res.ok || !user?.email) {
      return jsonError(
        "Google could not verify that sign-in — please try again.",
        401
      );
    }
    account = { email: user.email, emailVerified: Boolean(user.emailVerified) };
  } catch {
    return jsonError(
      "Could not reach Google to verify the sign-in. Check the connection and try again.",
      502
    );
  }

  // ---- authorize against the clinic's admin tiers ----------------------
  const email = (account.email ?? "").toLowerCase();
  const allowlisted = firebaseAllowlistEmails().includes(email);

  let identity: { id: string; name: string | null; role: string } | null =
    null;

  // Tier 1 — the admin CMS's own user table (when the database exists).
  const row = await db.adminUser
    .findUnique({ where: { email } })
    .catch(() => null);
  if (row) {
    identity = { id: row.id, name: row.name, role: row.role };
  }

  // Tier 3 — Firestore `admins` docs (works on database-less deployments).
  if (!identity) {
    const fsAdmin = await findFirestoreAdmin(email);
    if (fsAdmin) {
      identity = { id: fsAdmin.id, name: fsAdmin.name, role: fsAdmin.role };
    }
  }

  // Tier 4 — the baked clinic identity (always present in the build).
  if (!identity) {
    const baked = BAKED_ADMINS.find((a) => a.email === email);
    if (baked) {
      identity = {
        id: `baked:${baked.email}`,
        name: baked.name,
        role: baked.role,
      };
    }
  }

  if (!identity && !allowlisted) {
    return jsonError(GENERIC_FAILURE, 403);
  }

  // ---- issue the standard admin session --------------------------------
  // The session subject is the resolved identity's id when one exists; for
  // pure allowlist members a stable pseudo-id keeps the token shape valid.
  const token = createSessionToken({
    id: identity?.id ?? `fb:${Buffer.from(email).toString("base64url")}`,
    email,
    role: identity?.role ?? "admin",
  });
  const res = NextResponse.json({
    ok: true,
    user: { name: identity?.name ?? email.split("@")[0], email },
  });
  setSessionCookie(res, token);
  return res;
}
