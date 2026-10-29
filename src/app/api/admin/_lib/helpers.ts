/**
 * Shared helpers for /api/admin route handlers.
 *
 * Conventions:
 * - Every response body is `{ ok: true, ... }` or `{ ok: false, error }`.
 * - Validation errors may add `fieldErrors: Record<string, string>`.
 * - Unexpected failures are logged server-side and answered with a generic
 *   message — internals and patient data are never leaked in errors.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Reads a JSON body, enforcing the content type (basic CSRF hardening). */
export async function readJsonBody(
  req: NextRequest
): Promise<{ data: unknown } | { error: NextResponse }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: jsonError("Expected a JSON request.", 415) };
  }
  try {
    return { data: await req.json() };
  } catch {
    return {
      error: jsonError("We couldn't read that request — please try again.", 400),
    };
  }
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Uniform 500 with a server-side log; never surfaces internals. */
export function serverError(scope: string, err: unknown) {
  console.error(`[admin-api:${scope}]`, err);
  return jsonError(
    "Something went wrong on our side. Please try again — or reload the page.",
    500
  );
}

/** Simple in-memory per-IP rate limiter (single-instance deployments). */
export function makeRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();
  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(ip, recent);
      return true;
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 1000) {
      for (const [key, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(key);
      }
    }
    return false;
  };
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

// --------------------------------------------------------------- validations

export const PHONE_RE = /^[+()\-\s\d]+$/;

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, "");
  return PHONE_RE.test(value) && digits.length >= 7 && digits.length <= 13;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** http(s) URL, or empty/null meaning "not set". */
export function isValidHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** "" → null, trims; for optional URL fields. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export const APPOINTMENT_STATUSES = [
  "requested",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
] as const;
export const MESSAGE_STATUSES = ["new", "read", "archived"] as const;
export const CONSENT_STATUSES = ["pending", "approved", "declined"] as const;

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
