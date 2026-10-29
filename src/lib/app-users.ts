/**
 * Clinic app users — the Firestore `users` collection behind the access gate.
 *
 * WHY THIS EXISTS: staff sign in with their own Firebase account (Google or
 * email/password). Authentication alone must not equal clinic access — the
 * owner approves each person. So every successful Firebase sign-in resolves
 * to one document in `users` (doc id = lower-cased email) carrying:
 *
 *   - appAccess: false → the account exists but is awaiting approval; the
 *     holder sees the waiting screen, never the dashboard;
 *   - appAccess: true  → the holder sees the dashboard (from the next
 *     page load / refresh — the gate re-reads the document server-side on
 *     every request, so flipping the flag is enough, no redeploy).
 *
 * Clinic ADMINS (AdminUser rows, the env allowlist, Firestore `admins` docs,
 * BAKED_ADMINS) never pass through this gate — their tiers are checked
 * before this collection is consulted, and they always have access.
 *
 * This collection lives ONLY in Firestore (it is the registry of Firebase
 * accounts, which exist independently of the local SQLite database), so it
 * is reached through the REST client directly — never through the dual-path
 * store. On a deployment where Firestore cannot be reached, sign-in fails
 * honestly (502) rather than guessing access.
 */

import {
  fsCreateWithId,
  fsGet,
  fsList,
  fsSet,
  type FsDoc,
} from "@/lib/firestore-rest";

export interface AppUserRecord {
  /** Firestore doc id — the lower-cased email. */
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  /** Firebase provider id: "google.com" | "password". */
  provider: string | null;
  /** The access gate. False until the clinic owner approves the account. */
  appAccess: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asNullableDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function docToAppUser(doc: FsDoc): AppUserRecord {
  const d = doc.data;
  return {
    id: doc.id,
    email: typeof d.email === "string" && d.email ? d.email : doc.id,
    displayName: asNullableString(d.displayName),
    photoUrl: asNullableString(d.photoUrl),
    provider: asNullableString(d.provider),
    appAccess: d.appAccess === true,
    createdAt: asNullableDate(d.createdAt),
    lastLoginAt: asNullableDate(d.lastLoginAt),
  };
}

/** All registered app users, newest first. Throws on Firestore failure. */
export async function listAppUsers(): Promise<AppUserRecord[]> {
  const docs = await fsList("users");
  return docs
    .map(docToAppUser)
    .sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
}

/**
 * One user record, or null when the email has never signed in.
 * Null (not a thrown error) also when the collection does not exist yet.
 * Throws only when Firestore itself cannot be reached.
 */
export async function getAppUserRecord(
  email: string
): Promise<AppUserRecord | null> {
  const doc = await fsGet("users", email.trim().toLowerCase());
  return doc ? docToAppUser(doc) : null;
}

/**
 * The sign-in side effect: guarantee the `users` document exists (created
 * with appAccess=false — a new account is awaiting approval by definition)
 * and stamp the login. Returns the resulting record.
 *
 * - creation is ATOMIC (fsCreateWithId 409s on a concurrent duplicate), so
 *   two first sign-ins racing each other cannot mint two documents;
 * - `lastLoginAt` (and a first-seen display name / photo) are best-effort
 *   updates — a failed stamp must never fail the sign-in itself;
 * - displayName/photoUrl only fill EMPTY fields: once the owner or the user
 *   has a name recorded, later sign-ins do not clobber it.
 */
export async function ensureAppUser(input: {
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  provider?: string | null;
}): Promise<AppUserRecord> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName?.trim() || null;
  const photoUrl = input.photoUrl?.trim() || null;
  const provider = input.provider ?? null;

  const existing = await getAppUserRecord(email);
  if (existing) {
    try {
      await fsSet("users", email, {
        lastLoginAt: new Date(),
        provider,
        ...(displayName && !existing.displayName
          ? { displayName }
          : {}),
        ...(photoUrl && !existing.photoUrl ? { photoUrl } : {}),
      });
    } catch {
      /* best-effort stamp — access decisions never depend on it */
    }
    return { ...existing, provider, lastLoginAt: new Date() };
  }

  try {
    const doc = await fsCreateWithId("users", email, {
      email,
      displayName,
      photoUrl,
      provider,
      appAccess: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
    return docToAppUser(doc);
  } catch (err) {
    // 409 ALREADY_EXISTS: a concurrent first sign-in created the document
    // between our read and write — read it back and stamp it.
    const raced = await getAppUserRecord(email);
    if (raced) {
      try {
        await fsSet("users", email, { lastLoginAt: new Date(), provider });
      } catch {
        /* best-effort */
      }
      return { ...raced, provider, lastLoginAt: new Date() };
    }
    throw err;
  }
}

/**
 * The approval toggle (owner action from the Access page or the Firebase
 * console). Returns the updated record. Throws when Firestore fails or the
 * user has never signed in (nothing to approve).
 */
export async function setAppUserAccess(
  email: string,
  appAccess: boolean
): Promise<AppUserRecord> {
  const key = email.trim().toLowerCase();
  const existing = await getAppUserRecord(key);
  if (!existing) {
    throw new Error("That account has not signed in yet — nothing to approve.");
  }
  await fsSet("users", key, {
    appAccess,
    updatedAt: new Date(),
  });
  return { ...existing, appAccess };
}
