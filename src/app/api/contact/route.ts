import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * POST /api/contact — contact/enquiry form handler.
 *
 * Validation happens server-side (zod). Stored via the ContactMessage model.
 * Deliberately never leaks internals: database or unexpected errors return a
 * generic message with a phone fallback.
 */

const TOPICS = ["appointment", "enquiry", "feedback", "other"] as const;
type Topic = (typeof TOPICS)[number];

const TOPIC_LABELS: Record<Topic, string> = {
  appointment: "Appointment",
  enquiry: "General enquiry",
  feedback: "Feedback",
  other: "Other",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 letters).")
    .max(80, "Please keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(24, "That phone number looks too long — please check it.")
    .refine(
      (v) => {
        const digits = v.replace(/[^\d]/g, "");
        return /^[+()\-\s\d]+$/.test(v) && digits.length >= 7 && digits.length <= 13;
      },
      "Please enter a valid phone number (digits, optionally + and spaces)."
    ),
  email: z
    .string()
    .trim()
    .max(120, "Please use a shorter email address.")
    .refine((v) => v === "" || EMAIL_RE.test(v), {
      message: "That email address doesn't look right — or leave it empty.",
    })
    .optional(),
  topic: z.enum(TOPICS, {
    message: "Please choose what your message is about.",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Please write a little more so we can help (at least 10 characters).")
    .max(2000, "Please keep your message under 2000 characters."),
  /** Honeypot — must stay empty. Humans never see this field. */
  website: z.string().max(200).optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

// ------------------------------------------------------------ rate limiting
// Light in-memory per-IP limiter. Fine for a single-instance deployment;
// documented in worklog for the orchestrator's production notes.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You've sent several messages in a short time. Please wait a little while, or call the centre directly.",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "We couldn't read your message — please try again." },
      { status: 400 }
    );
  }

  // Honeypot tripped: pretend success so bots get no signal, store nothing.
  if (
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).website === "string" &&
    (body as Record<string, unknown>).website !== ""
  ) {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
      { status: 400 }
    );
  }

  const data: ContactInput = parsed.data;

  // The ContactMessage model has no topic column — prefix the message with the
  // chosen topic so nothing the visitor selected is lost.
  const storedMessage = `Topic: ${TOPIC_LABELS[data.topic]}\n\n${data.message}`;

  try {
    await db.contactMessage.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email === "" ? null : data.email ?? null,
        message: storedMessage,
      },
    });
  } catch (err) {
    console.error("[contact] Failed to store message:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Something went wrong on our side. Please try again in a moment — or call the centre and we'll help you directly.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
