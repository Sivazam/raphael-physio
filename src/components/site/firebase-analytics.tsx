"use client";

import { useEffect } from "react";
import { firebaseConfigured } from "@/lib/firebase-config";
import { initFirebaseAnalytics } from "@/lib/firebase";

/**
 * Initialises Firebase Analytics on the public site when supported.
 * Silent everywhere else — measurement must never affect rendering,
 * block hydration, or throw in headless previews.
 */
export function FirebaseAnalytics() {
  useEffect(() => {
    if (firebaseConfigured) void initFirebaseAnalytics();
  }, []);
  return null;
}
