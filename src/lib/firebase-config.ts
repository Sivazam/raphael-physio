/**
 * Firebase web configuration — shared by the client SDK singletons
 * (`@/lib/firebase`) and the server-side ID-token verifier
 * (`/api/admin/auth/firebase`).
 *
 * These values come from the clinic's Firebase console (Web app config).
 * A Firebase web config is PUBLIC BY DESIGN — Google's docs are explicit
 * that the apiKey identifies the project, it is not a secret, and access
 * is controlled by Firebase Security Rules + authorized domains.
 *
 * Values can be overridden per-environment with NEXT_PUBLIC_FIREBASE_*
 * env vars (useful for staging projects) without touching this file.
 */
export const FIREBASE_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyDdEF_XGPR5BFs06x9J0OMTDCYrzJ6fENE",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "raphaelphysiocenter.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "raphaelphysiocenter",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "raphaelphysiocenter.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "305844084784",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:305844084784:web:d335b1acff37116ecacdf5",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-FT3L8SW6XF",
} as const;

/** True when a Firebase project is wired up (apiKey present). */
export const firebaseConfigured = Boolean(FIREBASE_CONFIG.apiKey);

/**
 * Extra admin allowlist for Firebase sign-ins (comma-separated emails), for
 * Google accounts that should reach the CMS without a matching AdminUser row.
 * Firebase sign-in alone is NEVER enough — the email must match an AdminUser
 * or be listed here; otherwise the session is refused server-side.
 */
export function firebaseAllowlistEmails(): string[] {
  const raw = process.env.ADMIN_FIREBASE_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
