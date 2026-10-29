import { db } from "@/lib/db";

/**
 * Google reviews integration — SERVER-ONLY module.
 *
 * IMPORTANT (honesty policy): this module must never fabricate review data.
 * Ratings, review counts and review text appear on the website ONLY when they
 * have been retrieved from Google through an authorized API integration and
 * cached in the `GoogleReview` table. When the integration is not configured,
 * every public surface renders an explicit "not connected yet" state.
 *
 * NOTE: the `server-only` package is not installed in this project, so this
 * module cannot enforce it at build time. It imports Prisma and reads
 * environment secrets — import it ONLY from route handlers or server
 * components, never from a client component.
 *
 * ---------------------------------------------------------------------------
 * ENVIRONMENT VARIABLES (documented here + in the worklog; `.env.example`
 * belongs to agent G):
 *
 *   GOOGLE_PLACES_API_KEY                   API key with Places API (New)
 *                                           enabled and billing active.
 *   GOOGLE_PLACE_ID                         The clinic's Place ID (from Google
 *                                           Places or the Google Business
 *                                           Profile "share" link).
 *   GOOGLE_REVIEWS_SYNC_INTERVAL_HOURS      Optional. Hours between automatic
 *                                           re-syncs. Default 6, clamped to
 *                                           1–168. The /reviews page always
 *                                           renders from the DB cache, so a
 *                                           sync never blocks a page render.
 *
 * With both GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID set, reviews are synced
 * from the Google Places API (New) Place Details endpoint using the field mask
 * `rating,userRatingCount,reviews`.
 *
 * LIMITATIONS THAT MUST BE COMMUNICATED ON THE PAGE (not hidden):
 * - The Places API returns only a small, recent window of reviews (typically
 *   up to 5). The `userRatingCount` field reports the clinic's TOTAL review
 *   count on Google; the cached review rows are only the most recent ones.
 *   The UI must never imply the cached rows are the complete review history.
 * - The rating shown is computed from the cached (recent) reviews, and is
 *   labelled as such. Google's own overall place rating is returned by the
 *   API but there is no DB column for it (see worklog note to the
 *   orchestrator: consider `ratingValue`/`ratingCount` columns on
 *   ReviewSyncState to cache and display Google's official aggregate).
 * - The Google Business Profile API (preferred by the master plan for full
 *   review history) requires the clinic's own OAuth authorization; the
 *   Places adapter here is the secondary option. `ReviewSyncState.provider`
 *   records which integration last wrote the cache.
 * ---------------------------------------------------------------------------
 */

const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

const DEFAULT_SYNC_INTERVAL_HOURS = 6;
const SYNC_TIMEOUT_MS = 10_000;
/** Hard cap on how many cached rows the snapshot returns / JSON-LD uses. */
const MAX_RETURNED_REVIEWS = 50;

/** Environment variable names this module reads (for docs/admin surfaces). */
export const GOOGLE_REVIEWS_ENV_VARS = [
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_PLACE_ID",
  "GOOGLE_REVIEWS_SYNC_INTERVAL_HOURS",
] as const;

/* ------------------------------------------------------------------ types */

/** One cached review as exposed to pages / the public API. */
export interface PublicReview {
  id: string;
  author: string | null;
  rating: number;
  text: string | null;
  relativeTime: string | null;
  /** ISO string, null when Google did not return an absolute date. */
  postedAt: string | null;
}

/**
 * Everything the /reviews page and GET /api/reviews need.
 * Never contains API keys or raw provider error bodies.
 */
export interface ReviewSnapshot {
  /** Are Google credentials present in the environment? */
  configured: boolean;
  /** Which integration last wrote the cache ("places" | null). */
  source: "google_places" | null;
  reviews: PublicReview[];
  /**
   * Average of the CACHED reviews (the recent window Google serves). NOT
   * Google's official overall rating — the UI must label it accordingly.
   * count is always the number of cached reviews, never a hand-written number.
   */
  rating: { value: number; count: number } | null;
  /** Total reviews Google reports for the listing (userRatingCount), when known. */
  googleTotalReviews: number | null;
  /** ISO string of the last SUCCESSFUL sync, when one has happened. */
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  /** True when the DB itself could not be read (degraded state). */
  cacheError: boolean;
}

export type SyncStatus = "unconfigured" | "in_progress" | "success" | "error";

export interface SyncResult {
  status: SyncStatus;
  /** Number of review rows written (upserts). */
  stored: number;
  /** Secret-free, human-readable message. Present on "error" only. */
  error?: string;
}

/* ------------------------------------------------------- configuration */

export function isGoogleReviewsConfigured(): boolean {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  return Boolean(key && placeId);
}

function syncIntervalHours(): number {
  const raw = Number.parseInt(
    process.env.GOOGLE_REVIEWS_SYNC_INTERVAL_HOURS ?? "",
    10
  );
  if (!Number.isFinite(raw)) return DEFAULT_SYNC_INTERVAL_HOURS;
  return Math.min(168, Math.max(1, raw));
}

/** Removes any accidental secret from an error string before storing it. */
function sanitizeError(message: string): string {
  let safe = message;
  for (const secret of [
    process.env.GOOGLE_PLACES_API_KEY ?? "",
    process.env.GOOGLE_PLACE_ID ?? "",
  ]) {
    if (secret.trim().length >= 8) {
      safe = safe.split(secret).join("[redacted]");
    }
  }
  safe = safe.replace(/\s+/g, " ").trim();
  return safe.slice(0, 300);
}

/* ------------------------------------------------------------ Places API */

interface PlacesTextField {
  text?: string;
  languageCode?: string;
}

interface PlacesReview {
  /** Resource name — the trailing segment is the review id. */
  name?: string;
  rating?: number;
  text?: PlacesTextField;
  originalText?: PlacesTextField;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: {
    displayName?: string;
    photoUri?: string;
  };
}

interface PlacesPlaceDetails {
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
}

function reviewIdFromResourceName(name: string): string | null {
  const segments = name.split("/").filter(Boolean);
  const id = segments[segments.length - 1];
  return id && id.length > 0 ? id : null;
}

/** In-flight guard so overlapping requests never double-sync (single instance). */
let syncInFlight = false;

/**
 * Fetch reviews from the Google Places API (New) and upsert them into the
 * `GoogleReview` cache. Updates `ReviewSyncState` bookkeeping on every
 * attempt. Never throws — inspect `SyncResult.status`.
 */
export async function syncGoogleReviews(): Promise<SyncResult> {
  if (!isGoogleReviewsConfigured()) {
    return { status: "unconfigured", stored: 0 };
  }
  if (syncInFlight) {
    return { status: "in_progress", stored: 0 };
  }
  syncInFlight = true;
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY!.trim();
    const placeId = process.env.GOOGLE_PLACE_ID!.trim();

    let payload: PlacesPlaceDetails;
    try {
      const res = await fetch(
        `${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "rating,userRatingCount,reviews",
          },
          signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
          cache: "no-store",
        }
      );

      if (!res.ok) {
        let detail = `Google Places API responded with status ${res.status}`;
        try {
          const body = (await res.json()) as {
            error?: { message?: string };
          };
          if (body.error?.message) {
            detail = `Google Places API error: ${body.error.message}`;
          }
        } catch {
          // Non-JSON error body — the status line above is enough.
        }
        throw new Error(detail);
      }
      payload = (await res.json()) as PlacesPlaceDetails;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "network error contacting Google";
      await recordSyncError(sanitizeError(message));
      return { status: "error", stored: 0, error: sanitizeError(message) };
    }

    // Map the provider payload onto the GoogleReview model. Reviews without
    // a usable id or rating are skipped (never invented).
    const now = new Date();
    const rows = (payload.reviews ?? [])
      .map((r): Parameters<typeof db.googleReview.upsert>[0] | null => {
        const id = r.name ? reviewIdFromResourceName(r.name) : null;
        if (!id || typeof r.rating !== "number") return null;
        const postedAt = r.publishTime ? new Date(r.publishTime) : null;
        return {
          where: { id },
          create: {
            id,
            authorName: r.authorAttribution?.displayName ?? null,
            authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
            rating: Math.round(r.rating),
            text: r.text?.text ?? r.originalText?.text ?? null,
            relativeTime: r.relativePublishTimeDescription ?? null,
            postedAt:
              postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
            source: "google_places",
            syncedAt: now,
          },
          update: {
            authorName: r.authorAttribution?.displayName ?? null,
            authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
            rating: Math.round(r.rating),
            text: r.text?.text ?? r.originalText?.text ?? null,
            relativeTime: r.relativePublishTimeDescription ?? null,
            postedAt:
              postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
            source: "google_places",
            syncedAt: now,
          },
        };
      })
      .filter((u): u is Parameters<typeof db.googleReview.upsert>[0] =>
        Boolean(u)
      );

    try {
      await db.$transaction(rows.map((row) => db.googleReview.upsert(row)));

      // Bookkeeping: provider, last successful sync, Google-reported totals.
      // `lastSyncAt` keeps its previous value on error (it is the last
      // SUCCESSFUL sync). `reviewCount` stores Google's userRatingCount when
      // provided; otherwise the cached row count (recent window only).
      const totalFromGoogle =
        typeof payload.userRatingCount === "number" &&
        payload.userRatingCount >= 0
          ? payload.userRatingCount
          : undefined;

      await db.reviewSyncState.upsert({
        where: { id: "singleton" },
        update: {
          provider: "places",
          lastSyncAt: now,
          lastSyncStatus: "success",
          lastSyncError: null,
          ...(totalFromGoogle !== undefined
            ? { reviewCount: totalFromGoogle }
            : {}),
        },
        create: {
          id: "singleton",
          provider: "places",
          lastSyncAt: now,
          lastSyncStatus: "success",
          lastSyncError: null,
          reviewCount: totalFromGoogle ?? rows.length,
        },
      });

      return { status: "success", stored: rows.length };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "database write failed";
      const safe = sanitizeError(message);
      await recordSyncError(safe).catch(() => {});
      return { status: "error", stored: 0, error: safe };
    }
  } finally {
    syncInFlight = false;
  }
}

async function recordSyncError(message: string): Promise<void> {
  await db.reviewSyncState.upsert({
    where: { id: "singleton" },
    update: {
      provider: "places",
      lastSyncStatus: "error",
      lastSyncError: message,
    },
    create: {
      id: "singleton",
      provider: "places",
      lastSyncStatus: "error",
      lastSyncError: message,
      reviewCount: 0,
    },
  });
}

/* --------------------------------------------------------------- reading */

/**
 * Read the cached reviews + sync bookkeeping. NEVER throws and NEVER
 * contacts Google — the page renders from the DB alone. `cacheError: true`
 * signals a degraded read (callers decide how to present that honestly).
 */
export async function getReviewSnapshot(): Promise<ReviewSnapshot> {
  const configured = isGoogleReviewsConfigured();

  let rows: Awaited<ReturnType<typeof db.googleReview.findMany>> = [];
  let state: Awaited<ReturnType<typeof db.reviewSyncState.findUnique>> = null;
  let cacheError = false;
  try {
    [rows, state] = await Promise.all([
      db.googleReview.findMany(),
      db.reviewSyncState.findUnique({ where: { id: "singleton" } }),
    ]);
  } catch {
    cacheError = true;
  }

  // Newest first; undated reviews last (sorted by sync time as a fallback).
  const sorted = [...rows].sort((a, b) => {
    const at = a.postedAt?.getTime() ?? Number.NaN;
    const bt = b.postedAt?.getTime() ?? Number.NaN;
    if (!Number.isNaN(at) || !Number.isNaN(bt)) {
      if (Number.isNaN(at)) return 1;
      if (Number.isNaN(bt)) return -1;
      if (at !== bt) return bt - at;
    }
    return b.syncedAt.getTime() - a.syncedAt.getTime();
  });

  const reviews: PublicReview[] = sorted
    .slice(0, MAX_RETURNED_REVIEWS)
    .map((r) => ({
      id: r.id,
      author: r.authorName,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relativeTime,
      postedAt: r.postedAt ? r.postedAt.toISOString() : null,
    }));

  // Average of the cached reviews only — labelled as such downstream.
  let rating: { value: number; count: number } | null = null;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    rating = {
      value: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }

  const googleTotalReviews =
    state && state.reviewCount > 0 ? state.reviewCount : null;

  return {
    configured,
    source: state?.provider === "places" ? "google_places" : null,
    reviews,
    rating,
    googleTotalReviews,
    lastSyncedAt: state?.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    lastSyncStatus:
      state?.lastSyncStatus === "error" || state?.lastSyncStatus === "success"
        ? (state.lastSyncStatus as "error" | "success")
        : null,
    cacheError,
  };
}

/**
 * Fire a background re-sync when the cache is older than the configured
 * interval. Returns true when a sync was kicked off. Safe to call on every
 * request — cheap DB read + in-flight guard inside `syncGoogleReviews`.
 * The caller should NOT await the sync itself (pages never live-block).
 */
export async function maybeSyncIfStale(): Promise<boolean> {
  if (!isGoogleReviewsConfigured()) return false;
  try {
    const state = await db.reviewSyncState.findUnique({
      where: { id: "singleton" },
    });
    const lastMs = state?.lastSyncAt?.getTime() ?? 0;
    const ageMs = Date.now() - lastMs;
    if (ageMs < syncIntervalHours() * 60 * 60 * 1000) return false;
  } catch {
    // DB hiccup reading bookkeeping — better to attempt the sync than to
    // silently never refresh; the guard + error bookkeeping handle the rest.
  }
  void syncGoogleReviews().catch(() => {
    // syncGoogleReviews never throws; this is belt-and-braces.
  });
  return true;
}
