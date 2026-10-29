import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Media uploads for the admin CMS.
 *
 * PRIMARY driver — Firebase Storage (server-side, via firebase-admin):
 *   Configure in .env:
 *     FIREBASE_STORAGE_BUCKET   = "<project>.appspot.com"  (bucket name only)
 *     FIREBASE_SERVICE_ACCOUNT_KEY = { …service-account JSON… }
 *       — either the raw JSON on ONE line, or base64 of it.
 *       (Alternatively the three discrete vars: FIREBASE_PROJECT_ID,
 *        FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY with \n escapes.)
 *   Files are uploaded to `uploads/<folder>/…` inside the bucket and made
 *   public, so the returned URL is a permanent direct link.
 *
 * FALLBACK driver — local disk: when Firebase is not configured, files are
 * written to `public/uploads/…` and served from the same origin. This keeps
 * the CMS fully usable in development; production should configure Firebase
 * (local files do not survive redeploys on most hosts).
 *
 * The active driver is reported honestly to callers so the admin UI can say
 * where a file went.
 */

export type UploadKind = "image" | "video";

export const UPLOAD_LIMITS: Record<UploadKind, { bytes: number; label: string }> = {
  image: { bytes: 10 * 1024 * 1024, label: "10 MB" },
  video: { bytes: 64 * 1024 * 1024, label: "64 MB" },
};

export const UPLOAD_MIME_ALLOWLIST: Record<UploadKind, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
    "video/ogg",
  ],
};

/** Folder allowlist — matches the collections that own media fields. */
export const UPLOAD_FOLDERS = ["exercises", "team", "services", "stories"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/ogg": "ogv",
};

export interface UploadInput {
  buffer: Buffer;
  contentType: string;
  kind: UploadKind;
  folder: UploadFolder;
}

export interface UploadResult {
  url: string; // absolute (firebase) or site-relative (local) direct link
  driver: "firebase" | "local";
  fileName: string;
}

/* ------------------------------------------------------------------ *
 * Firebase driver
 * ------------------------------------------------------------------ */

function readFirebaseConfig(): {
  bucket: string;
  credentials: { projectId: string; clientEmail: string; privateKey: string };
} | null {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) return null;

  const single = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (single) {
    try {
      const json = single.startsWith("{")
        ? single
        : Buffer.from(single, "base64").toString("utf8");
      const parsed = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          bucket,
          credentials: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          },
        };
      }
    } catch {
      // fall through to discrete vars
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return {
      bucket,
      credentials: {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      },
    };
  }
  return null;
}

type FirebaseStorageClient = import("firebase-admin/storage").Storage;
type FirebaseBucket = ReturnType<FirebaseStorageClient["bucket"]>;
type FirebaseApp = import("firebase-admin/app").App;

let firebaseApp: FirebaseApp | null = null;

async function getBucket(): Promise<FirebaseBucket> {
  if (!firebaseApp) {
    const config = readFirebaseConfig();
    if (!config) throw new Error("Firebase Storage is not configured.");
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    firebaseApp = getApps().length
      ? getApps()[0]!
      : initializeApp({
          credential: cert(config.credentials),
          storageBucket: config.bucket,
        });
  }
  const { getStorage } = await import("firebase-admin/storage");
  return getStorage(firebaseApp).bucket();
}

/** True when Firebase Storage credentials are present in the environment. */
export function isFirebaseConfigured(): boolean {
  return readFirebaseConfig() !== null;
}

async function uploadToFirebase(
  input: UploadInput,
  fileName: string,
): Promise<UploadResult> {
  const bucket = await getBucket();
  const objectPath = `uploads/${input.folder}/${fileName}`;

  const file = bucket.file(objectPath);
  await file.save(input.buffer, {
    contentType: input.contentType,
    resumable: false,
    public: true,
  });
  // `public: true` in save() options applies the acl on write for most
  // buckets; makePublic() is belt-and-braces for uniform-ACL buckets.
  try {
    await file.makePublic();
  } catch {
    // Buckets with uniform bucket-level access reject per-object ACL calls
    // when the bucket is already public — not an error for us.
  }

  return {
    url: `https://storage.googleapis.com/${bucket.name}/${objectPath}`,
    driver: "firebase",
    fileName,
  };
}

/* ------------------------------------------------------------------ *
 * Local-disk fallback driver
 * ------------------------------------------------------------------ */

async function uploadToLocal(
  input: UploadInput,
  fileName: string,
): Promise<UploadResult> {
  const dir = path.join(process.cwd(), "public", "uploads", input.folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), input.buffer);
  return {
    url: `/uploads/${input.folder}/${fileName}`,
    driver: "local",
    fileName,
  };
}

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

function safeFileName(contentType: string): string {
  const ext = EXT_BY_MIME[contentType] ?? "bin";
  return `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
}

export async function uploadMedia(input: UploadInput): Promise<UploadResult> {
  const fileName = safeFileName(input.contentType);
  if (isFirebaseConfigured()) {
    try {
      return await uploadToFirebase(input, fileName);
    } catch (err) {
      // A misconfigured project must never silently become "local" —
      // surface the real error so the operator fixes Firebase.
      throw new Error(
        `Firebase Storage upload failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return uploadToLocal(input, fileName);
}
