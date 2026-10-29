import { NextResponse } from "next/server";
import {
  getReviewSnapshot,
  maybeSyncIfStale,
} from "@/lib/google-reviews";

/**
 * GET /api/reviews — serve the DB-cached Google reviews to the reviews page
 * (and any future consumer, e.g. the homepage review section).
 *
 * Honesty contract:
 * - The response is built ONLY from cached DB rows. Nothing is fabricated,
 *   and no rating/count fields exist unless real synced data backs them.
 * - When the integration is not configured, `configured` is `false` and the
 *   payload contains no rating, no reviews and no counts — by design.
 * - API keys and raw provider errors are never exposed. The snapshot only
 *   carries a coarse lastSyncStatus.
 *
 * Caching:
 * - Configured + healthy: `public, max-age=300, stale-while-revalidate=600`.
 *   The data is already a DB cache on a ≥1h refresh schedule, so a short
 *   shared cache is safe and keeps Google-side load at zero.
 * - Unconfigured: `no-store` — the moment credentials are added, clients
 *   must immediately see the new state, not a stale "false".
 *
 * A background re-sync is triggered (never awaited) only when the cache is
 * stale AND the integration is configured. Page renders never block on it.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getReviewSnapshot();

  if (snapshot.cacheError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Reviews are temporarily unavailable. Please try again shortly.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Non-blocking refresh when stale and configured. Errors are recorded in
  // ReviewSyncState by the sync itself; they never leak into this response.
  void maybeSyncIfStale().catch(() => {});

  const body = {
    ok: true,
    /** Google credentials present in the environment? */
    configured: snapshot.configured,
    /** Which integration last wrote the cache. */
    source: snapshot.source,
    /**
     * Average of the cached (recent) reviews and how many are cached —
     * NOT Google's official overall rating. Consumers must label it as such.
     */
    rating: snapshot.rating,
    /** Total reviews Google reports for the listing, when a sync recorded it. */
    googleTotalReviews: snapshot.googleTotalReviews,
    reviews: snapshot.reviews,
    /** ISO timestamp of the last SUCCESSFUL sync. */
    lastSyncedAt: snapshot.lastSyncedAt,
    lastSyncStatus: snapshot.lastSyncStatus,
  };

  const cacheControl = snapshot.configured
    ? "public, max-age=300, stale-while-revalidate=600"
    : "no-store";

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": cacheControl },
  });
}
