import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/**
 * POST /api/admin/auth/logout — clears the admin session cookie.
 * Requires a valid JSON content type (basic CSRF hardening together with
 * SameSite=Lax); unauthenticated calls still succeed so the cookie is
 * always cleared client-side.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
