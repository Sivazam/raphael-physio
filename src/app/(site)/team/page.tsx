import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  GraduationCap,
  HandHeart,
  Languages,
  Phone,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CtaBand } from "@/components/site/cta-band";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseJsonArray } from "@/lib/content";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Team",
  description:
    "Meet the physiotherapists behind Raphael Physiotherapy & Rehabilitation Centre, Rajamahendravaram — individual profiles are being prepared with the clinic's team.",
  alternates: { canonical: "/team" },
  openGraph: {
    title: "Our Team",
    description:
      "The physiotherapists behind Raphael Physiotherapy & Rehabilitation Centre — profiles are published only once approved by the clinic.",
  },
};

async function getTherapists() {
  return db.therapist
    .findMany({
      where: { status: "published" },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => []);
}

export default async function TeamPage() {
  const [therapists, settings] = await Promise.all([
    getTherapists(),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        kicker="Our team"
        title="The people behind your rehabilitation"
        lede="Rehabilitation is personal work — it deserves to be done by people you know by name. This page introduces the physiotherapists at the centre, properly and only with their approval."
      />

      {therapists.length > 0 ? (
        /* ------------------------------------------------ therapist grid */
        <section
          aria-labelledby="therapists-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="therapists-heading"
                kicker="Therapists"
                title="Meet the team"
                lede="Every programme at the centre is guided by its physiotherapists — here's who you'll meet."
              />
            </Reveal>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {therapists.map((therapist, i) => {
                const expertise = parseJsonArray<string>(therapist.expertise);
                const languages = parseJsonArray<string>(therapist.languages);
                return (
                  <li key={therapist.id}>
                    <Reveal delay={i * 0.06} variant="blur" className="h-full">
                      <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10">
                      {therapist.photoUrl && (
                        <div className="relative overflow-hidden">
                          <Image
                            src={therapist.photoUrl}
                            alt={`Portrait of ${therapist.name}, ${therapist.title ?? "physiotherapist"} at ${SITE.name}.`}
                            width={560}
                            height={700}
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                            className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <h3 className="text-xl font-semibold tracking-tight">
                          {therapist.name}
                        </h3>
                        {therapist.title && (
                          <p className="mt-1 text-sm font-medium text-clay-deep">
                            {therapist.title}
                          </p>
                        )}
                        {therapist.qualifications && (
                          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                            <GraduationCap
                              className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep"
                              aria-hidden="true"
                            />
                            {therapist.qualifications}
                          </p>
                        )}
                        {therapist.bio && (
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {therapist.bio}
                          </p>
                        )}
                        {expertise.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {expertise.map((area) => (
                              <Badge
                                key={area}
                                variant="secondary"
                                className="font-normal"
                              >
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {languages.length > 0 && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Languages
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Speaks {languages.join(", ")}
                          </p>
                        )}
                        <div className="mt-auto pt-5">
                          <Link
                            href="/book"
                            className="btn btn-gold h-11 w-full text-[12px]"
                          >
                            <span className="btn-sweep" aria-hidden="true" />
                            <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                            Book an appointment
                          </Link>
                        </div>
                      </div>
                      </article>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : (
        /* --------------------------------------------- honest empty state */
        <>
          <section
            aria-labelledby="team-pending-heading"
            className="bg-paper py-20 sm:py-28"
          >
            <div className="site-container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <Reveal>
                  <h2
                    id="team-pending-heading"
                    className="display-fluid-2 max-w-xl font-semibold tracking-tight text-foreground"
                  >
                    Detailed profiles are being prepared —{" "}
                    <em className="font-display font-medium italic text-clay-deep">
                      the care is already here.
                    </em>
                  </h2>
                  <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Individual profiles — names, qualifications, photographs,
                    and areas of expertise — are being prepared with the
                    clinic&apos;s team and will appear on this page once each
                    one is approved. We would rather introduce people properly
                    than fill this page with placeholders.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3.5">
                    <a
                      href={`tel:${settings.phonePrimary}`}
                      className="btn btn-outline h-11 text-[12px]"
                    >
                      <span className="btn-sweep" aria-hidden="true" />
                      <Phone className="relative h-4 w-4" aria-hidden="true" />
                      Ask about our team
                    </a>
                    <Link href="/book" className="btn btn-gold h-11 text-[12px]">
                      <span className="btn-sweep" aria-hidden="true" />
                      <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                      Meet us at a first visit
                    </Link>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Or call {settings.phonePrimaryDisplay} — the team itself
                    will answer your questions.
                  </p>
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
                      src="/images/photo-team-therapy.jpg"
                      alt="Illustrative photo: two Indian physiotherapists reviewing a patient recovery chart together in a bright rehabilitation clinic."
                      width={864}
                      height={1152}
                      sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 90vw"
                      className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Illustrative photography — clinic-supplied photographs of
                    the team will replace it before launch.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          <section
            aria-labelledby="team-expect-heading"
            className="py-20 sm:py-28"
          >
            <div className="site-container">
              <Reveal>
                <SectionHeading
                  id="team-expect-heading"
                  kicker="In the meantime"
                  title="What you can count on today"
                />
              </Reveal>
              <ul className="mt-12 grid gap-6 md:grid-cols-3">
                {[
                  {
                    icon: Stethoscope,
                    title: "Physiotherapist-guided care",
                    text: "Every programme at the centre is guided by its physiotherapists — assessed first, structured around you, and reviewed as you progress.",
                  },
                  {
                    icon: HandHeart,
                    title: "Family kept involved",
                    text: "For in-patient and day care rehabilitation, families are kept informed and involved in the plan — progress made in sessions continues at home.",
                  },
                  {
                    icon: Phone,
                    title: "One conversation away",
                    text: "The quickest way to know the team is to talk to them. Call with your questions, or meet them at a first appointment.",
                  },
                ].map((item, i) => (
                  <li key={item.title}>
                    <Reveal delay={i * 0.08} className="h-full">
                      <div className="flex h-full flex-col rounded-3xl border border-border/70 bg-card p-6">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-clay">
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 text-lg font-semibold tracking-tight">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <CtaBand
        title="The surest way to know a team: be cared for by it."
        body="Book a first visit and meet the physiotherapists who would guide your programme — or call with any question before you decide."
        extraLink={{ label: "About the centre", href: "/about" }}
        note="This sends an appointment request — our team confirms the slot by phone. Sunday bookings are unavailable."
      />
    </>
  );
}
