"use client";

/**
 * Firestore mirrors — a real-time-readable copy of the media-bearing CMS
 * records, written from the admin browser after each successful save.
 *
 * The SQLite database (Prisma) remains the public site's source of truth;
 * Firestore holds the operational registry the clinic asked for: every
 * media upload (the `media` collection) plus per-entity documents that pair
 * those links with the corresponding record (exercises/team/services/
 * stories). Mirroring is best-effort: failures are logged and never block
 * the CMS save.
 */

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firebaseConfigured } from "./firebase-config";
import { fbDb } from "./firebase";

export interface MediaRecord {
  url: string;
  path: string; // storage object path, e.g. "exercises/169…-x.jpg"
  folder: string; // exercises | team | services | stories
  kind: "image" | "video";
  contentType: string;
  sizeBytes: number;
  fileName: string;
  uploadedBy: string | null;
}

/** Log a completed upload into the `media` collection. */
export async function mirrorMediaUpload(rec: MediaRecord): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    await addDoc(collection(fbDb(), "media"), {
      ...rec,
      uploadedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn(
      "[firebase] media registry write skipped:",
      err instanceof Error ? err.message : err
    );
  }
}

/** Mirror (or update) an entity document that carries media links. */
export async function mirrorEntity(
  entity:
    | "exercises"
    | "team"
    | "services"
    | "stories",
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    await setDoc(
      doc(fbDb(), entity, id),
      { ...data, mirroredAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn(
      `[firebase] ${entity} mirror skipped:`,
      err instanceof Error ? err.message : err
    );
  }
}
