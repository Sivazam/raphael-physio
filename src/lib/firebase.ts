/**
 * Firebase client singletons — browser-side only.
 *
 * Imported exclusively from client components ("use client"): the admin
 * login form (email/password + Google sign-in), MediaField (direct-to-
 * Storage uploads), and the Firestore mirror helpers. Never import from
 * server code — the SDK touches browser APIs on import.
 *
 * Analytics is optional and failure-tolerant (unsupported environments,
 * blocked measurement, headless previews — all must stay silent).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from "firebase/firestore";

import { FIREBASE_CONFIG, firebaseConfigured } from "./firebase-config";

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}

/** Auth instance (email/password + Google provider). */
export function fbAuth(): Auth {
  return getAuth(app());
}

/** Storage instance — admin media uploads go here directly from the browser. */
export function fbStorage(): FirebaseStorage {
  return getStorage(app());
}

/** Firestore instance — media registry + entity mirrors. */
export function fbDb(): Firestore {
  return getFirestore(app());
}

/** Optional analytics — guarded, never throws, never blocks. */
export async function initFirebaseAnalytics(): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) getAnalytics(app());
  } catch {
    /* measurement is best-effort by design */
  }
}
