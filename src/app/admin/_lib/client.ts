/**
 * Client-side fetch helper for /api/admin mutations.
 * Throws an Error carrying the server's (safe, human) message — and
 * `fieldErrors` when the server flagged specific fields.
 */

interface ErrorWithFields extends Error {
  fieldErrors?: Record<string, string>;
}

interface ApiEnvelope {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Network problem — please check your connection and try again.");
  }

  let payload: ApiEnvelope | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload?.ok) {
    const err = new Error(
      payload?.error ?? "Something went wrong. Please try again."
    ) as ErrorWithFields;
    if (payload?.fieldErrors) err.fieldErrors = payload.fieldErrors;
    throw err;
  }
  return payload as T;
}
