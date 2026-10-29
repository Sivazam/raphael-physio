/**
 * Pure crypto helpers for admin authentication.
 *
 * Kept free of Next.js imports so the Prisma seed script can use them too.
 * - Password hashing: scrypt with a per-hash random salt.
 * - Session tokens: HMAC-signed, expiry-carrying tokens for an HttpOnly cookie.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ??
  "dev-only-insecure-secret-change-me"; // documented in .env.example

const SCRYPT_KEYLEN = 64;

export function scryptHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function scryptVerify(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/** Signs a session payload: base64url(json) + "." + hmac. */
export function signSession(payload: {
  sub: string;
  email: string;
  role: string;
  exp: number; // epoch seconds
}): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

/** Verifies signature + expiry. Returns the payload or null. */
export function verifySession(token: string | undefined | null): {
  sub: string;
  email: string;
  role: string;
  exp: number;
} | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
