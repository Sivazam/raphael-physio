import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Link2,
  Phone,
  Quote,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaBand } from "@/components/site/cta-band";
import { getReviewSnapshot } from "@/lib/google-reviews";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import {
  GoogleAttribution,
  ReviewCard,
  StarRating,
} from "./_components/review-parts";

/**
 * /reviews — the Google reviews page.
 *
 * HONESTY CONTRACT (do not weaken):
 * - Every rating, count, review text, author name and date rendered in the
 *   "synced" state comes from the DB cache written by the authorized Google
 *   integration (`src/lib/google-reviews.ts`). Nothing here is hardcoded.
 * - While the integration is unconfigured (the current reality), the page
 *   renders NO star ratings, NO review counts, NO review cards — only the
 *   explanation, a link to the clinic's real Google listing, and how the
 *   automatic connection will work.
 * - JSON-LD Review markup is emitted ONLY when real cached reviews exist,
 *   and an aggregateRating is NEVER emitted: the synced window is a subset
 *   of Google's total reviews, so an aggregate computed from it would
 *   misrepresent the listing (see master plan §7/SEO guidance).
 */

export const metadata: Metadata = {
  title: "Google Reviews",
  description:
    "Authentic Google reviews for Raphael Physiotherapy & Rehabilitation Centre — retrieved automatically through an authorized Google integration, never hand-copied, edited or invented.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "Google Reviews",
    description:
      "Google reviews shown exactly as Google returns them — through an authorized integration, never fabricated.",
  },
};

/* ------------------------------------------------------------ formatting */

const DAY_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: SITE.timezone,
});
const SYNC_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SITE.timezone,
});

function formatDay(iso: string): string {
  try {
    return DAY_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatSyncTime(iso: string): string {
  try {
    return SYNC_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------- content */

const HOW_IT_WORKS_STEPS = [
  {
    icon: Link2,
    title: "Authorized connection",
    text: "The clinic grants this website's server read-only access to its Google reviews, using Google's official APIs and the clinic's own account. Nothing is scraped, and no API rule is bypassed.",
  },
  {
    icon: RefreshCw,
    title: "Automatic sync",
    text: "The server periodically fetches the reviews Google makes available and caches them in the website's database — rating, review text, author and date stored exactly as Google returns them.",
  },
  {
    icon: BadgeCheck,
    title: "Always current",
    text: "This page renders from that cache, never from a hand-typed number. New reviews appear on their own, and every figure shown traces back to Google.",
  },
] as const;

function HowItWorks({ connected }: { connected: boolean }) {
  return (
    <section aria-labelledby="how-heading" className="py-20 sm:py-28">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            id="how-heading"
            kicker={connected ? "How this page works" : "How it will work"}
            title="Three steps, zero manual edits"
            lede={
              connected
                ? "This page is wired to Google's authorized review API — here is exactly what happens between a patient posting a review and it appearing here."
                : "When the clinic activates the authorized connection, this is exactly what will happen between a patient posting a review and it appearing here."
            }
          />
        </Reveal>
        <ol className="mt-12 grid gap-8 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06} as="li">
              <div className="flex h-full flex-col border-t-2 border-clay/60 pt-5">
                <span className="flex items-center gap-3">
                  <span className="font-display text-3xl font-semibold text-clay-deep">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-clay">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ page */

export default async function ReviewsPage() {
  const [snapshot, settings] = await Promise.all([
    getReviewSnapshot(),
    getSettings(),
  ]);
  const reviewsUrl = settings.googleReviewsUrl ?? settings.mapsUrl;
  const hasReviews = snapshot.reviews.length > 0;

  const lede = hasReviews
    ? "Synchronized automatically from the clinic's Google listing — ratings, review texts and dates exactly as Google returns them."
    : snapshot.configured
      ? "The authorized Google connection is configured on this website — the first synchronization will populate this page automatically."
      : "This page exists to carry our Google reviews automatically — unedited, unfiltered, always current. Until the authorized connection is live, it carries something rarer: nothing at all.";

  return (
    <>
      {/* ------------------------------------------- espresso hero band */}
      <section className="relative overflow-hidden bg-ink text-primary-foreground">
        {/* gold glow + ghost quote glyph, like the homepage reviews band */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full opacity-[0.14]"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.82 0.11 90), transparent)",
          }}
        />
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 right-4 select-none font-display text-[11rem] font-semibold italic leading-none tracking-tighter text-clay/[0.07] sm:text-[13rem]"
        >
          &rdquo;
        </p>
        <div className="site-container relative pb-16 pt-12 text-center sm:pb-24 sm:pt-16">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-10">
              <ol className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
                <li>
                  <Link
                    href="/"
                    className="link-sweep hover:text-primary-foreground"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-primary-foreground/40" />
                </li>
                <li aria-current="page" className="text-clay">
                  Reviews
                </li>
              </ol>
            </nav>

            <p
              aria-hidden="true"
              className="font-display text-[7rem] leading-[0.4] text-clay/40 sm:text-[9rem]"
            >
              &ldquo;
            </p>
            <p className="kicker mt-6 justify-center text-center text-clay">
              Patient feedback
            </p>
            <h1 className="display-fluid-1 mx-auto mt-5 max-w-3xl font-semibold tracking-tight">
              What patients say{" "}
              <em className="font-display font-medium italic text-clay">
                on Google
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
              {lede}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {reviewsUrl && (
                <a
                  href={reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold h-[54px] text-[13px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  Read our reviews on Google
                  <ExternalLink className="relative h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <a
                href={`tel:${settings.phonePrimary}`}
                className="btn btn-ghost-ivory h-[54px] text-[13px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                {settings.phonePrimaryDisplay}
              </a>
            </div>
            {!hasReviews && !snapshot.configured && (
              <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-primary-foreground/55">
                A live review feed appears here once the clinic&apos;s
                authorized Google integration is connected — never fabricated
                placeholders.
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {hasReviews ? (
        /* ------------------------------------- synced reviews (real data) */
        <section
          aria-labelledby="google-reviews-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="google-reviews-heading"
                kicker="From Google"
                title="Reviews, as posted on Google"
              />
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
                {/* Rating summary — figures from the DB cache only */}
                <div className="flex h-fit flex-col rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
                  <p className="kicker flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-block h-px w-8 bg-clay-deep/60"
                    />
                    Currently synced
                  </p>

                  {snapshot.rating && (
                    <>
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="font-display text-5xl font-semibold tracking-tight">
                          {snapshot.rating.value}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          out of 5
                        </span>
                      </div>
                      <StarRating
                        className="mt-3"
                        value={snapshot.rating.value}
                        count={snapshot.rating.count}
                        labelPrefix="Average rating"
                      />
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Average of the {snapshot.rating.count}{" "}
                        {snapshot.rating.count === 1
                          ? "review"
                          : "reviews"}{" "}
                        synced below.{" "}
                        {snapshot.googleTotalReviews
                          ? `Google reports ${snapshot.googleTotalReviews} total ${
                              snapshot.googleTotalReviews === 1
                                ? "review"
                                : "reviews"
                            } for the clinic — the full history lives on Google.`
                          : "The full history lives on Google."}
                      </p>
                    </>
                  )}

                  {snapshot.lastSyncedAt && (
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      Last synchronized from Google:{" "}
                      {formatSyncTime(snapshot.lastSyncedAt)}.
                    </p>
                  )}
                  {snapshot.lastSyncStatus === "error" &&
                    snapshot.lastSyncedAt && (
                      <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-red"
                          aria-hidden="true"
                        />
                        The latest sync attempt did not succeed — the figures
                        above are from the last successful sync and may be
                        slightly out of date.
                      </p>
                    )}
                  {!snapshot.configured && (
                    <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-red"
                        aria-hidden="true"
                      />
                      The automatic Google connection is currently paused —
                      these reviews are the most recent successfully synced
                      and are not being refreshed.
                    </p>
                  )}

                  {reviewsUrl && (
                    <a
                      href={reviewsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline mt-6 h-11 text-[12px]"
                    >
                      <span className="btn-sweep" aria-hidden="true" />
                      Read all reviews on Google
                      <ExternalLink className="relative h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>

                {/* Scrollable review cards */}
                <div>
                  <ul
                    aria-label="Google reviews cached from the clinic's listing, newest first"
                    className="max-h-96 space-y-4 overflow-y-auto scroll-warm pr-2"
                  >
                    {snapshot.reviews.map((review) => (
                      <li key={review.id}>
                        <ReviewCard
                          review={review}
                          listingUrl={reviewsUrl ?? "#"}
                          formatDate={formatDay}
                        />
                      </li>
                    ))}
                  </ul>
                  <GoogleAttribution
                    listingUrl={reviewsUrl ?? "#"}
                    googleTotalReviews={snapshot.googleTotalReviews}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : snapshot.configured ? (
        /* ------------------------------ connected, awaiting the first sync */
        <section
          aria-labelledby="reviews-pending-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Reveal>
              <h2
                id="reviews-pending-heading"
                className="display-fluid-2 max-w-xl font-semibold tracking-tight text-foreground"
              >
                Connected —{" "}
                <em className="font-display font-medium italic text-clay-deep">
                  the first sync is on its way.
                </em>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                This website is now authorized to read the clinic&apos;s Google
                reviews. The server fetches them on a fixed schedule; the
                moment the first synchronization completes, the rating, the
                review count and the reviews themselves will appear on this
                page automatically.
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                You don&apos;t have to wait for us — every review is already
                public on Google right now.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                {reviewsUrl && (
                  <a
                    href={reviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-gold h-[54px] text-[13px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    Read our reviews on Google
                    <ExternalLink className="relative h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                <a
                  href={`tel:${settings.phonePrimary}`}
                  className="btn btn-outline h-[54px] text-[13px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                  {settings.phonePrimaryDisplay}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
                <p className="kicker flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-clay-deep/60"
                  />
                  Once synced, this page will show
                </p>
                <ul className="mt-5 space-y-4">
                  {[
                    "The clinic's rating and review count, exactly as Google reports them.",
                    "Recent review cards — author, stars, review text and date, as posted.",
                    "A clear note that these come from Google, with a link to the full listing.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <BadgeCheck
                        className="mt-0.5 h-5 w-5 shrink-0 text-clay-deep"
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        /* ------------------------------------- not configured (honest state) */
        <section
          aria-labelledby="reviews-not-connected-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Reveal>
              <h2
                id="reviews-not-connected-heading"
                className="display-fluid-2 max-w-xl font-semibold tracking-tight text-foreground"
              >
                No star ratings here yet —{" "}
                <em className="font-display font-medium italic text-clay-deep">
                  and none invented.
                </em>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Patients do review this centre on Google — in their own words,
                under their own names. Once the clinic connects this website
                to its Google profile through Google&apos;s authorized review
                API, those reviews will appear on this page by themselves: the
                rating, the count, every review text and date, refreshed on a
                schedule without anyone retyping a word.
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Until that authorized connection is made, you will not find a
                rating or a review count anywhere on this website. A number we
                cannot verify is not a number we will show.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-primary-foreground sm:p-8">
                {/* gold glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-32 h-[22rem] w-[22rem] rounded-full opacity-20"
                  style={{
                    background:
                      "radial-gradient(closest-side, oklch(0.76 0.125 90), transparent)",
                  }}
                />
                <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-clay">
                  Our review policy
                </p>
                <ul className="relative mt-6 space-y-5">
                  {[
                    {
                      icon: BadgeCheck,
                      title: "Numbers only from Google",
                      text: "Every rating and review count on this page will be retrieved directly from Google through an authorized API — never typed in by hand.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "No invented reviews",
                      text: "No review, reviewer name or rating is ever written by us. Until real ones sync, this page stays empty.",
                    },
                    {
                      icon: Quote,
                      title: "Shown as posted",
                      text: "Review text is displayed exactly as Google returns it — not edited, selected or rewritten to flatter the clinic.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <item.icon
                        className="mt-0.5 h-5 w-5 shrink-0 text-clay"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold tracking-tight">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-primary-foreground/80">
                          {item.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <HowItWorks connected={snapshot.configured || hasReviews} />

      <CtaBand
        title="Come and form your own opinion."
        body="Reviews tell you how others experienced their care. The surest way to judge a rehabilitation centre is to visit it — meet the team, see the space, and talk through what recovery would look like for you."
        extraLink={
          reviewsUrl
            ? {
                label: "Read our Google reviews",
                href: reviewsUrl,
                external: true,
              }
            : undefined
        }
        note="This sends an appointment request — our team confirms the slot by phone. Sunday bookings are unavailable."
      />

      {/*
        JSON-LD: a plain WebPage always; Review items ONLY when real cached
        reviews exist. aggregateRating is deliberately NEVER emitted — the
        synced window is a subset of Google's total reviews, so an aggregate
        computed from it would misrepresent the listing.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            hasReviews
              ? {
                  "@context": "https://schema.org",
                  "@graph": [
                    {
                      "@type": "WebPage",
                      name: "Google Reviews — Raphael Physiotherapy & Rehabilitation Centre",
                      url: `${SITE.url}/reviews`,
                    },
                    ...snapshot.reviews.map((review) => ({
                      "@type": "Review",
                      itemReviewed: {
                        "@type": "MedicalClinic",
                        name: SITE.name,
                        url: SITE.url,
                      },
                      author: {
                        "@type": "Person",
                        name: review.author ?? "Google user",
                      },
                      ...(review.postedAt
                        ? { datePublished: review.postedAt.slice(0, 10) }
                        : {}),
                      ...(review.text ? { reviewBody: review.text } : {}),
                      reviewRating: {
                        "@type": "Rating",
                        ratingValue: review.rating,
                        bestRating: 5,
                        worstRating: 1,
                      },
                    })),
                  ],
                }
              : {
                  "@context": "https://schema.org",
                  "@type": "WebPage",
                  name: "Google Reviews — Raphael Physiotherapy & Rehabilitation Centre",
                  url: `${SITE.url}/reviews`,
                }
          ),
        }}
      />
    </>
  );
}
