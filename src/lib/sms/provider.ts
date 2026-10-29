/**
 * SMS transport provider — SERVER-ONLY module.
 *
 * Sends through a generic HTTP SMS gateway. The `server-only` package is not
 * installed in this project, so this cannot be enforced at build time —
 * import this ONLY from route handlers, server components, or scripts.
 * It reads provider credentials from the environment and MUST never be
 * bundled into client code.
 *
 * ---------------------------------------------------------------------------
 * ENVIRONMENT VARIABLES (also documented in src/lib/sms/README.md and the
 * worklog; `.env.example` belongs to agent G):
 *
 *   SMS_PROVIDER     Which adapter to use. Currently implemented:
 *                    "generic_http" — any SMS gateway that accepts a simple
 *                    authenticated HTTP POST (MSG91, Textlocal, Kaleyra and
 *                    most Indian providers offer one). Any other value (or
 *                    unset) means NOT configured, and messages are honestly
 *                    marked "skipped_unconfigured" — never "sent".
 *   SMS_API_URL      The gateway's endpoint URL (https). The request is a
 *                    POST with a JSON body: { "to", "message", "sender"? }.
 *   SMS_API_KEY      Bearer token / auth key for the gateway.
 *   SMS_SENDER_ID    Optional. The clinic's 6-character DLT-registered
 *                    sender ID, passed through as "sender".
 *
 * NOTE: `ClinicSetting.smsProvider` (default "msg91") is an admin-side
 * preference only. The runtime adapter is chosen by SMS_PROVIDER. When a
 * dedicated MSG91 adapter is written it can honour both.
 * ---------------------------------------------------------------------------
 */

/** The only adapter implemented today. */
export type SmsProviderKey = "generic_http";

export const SMS_ENV_VARS = [
  "SMS_PROVIDER",
  "SMS_API_URL",
  "SMS_API_KEY",
  "SMS_SENDER_ID",
] as const;

export interface SmsSendInput {
  /** Recipient phone, E.164 or local digits (7–15 digits). */
  to: string;
  /** Final message text (already rendered by templates.ts). */
  message: string;
}

export interface SmsSendSuccess {
  ok: true;
  /** Gateway message/request id when the response contains one. */
  providerMessageId: string | null;
}

export interface SmsSendFailure {
  ok: false;
  /** Honest, secret-free reason. Safe to store on the SmsJob row. */
  error: string;
}

export type SmsSendResult = SmsSendSuccess | SmsSendFailure;

const SEND_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_CHARS = 480; // 3 concatenated SMS segments — generous cap.

/* ------------------------------------------------------- configuration */

function env(name: (typeof SMS_ENV_VARS)[number]): string {
  return (process.env[name] ?? "").trim();
}

/**
 * True only when the implemented adapter has everything it needs. An
 * unrecognised SMS_PROVIDER value (e.g. "msg91" before that adapter exists)
 * deliberately counts as NOT configured — we never pretend to send.
 */
export function isSmsConfigured(): boolean {
  return getSmsConfigurationIssue() === null;
}

/**
 * Why SMS is not configured, in one honest sentence (or null when it is).
 * Used for SmsJob.error on skipped jobs and for admin diagnostics.
 */
export function getSmsConfigurationIssue(): string | null {
  const provider = env("SMS_PROVIDER").toLowerCase();
  if (!provider) {
    return "SMS provider not configured — SMS_PROVIDER is not set. No message was sent.";
  }
  if (provider !== "generic_http") {
    return `SMS provider not configured — adapter "${provider}" is not implemented (only "generic_http" is available). No message was sent.`;
  }
  const url = env("SMS_API_URL");
  if (!url) {
    return 'SMS provider not configured — SMS_API_URL is missing for the "generic_http" adapter. No message was sent.';
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "SMS provider not configured — SMS_API_URL must be an http(s) URL. No message was sent.";
    }
  } catch {
    return "SMS provider not configured — SMS_API_URL is not a valid URL. No message was sent.";
  }
  if (!env("SMS_API_KEY")) {
    return 'SMS provider not configured — SMS_API_KEY is missing for the "generic_http" adapter. No message was sent.';
  }
  return null;
}

/* --------------------------------------------------------------- helpers */

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/** Removes any accidental credential from an error string. */
function sanitizeError(message: string): string {
  let safe = message;
  for (const secret of [env("SMS_API_KEY")]) {
    if (secret.length >= 8) safe = safe.split(secret).join("[redacted]");
  }
  return safe.replace(/\s+/g, " ").trim().slice(0, 300);
}

function extractMessageId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["id", "message_id", "messageId", "request_id", "requestId"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  // Common nested shapes: { data: { id } } / { response: { id } }
  for (const key of ["data", "response"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const id = extractMessageId(nested);
      if (id) return id;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ send */

/**
 * Attempt a real send through the configured gateway. Never throws —
 * failures come back as { ok: false, error } with an honest reason.
 * When no provider is configured, nothing is sent and the result says so.
 */
export async function sendSms(input: SmsSendInput): Promise<SmsSendResult> {
  const issue = getSmsConfigurationIssue();
  if (issue) {
    return { ok: false, error: issue };
  }

  const to = digitsOnly(input.to);
  if (to.length < 7 || to.length > 15) {
    return {
      ok: false,
      error: `Recipient phone "${input.to.slice(0, 20)}" does not look like a valid number — message not sent.`,
    };
  }
  const message = input.message.trim();
  if (!message) {
    return { ok: false, error: "Empty message — nothing to send." };
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Message exceeds ${MAX_MESSAGE_CHARS} characters (${message.length}) — not sent.`,
    };
  }

  const sender = env("SMS_SENDER_ID");
  let payload: Record<string, unknown>;
  try {
    const res = await fetch(env("SMS_API_URL"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env("SMS_API_KEY")}`,
      },
      body: JSON.stringify({
        ...(sender ? { sender } : {}),
        to: input.to.trim(),
        message,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      let detail = `SMS gateway responded with status ${res.status}`;
      try {
        const body = (await res.json()) as {
          message?: string;
          error?: string | { message?: string };
        };
        const text =
          typeof body.error === "string"
            ? body.error
            : (body.error?.message ?? body.message);
        if (text) detail = `SMS gateway error: ${text}`;
      } catch {
        // Non-JSON error body — the status line is enough.
      }
      return { ok: false, error: sanitizeError(detail) };
    }

    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null; // 2xx with a non-JSON body — treat as success without id.
    }
    return { ok: true, providerMessageId: extractMessageId(parsed) };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "network error contacting the SMS gateway";
    return { ok: false, error: sanitizeError(`SMS gateway unreachable: ${reason}`) };
  }
}
