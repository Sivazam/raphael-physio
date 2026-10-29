import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scryptHash, scryptVerify } from "@/lib/auth-crypto";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clientIp,
  jsonError,
  makeRateLimiter,
  readJsonBody,
  serverError,
  zodFieldErrors,
  EMAIL_RE,
} from "../../_lib/helpers";

/**
 * POST /api/admin/auth/login
 *
 * Verifies email + password (scrypt) against AdminUser and sets the signed
 * HttpOnly session cookie. Responses are deliberately identical for
 * "unknown email" and "wrong password" so accounts can't be enumerated.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 10;
const isRateLimited = makeRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

// Burned when the email doesn't exist so both failure paths cost the same.
const DUMMY_HASH = scryptHash("timing-equalisation-dummy");

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Please enter your email address.")
    .max(160)
    .refine((v) => EMAIL_RE.test(v), "That email address doesn't look right."),
  password: z
    .string()
    .min(1, "Please enter your password.")
    .max(200, "That password is too long."),
});

const GENERIC_FAILURE =
  "Incorrect email or password. Please check and try again.";

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return jsonError(
      "Too many sign-in attempts. Please wait a few minutes and try again.",
      429
    );
  }

  const body = await readJsonBody(req);
  if ("error" in body) return body.error;

  const parsed = loginSchema.safeParse(body.data);
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

  const { email, password } = parsed.data;

  try {
    const user = await db.adminUser.findUnique({ where: { email } });
    const valid = scryptVerify(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      // Small fixed delay to blunt online brute-force attempts.
      await new Promise((r) => setTimeout(r, 400));
      return jsonError(GENERIC_FAILURE, 401);
    }

    const token = createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user: { email: user.email, name: user.name, role: user.role },
    });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    return serverError("auth/login", err);
  }
}
