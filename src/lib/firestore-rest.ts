/**
 * Firestore REST client — server-side (and bun-script) access to the clinic's
 * Firebase project WITHOUT the Admin SDK or a service account.
 *
 * Why this exists: the clinic's Firebase project runs in test mode (open
 * security rules — the owner's explicit choice while the site is young), so
 * plain HTTPS calls with the project's public web config can read and write
 * documents directly. That is exactly what the serverless deployment needs:
 * Vercel has no SQLite database (the .env + db file are git-ignored by
 * design), so every DB-bound feature — admin sign-in, the dashboard, booking
 * and contact submissions — falls back to this client when Prisma is
 * unreachable. @/lib/store decides which path runs; this file is just the
 * wire protocol.
 *
 * Kept free of Next.js imports on purpose: prisma/../scripts also import it
 * through plain relative paths (bun honours tsconfig paths either way).
 *
 * REST shape notes (learned the hard way):
 * - integers are transmitted as STRINGS (" integerValue": "42"),
 * - listing an empty / never-created collection returns `{}` (not an error),
 * - a missing document is a JSON 404 (not the HTML error page),
 * - partial updates need explicit `updateMask.fieldPaths` query params.
 */

import { FIREBASE_CONFIG, firebaseConfigured } from "./firebase-config";

const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)`;

const TIMEOUT_MS = 10_000;

/** Kill-switch for the server-side Firestore fallback (env-only). */
export const firestoreFallbackEnabled =
  firebaseConfigured &&
  process.env.FIRESTORE_SERVER_FALLBACK !== "disabled";

export class FirestoreRestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`[firestore-rest] ${status}: ${message}`);
    this.status = status;
    this.name = "FirestoreRestError";
  }
}

/* ------------------------------------------------------------ value codecs */

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

type FsFields = Record<string, FsValue>;

export interface FsDoc<T = Record<string, unknown>> {
  id: string;
  data: T;
}

function encodeValue(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value as object) } };
  }
  // Functions, symbols, undefined-in-array… — store as null rather than throw.
  return { nullValue: null };
}

function encodeFields(obj: object): FsFields {
  const out: FsFields = {};
  for (const [k, v] of Object.entries(obj)) {
    // Prisma semantics: an undefined value in a partial update means "leave
    // the stored value untouched" — NOT null. Dropping the key here keeps
    // sparse PATCH payloads safe (a present null still encodes as nullValue).
    if (v === undefined) continue;
    out[k] = encodeValue(v);
  }
  return out;
}

function decodeValue(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  return null; // nullValue
}

function decodeFields(fields: FsFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

/* --------------------------------------------------------------- transport */

async function fsFetch(path: string, init?: RequestInit): Promise<unknown> {
  if (!firestoreFallbackEnabled) {
    throw new FirestoreRestError(503, "Firestore fallback disabled by env");
  }
  let res: Response;
  try {
    res = await fetch(`${BASE()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    throw new FirestoreRestError(
      502,
      err instanceof Error ? err.message : "network failure"
    );
  }
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String(
            (json as { error?: { message?: string } }).error?.message ?? ""
          )
        : `HTTP ${res.status}`;
    throw new FirestoreRestError(res.status, message);
  }
  return json;
}

/** "projects/p/d/(default)/documents/<coll>/<id>" → "<id>" */
function idFromName(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

function toDoc(raw: { name: string; fields?: FsFields }): FsDoc {
  return { id: idFromName(raw.name), data: decodeFields(raw.fields ?? {}) };
}

/* ------------------------------------------------------------------ public */

/** Lists a whole collection (page-token loop; clinic collections are tiny). */
export async function fsList(collection: string): Promise<FsDoc[]> {
  const docs: FsDoc[] = [];
  let pageToken = "";
  for (;;) {
    const params = new URLSearchParams({ pageSize: "500" });
    if (pageToken) params.set("pageToken", pageToken);
    const json = (await fsFetch(
      `/documents/${collection}?${params.toString()}`
    )) as { documents?: Array<{ name: string; fields?: FsFields }> } | null;
    for (const raw of json?.documents ?? []) docs.push(toDoc(raw));
    if (!json?.documents?.length) break; // `{}` when collection is empty
    const next = (json as { nextPageToken?: string }).nextPageToken;
    if (!next) break; // single page — clinic collections never exceed 500
    pageToken = next;
  }
  return docs;
}

/* ---------------------------------------------------------- structured query
 * Enough Firestore SQL for the clinic's needs: AND-ed EQUAL / NOT_EQUAL
 * filters (e.g. appointments WHERE appointmentDate == "2026-10-30"), run
 * through the :runQuery RPC. Everything else (sorting, take) happens in JS
 * on the returned page — collections are small.
 */

export interface FsFilter {
  field: string;
  op: "EQUAL" | "NOT_EQUAL";
  value: string | number | boolean;
}

function encodeFilterValue(value: string | number | boolean): FsValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  return { booleanValue: value };
}

/** Documents matching ALL filters (AND). Empty array on no matches. */
export async function fsQuery(
  collection: string,
  filters: FsFilter[],
  limit = 500
): Promise<FsDoc[]> {
  if (filters.length === 0) return fsList(collection);
  const fieldFilters = filters.map((f) => ({
    fieldFilter: {
      field: { fieldPath: f.field },
      op: f.op,
      value: encodeFilterValue(f.value),
    },
  }));
  const where =
    fieldFilters.length === 1
      ? fieldFilters[0]
      : { compositeFilter: { op: "AND", filters: fieldFilters } };
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection, allDescendants: false }],
      where,
      limit,
    },
  };
  const json = (await fsFetch("/documents:runQuery", {
    method: "POST",
    body: JSON.stringify(body),
  })) as unknown;
  const items = Array.isArray(json) ? json : [];
  const docs: FsDoc[] = [];
  for (const item of items) {
    const raw = (item as { document?: { name: string; fields?: FsFields } })
      .document;
    if (raw?.name) docs.push(toDoc(raw));
  }
  return docs;
}

/** One document, or null when it does not exist. */
export async function fsGet(
  collection: string,
  id: string
): Promise<FsDoc | null> {
  try {
    const json = (await fsFetch(`/documents/${collection}/${id}`)) as {
      name: string;
      fields?: FsFields;
    };
    return toDoc(json);
  } catch (err) {
    if (err instanceof FirestoreRestError && err.status === 404) return null;
    throw err;
  }
}

/** Creates a document with a server-assigned id. */
export async function fsCreate(
  collection: string,
  fields: Record<string, unknown>
): Promise<FsDoc> {
  const json = (await fsFetch(`/documents/${collection}`, {
    method: "POST",
    body: JSON.stringify({ fields: encodeFields(fields) }),
  })) as { name: string; fields?: FsFields };
  return toDoc(json);
}

/**
 * Creates a document with a caller-chosen id — ATOMICALLY: fails with 409 if
 * a document already exists (`?currentDocument.exists=false`).
 */
export async function fsCreateWithId(
  collection: string,
  id: string,
  fields: Record<string, unknown>
): Promise<FsDoc> {
  const params = new URLSearchParams({ "currentDocument.exists": "false" });
  const json = (await fsFetch(
    `/documents/${collection}/${id}?${params.toString()}`,
    { method: "PATCH", body: JSON.stringify({ fields: encodeFields(fields) }) }
  )) as { name: string; fields?: FsFields };
  return toDoc(json);
}

/** Overwrites/creates the given fields on a document (explicit full mask). */
export async function fsSet(
  collection: string,
  id: string,
  fields: Record<string, unknown>
): Promise<FsDoc> {
  const present = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(present).length === 0) {
    throw new FirestoreRestError(400, "fsSet called with no fields");
  }
  const params = new URLSearchParams();
  for (const key of Object.keys(present)) {
    params.append("updateMask.fieldPaths", key);
  }
  const json = (await fsFetch(
    `/documents/${collection}/${id}?${params.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields: encodeFields(present) }),
    }
  )) as { name: string; fields?: FsFields };
  return toDoc(json);
}

/** Updates ONLY the given fields (masked partial update). */
export async function fsUpdate(
  collection: string,
  id: string,
  fields: Record<string, unknown>
): Promise<FsDoc> {
  if (Object.keys(fields).length === 0) {
    throw new FirestoreRestError(400, "fsUpdate called with no fields");
  }
  return fsSet(collection, id, fields);
}

/** Deletes a document. Returns false when it did not exist. */
export async function fsDelete(
  collection: string,
  id: string
): Promise<boolean> {
  try {
    await fsFetch(`/documents/${collection}/${id}`, { method: "DELETE" });
    return true;
  } catch (err) {
    if (err instanceof FirestoreRestError && err.status === 404) return false;
    throw err;
  }
}
