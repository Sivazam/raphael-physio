import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicReview } from "@/lib/google-reviews";

/**
 * Server-rendered review display parts for /reviews.
 * No client JavaScript — stars are pure CSS overlays with text alternatives.
 *
 * HONESTY: every one of these components renders only data handed to it
 * (cached rows from the Google integration). They are never fed invented
 * ratings, authors or text, and the unconfigured page state uses none of
 * them — no star glyphs appear anywhere on the page until real data does.
 */

interface StarRatingProps {
  /** 0–5, supports halves. Derived from cached ratings only. */
  value: number;
  /** Included in the accessible label when provided. */
  count?: number;
  /** e.g. "Rated 4 out of 5" vs "Average rating 4.6 out of 5". */
  labelPrefix?: string;
  /** "light" (default) for paper/card surfaces, "dark" for ink sections. */
  tone?: "light" | "dark";
  className?: string;
}

/** Accessible star display: grey track + gold overlay clipped to the value. */
export function StarRating({
  value,
  count,
  labelPrefix = "Rating",
  tone = "light",
  className,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;
  const label =
    count === undefined
      ? `${labelPrefix} ${clamped} out of 5`
      : `${labelPrefix} ${clamped} out of 5, based on ${count} ${
          count === 1 ? "review" : "reviews"
        }`;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("relative inline-flex shrink-0", className)}
    >
      <span
        className={cn(
          "flex gap-0.5",
          tone === "dark" ? "text-primary-foreground/25" : "text-muted-foreground/50",
        )}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="h-4 w-4" strokeWidth={1.75} />
        ))}
      </span>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      >
        <span
          className={cn(
            "flex gap-0.5",
            tone === "dark" ? "text-clay" : "text-clay-deep",
          )}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-4 w-4 fill-current" strokeWidth={1.75} />
          ))}
        </span>
      </span>
    </span>
  );
}

interface ReviewCardProps {
  review: PublicReview;
  /** Link to the clinic's Google listing ("Read on Google"). */
  listingUrl: string;
  /** Clinic-local date formatting for undated reviews. */
  formatDate: (iso: string) => string;
}

/** One cached Google review, exactly as synced. */
export function ReviewCard({ review, listingUrl, formatDate }: ReviewCardProps) {
  const author = review.author ?? "Google user";
  const initial = author.trim().charAt(0).toUpperCase() || "G";
  const when = review.relativeTime ?? (review.postedAt ? formatDate(review.postedAt) : null);

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 transition-colors duration-300 hover:border-clay/60">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-semibold text-clay"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {author}
          </p>
          {when && (
            <p className="text-xs text-muted-foreground">{when}</p>
          )}
        </div>
        <StarRating value={review.rating} labelPrefix="Rated" />
      </div>
      {review.text && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {review.text}
        </p>
      )}
      {!review.text && (
        <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">
          This review was posted without written text.
        </p>
      )}
      <div className="mt-4 border-t border-border/60 pt-3 text-right">
        <a
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-sweep text-xs font-bold text-clay-deep"
        >
          Read on Google
        </a>
      </div>
    </article>
  );
}

interface GoogleAttributionProps {
  listingUrl: string;
  /** Total reviews Google reports, when a sync recorded it. */
  googleTotalReviews: number | null;
}

/**
 * Google attribution + limitations note. Required whenever Google review
 * content is displayed: the source is named, and the fact that the API
 * returns only a recent window (not the complete history) is stated plainly.
 */
export function GoogleAttribution({
  listingUrl,
  googleTotalReviews,
}: GoogleAttributionProps) {
  return (
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
      Reviews and ratings are sourced from{" "}
      <a
        href={listingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="link-sweep font-bold text-clay-deep"
      >
        the clinic&apos;s Google listing
      </a>{" "}
      and shown exactly as Google returns them — never edited, selected or
      rewritten by the clinic.{" "}
      {googleTotalReviews
        ? `Google reports ${googleTotalReviews} total ${
            googleTotalReviews === 1 ? "review" : "reviews"
          } for this listing — this page shows the most recent synced window, not the complete history.`
        : "Google's API shares only a small number of recent reviews — this page shows the most recent synced window, not the clinic's complete review history."}{" "}
      Read every review on Google via the link above.
    </p>
  );
}
