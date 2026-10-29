import type { Metadata } from "next";
import Image from "next/image";
import { Flag, Phone, Quote, ShieldCheck, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CtaBand } from "@/components/site/cta-band";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseJsonArray, type MilestoneItem } from "@/lib/content";

export const metadata: Metadata = {
  title: "Patient Stories",
  description:
    "Patient recovery stories from Raphael Physiotherapy & Rehabilitation Centre, published only with each patient's written consent — privacy first, always.",
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Patient Stories",
    description:
      "Recovery stories published only with written patient consent — privacy first, always.",
  },
};

async function getStories() {
  return db.patientStory
    .findMany({
      where: { status: "published", consentStatus: "approved" },
      orderBy: { updatedAt: "desc" },
      include: {
        therapist: { select: { name: true, title: true } },
      },
    })
    .catch(() => []);
}

function excerpt(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

export default async function StoriesPage() {
  const [stories, settings] = await Promise.all([getStories(), getSettings()]);
  const reviewsUrl = settings.googleReviewsUrl ?? settings.mapsUrl;

  return (
    <>
      <PageHeader
        kicker="Patient stories"
        title="Recovery stories, told with permission"
        lede="A recovery story is the most honest signal a rehabilitation centre can offer — which is why every story on this page begins with the patient's written consent, not our enthusiasm."
      />

      {stories.length > 0 ? (
        /* ------------------------------------------------- published stories */
        <section
          aria-labelledby="stories-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="stories-heading"
                kicker="Shared journeys"
                title="In their own words"
              />
            </Reveal>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
              {stories.map((story, i) => {
                const milestones = parseJsonArray<MilestoneItem>(
                  story.milestones
                );
                return (
                  <Reveal key={story.id} delay={(i % 2) * 0.08} as="li">
                    <article className="flex h-full flex-col rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
                      {story.conditionContext && (
                        <p className="kicker flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="inline-block h-px w-8 bg-clay-deep/60"
                          />
                          {story.conditionContext}
                        </p>
                      )}
                      <h3 className="mt-3 text-xl font-semibold tracking-tight">
                        {story.title}
                      </h3>
                      {story.journey && (
                        <blockquote className="mt-4 border-l-2 border-clay/60 pl-4 font-display text-lg italic leading-relaxed text-foreground/90">
                          “{excerpt(story.journey)}”
                        </blockquote>
                      )}
                      {(story.beforeImageUrl || story.afterImageUrl) && (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          {story.beforeImageUrl && (
                            <figure>
                              <Image
                                src={story.beforeImageUrl}
                                alt={`Before: the start of the journey described in “${story.title}”.`}
                                width={480}
                                height={360}
                                sizes="(min-width: 640px) 22vw, 45vw"
                                className="aspect-[4/3] w-full rounded-2xl border border-border/70 object-cover"
                              />
                              <figcaption className="mt-1.5 text-xs text-muted-foreground">
                                Before
                              </figcaption>
                            </figure>
                          )}
                          {story.afterImageUrl && (
                            <figure>
                              <Image
                                src={story.afterImageUrl}
                                alt={`After: a later point in the journey described in “${story.title}”.`}
                                width={480}
                                height={360}
                                sizes="(min-width: 640px) 22vw, 45vw"
                                className="aspect-[4/3] w-full rounded-2xl border border-border/70 object-cover"
                              />
                              <figcaption className="mt-1.5 text-xs text-muted-foreground">
                                After
                              </figcaption>
                            </figure>
                          )}
                        </div>
                      )}
                      {milestones.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {milestones.map((milestone) => (
                            <Badge
                              key={milestone.label}
                              variant="secondary"
                              className="font-normal"
                            >
                              {milestone.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <footer className="mt-auto border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-clay-deep"
                            aria-hidden="true"
                          />
                          Shared with the patient&apos;s written permission.
                        </p>
                        {story.therapist && (
                          <p className="mt-1.5">
                            Guided by {story.therapist.name}
                            {story.therapist.title
                              ? `, ${story.therapist.title}`
                              : ""}
                            .
                          </p>
                        )}
                      </footer>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>
      ) : (
        /* --------------------------------------------- honest empty state */
        <>
          <section
            aria-labelledby="stories-pending-heading"
            className="bg-paper py-20 sm:py-28"
          >
            <div className="site-container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <Reveal>
                  <h2
                    id="stories-pending-heading"
                    className="display-fluid-2 max-w-xl font-semibold tracking-tight text-foreground"
                  >
                    No stories published yet —{" "}
                    <em className="font-display font-medium italic text-clay-deep">
                      for a reason we stand by.
                    </em>
                  </h2>
                  <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    A story appears on this page only when the patient has
                    given written consent for its publication — the account,
                    the milestones, and any photographs included. Until that
                    consent is on file, nothing is shown, however encouraging
                    the recovery.
                  </p>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                    Real patient experiences do exist — patients share them
                    publicly on the clinic&apos;s Google listing, in their own
                    words, under their own names.
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
                        <Star className="relative h-[18px] w-[18px]" aria-hidden="true" />
                        Read our Google reviews
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
              </div>

              <Reveal delay={0.12} variant="blur" className="relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <div
                    aria-hidden="true"
                    className="absolute -left-4 -top-4 h-full w-full rounded-3xl border-2 border-clay/50"
                  />
                  <div className="group relative overflow-hidden rounded-3xl">
                    <Image
                      src="/images/photo-care-strength.jpg"
                      alt="Illustrative photo: an Indian physiotherapist helping an elderly Indian woman in a saree practise a shoulder exercise with light dumbbells."
                      width={1024}
                      height={1024}
                      sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 90vw"
                      className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Illustrative photography — consented patient photographs
                    will replace it as stories are approved.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          <section
            aria-labelledby="story-shape-heading"
            className="py-20 sm:py-28"
          >
            <div className="site-container">
              <Reveal>
                <SectionHeading
                  id="story-shape-heading"
                  kicker="When they arrive"
                  title="What every story here will carry"
                  lede="Each story follows the same consent-first shape, so nothing on this page is ever more than it claims to be."
                />
              </Reveal>
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: Quote,
                    title: "The journey, in their words",
                    text: "A short account of the rehabilitation journey, approved by the patient before publication.",
                  },
                  {
                    icon: Tag,
                    title: "The rehabilitation context",
                    text: "The condition or programme involved, described with the patient's approval — never identifiable medical detail.",
                  },
                  {
                    icon: Flag,
                    title: "Documented milestones",
                    text: "Milestones shown were recorded along the way, not inferred afterwards from photographs.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "A visible consent note",
                    text: "Every story carries a note that it is published with the patient's written permission.",
                  },
                ].map((item, i) => (
                  <Reveal key={item.title} delay={i * 0.06} as="li">
                    <div className="flex h-full flex-col">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-clay">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <CtaBand
        title="Until the stories are written, start yours."
        body="If you are considering rehabilitation at the centre, the first step is a conversation and an assessment — from there, the plan is drawn up around you."
        extraLink={
          reviewsUrl
            ? {
                label: "Read patient feedback on Google",
                href: reviewsUrl,
                external: true,
              }
            : undefined
        }
        note="This sends an appointment request — our team confirms the slot by phone. Sunday bookings are unavailable."
      />
    </>
  );
}
