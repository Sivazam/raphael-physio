/**
 * Admin session helpers (server-only).
 *
 * Built on the pure crypto primitives in @/lib/auth-crypto:
 * - passwords verified with scryptVerify (login route only),
 * - sessions carried in an HMAC-signed, HttpOnly cookie (`rph_admin`),
 *   SameSite=Lax, Secure in production, 8-hour expiry with sliding renewal.
 *
 * Defense in depth:
 * - src/middleware.ts checks cookie *presence* at the edge (fast redirect for
 *   pages, 401 for APIs) — it cannot verify the HMAC on the edge runtime,
 * - every /api/admin route handler and every admin page performs the full
 *   verifySession() check here (signature + expiry) before doing anything.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signSession, verifySession } from "@/lib/auth-crypto";

export const ADMIN_COOKIE = "rph_admin";

/** Session lifetime: 8 hours. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminSession {
  sub: string; // AdminUser id
  email: string;
  role: string; // "admin" | "staff"
  exp: number; // epoch seconds
}

export function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
}): string {
  return signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

/** Full verification (signature + expiry). Server components and route handlers. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value);
}

function sessionCookieAttributes() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, {
    ...sessionCookieAttributes(),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    ...sessionCookieAttributes(),
    maxAge: 0,
  });
}

/**
 * Route-handler guard. Usage:
 *
 *   const { session, response } = await authorizeApiRequest();
 *   if (response) return response; // 401
 *
 * `session` is non-null whenever `response` is null.
 */
export async function authorizeApiRequest(): Promise<
  { session: AdminSession; response: null } | { session: null; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { ok: false, error: "Please sign in to continue." },
        { status: 401 }
      ),
    };
  }
  return { session, response: null };
}

/**
 * Builds a JSON response for an authenticated admin API call and applies
 * sliding session renewal: when less than half of the TTL remains, a fresh
 * 8-hour token is issued on the same response.
 */
export function adminJson(
  session: AdminSession,
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const res = NextResponse.json(data, init);
  const now = Math.floor(Date.now() / 1000);
  if (session.exp - now < SESSION_TTL_SECONDS / 2) {
    setSessionCookie(
      res,
      signSession({
        sub: session.sub,
        email: session.email,
        role: session.role,
        exp: now + SESSION_TTL_SECONDS,
      })
    );
  }
  return res;
}

/**
 * Role gate for higher-privilege operations (deletions, clinic settings).
 * Staff accounts can manage day-to-day content; only "admin" may delete
 * patient-submitted records or reconfigure the clinic.
 */
export function requireAdminRole(
  session: AdminSession
): NextResponse | null {
  if (session.role !== "admin") {
    return NextResponse.json(
      {
        ok: false,
        error: "This action needs an administrator account.",
      },
      { status: 403 }
    );
  }
  return null;
}
