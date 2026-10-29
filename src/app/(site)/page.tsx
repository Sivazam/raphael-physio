import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Bone,
  CalendarCheck,
  Dumbbell,
  Footprints,
  HeartPulse,
  MapPin,
  MoveVertical,
  PersonStanding,
  Phone,
  Sun,
  Clock,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Hero } from "@/components/site/hero";
import { MarqueeBand } from "@/components/site/marquee";
import { ServicesIndex } from "@/components/site/services-index";
import { Pathway } from "@/components/site/pathway";
import { db } from "@/lib/db";
import { getOperatingHours, getSettings } from "@/lib/settings";
import { DAY_NAMES_SHORT, formatTime12h } from "@/lib/content";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE.name} — In-Patient & Day Care, Rajamahendravaram`,
  },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  "neck-upper-back": MoveVertical,
  shoulder: Dumbbell,
  "lower-back-core": HeartPulse,
  "hip-glutes": PersonStanding,
  knee: Bone,
  "ankle-foot": Footprints,
};

async function getHomeData() {
  const [services, exercises] = await Promise.all([
    db.service
      .findMany({
        where: { status: "published" },
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { name: true, slug: true } } },
      })
      .catch(() => []),
    db.exercise
      .findMany({
        where: { status: "published", featured: true },
        orderBy: { sortOrder: "asc" },
        take: 6,
        include: { category: { select: { name: true, slug: true } } },
      })
      .catch(() => []),
  ]);
  return { services, exercises };
}

export default async function HomePage() {
  const [settings, hours, { services, exercises }] = await Promise.all([
    getSettings(),
    getOperatingHours(),
    getHomeData(),
  ]);

  const openDays = hours.filter((h) => h.isOpen);
  const hoursOneLine =
    openDays.length > 0
      ? `${DAY_NAMES_SHORT[openDays[0].dayOfWeek]}–${
          DAY_NAMES_SHORT[openDays[openDays.length - 1].dayOfWeek]
        }, ${openDays[0].sessions
          .map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`)
          .join(" & ")}`
      : "Call for current hours";

  const indexServices = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    summary: s.summary,
    imageUrl: s.imageUrl,
    categoryName: s.category?.name ?? null,
  }));

  const exerciseCount = await db.exercise
    .count({ where: { status: "published" } })
    .catch(() => exercises.length);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    medicalSpecialty: "https://schema.org/PhysicalTherapy",
    name: SITE.name,
    telephone: settings.phonePrimary,
    url: SITE.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${settings.address.line1}, ${
        settings.address.line2 ?? ""
      }${settings.address.line3 ? `, ${settings.address.line3}` : ""}`,
      addressLocality: settings.address.city,
      addressRegion: settings.address.state ?? undefined,
      postalCode: settings.address.postcode ?? undefined,
      addressCountry: "IN",
    },
    // Opening hours, ratings and reviews intentionally omitted until verified
    // and/or the authorized Google integration is configured.
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------------------------------------------------- 1. Hero */}
      <Hero
        phoneDisplay={settings.phonePrimaryDisplay}
        phoneHref={`tel:${settings.phonePrimary}`}
        hoursLine={hoursOneLine}
      />

      {/* -------------------------------------------- 2. Gold marquee band */}
      <MarqueeBand
        items={[
          "In-patient & day care",
          "Neurological rehabilitation",
          "Post-surgical recovery",
          "Sports injury rehabilitation",
          "Orthopaedic physiotherapy",
          "Back & neck care",
          "Mission To Make Man Moving",
        ]}
      />

      {/* ----------------------------------------------- 3. Manifesto */}
      <section aria-labelledby="manifesto-heading" className="bg-paper py-20 sm:py-28 lg:py-32">
        <div className="site-container">
          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            <div>
              <Reveal>
                <p className="kicker flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-clay-deep/60"
                  />
                  A centre, not just a clinic
                </p>
                <h2
                  id="manifesto-heading"
                  className="display-fluid-1 mt-5 font-semibold tracking-tight"
                >
                  Rehabilitation with{" "}
                  <em className="font-display font-medium italic text-clay-deep">
                    room to recover
                  </em>
                  .
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="drop-cap mt-8 max-w-2xl text-lg leading-[1.75] text-foreground/85 sm:text-xl">
                  Raphael Physiotherapy &amp; Rehabilitation Centre exists for
                  the stretch of recovery that happens between hospital and
                  home. Some people stay with us; others come for scheduled
                  sessions through the day and sleep in their own beds. Both
                  formats share one therapy floor, one standard of care, and a
                  simple measure of success — people back to their own lives.
                </p>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Which format fits is a clinical decision, made with the
                  patient and family. Call us to discuss a specific situation.
                </p>
              </Reveal>

              {/* honest index strip — counts of real, published things */}
              <Reveal delay={0.2}>
                <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-4">
                  {[
                    {
                      n: String(services.length).padStart(2, "0"),
                      label: "Care programmes",
                    },
                    {
                      n: String(exerciseCount).padStart(2, "0"),
                      label: "Guided exercises",
                    },
                    {
                      n: String(openDays.length).padStart(2, "0"),
                      label: "Days a week",
                    },
                    { n: "02", label: "Care formats" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card p-5 sm:p-6">
                      <dt className="sr-only">{stat.label}</dt>
                      <dd>
                        <span className="font-display text-5xl font-semibold tracking-tight text-clay-deep sm:text-6xl">
                          {stat.n}
                        </span>
                        <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {stat.label}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            {/* offset editorial photo pair */}
            <div className="relative grid gap-6 sm:grid-cols-2 lg:block">
              <Reveal variant="blur" className="lg:w-[78%]">
                <figure className="group overflow-hidden rounded-3xl border border-border/60 shadow-xl shadow-primary/10">
                  <Image
                    src="/images/photo-inpatient-room.jpg"
                    alt="Illustrative image: a calm Indian clinic patient room prepared for in-patient rehabilitation, with a walking frame beside the bed."
                    width={672}
                    height={504}
                    sizes="(min-width: 1024px) 32vw, (min-width: 640px) 45vw, 90vw"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                  />
                  <figcaption className="bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
                    Calm rooms, close to the therapy floor
                  </figcaption>
                </figure>
              </Reveal>
              <Reveal
                variant="blur"
                delay={0.15}
                className="lg:absolute lg:-bottom-14 lg:right-0 lg:w-[56%]"
              >
                <figure className="group overflow-hidden rounded-3xl border border-border/60 shadow-xl shadow-primary/15 lg:rotate-2">
                  <Image
                    src="/images/photo-gait-training.jpg"
                    alt="Illustrative photo: an Indian therapist supporting an elderly Indian patient practising walking between parallel bars."
                    width={672}
                    height={504}
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
                    className="aspect-square w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                  />
                  <figcaption className="bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
                    Supported gait practice
                  </figcaption>
                </figure>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- 4. Services index */}
      <section aria-labelledby="services-heading" className="py-20 sm:py-28">
        <div className="site-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <SectionHeading
                id="services-heading"
                kicker="What we do"
                title="Clinical care, organised around you"
                lede="Assessment first, then a structured plan — manual therapy, graded exercise, and clear guidance for home."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Link
                href="/services"
                className="btn btn-outline h-11 text-[12px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                All services
                <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mt-10 sm:mt-14">
            <ServicesIndex services={indexServices} />
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Programme pages describe each service honestly — suitability is
              always decided at assessment, never promised in advance.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------- 5. Pathway (dark) */}
      <section aria-labelledby="pathway-heading" className="bg-ink py-20 text-primary-foreground sm:py-28 lg:py-32">
        <div className="site-container grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              id="pathway-heading"
              tone="dark"
              scale="display"
              kicker="How care works"
              title="Four steps, one direction"
              lede="Every programme — in-patient or day care — follows the same honest shape. No shortcuts, no surprise stages."
            />
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book" className="btn btn-gold h-12 text-[12px]">
                  <span className="btn-sweep" aria-hidden="true" />
                  Start with an assessment
                  <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/about"
                  className="btn btn-ghost-ivory h-12 text-[12px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  About the centre
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="pt-2 lg:pt-8">
            <Pathway />
          </div>
        </div>
      </section>

      {/* ------------------------------------- 6. In-patient & day care split */}
      <section aria-labelledby="formats-heading" className="py-20 sm:py-28">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              id="formats-heading"
              kicker="Two formats"
              title="Stay with us, or come for the day"
              lede="Two complementary formats, one team, one therapy floor."
            />
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                n: "01",
                icon: BedDouble,
                title: "In-patient stays",
                text: "For people who need daily supported rehabilitation after surgery, stroke, or injury — structured days, monitored progression, and planned discharge home.",
                img: "/images/photo-treatment-room.jpg",
                alt: "Illustrative photo: a treatment area prepared for supervised in-patient rehabilitation.",
                href: "/services/inpatient-daycare-rehabilitation",
                cta: "About the programme",
              },
              {
                n: "02",
                icon: Sun,
                title: "Day care programmes",
                text: "For those stable at home but needing regular, intensive input — attend scheduled sessions through the day, return home in the evening.",
                img: "/images/photo-manual-therapy.jpg",
                alt: "Illustrative photo: hands-on physiotherapy treatment during a day care session.",
                href: "/services/inpatient-daycare-rehabilitation",
                cta: "About the programme",
              },
            ].map((card, i) => (
              <Reveal key={card.n} delay={i * 0.12} variant="blur">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card via-card to-gold-soft/40 shadow-sm transition-shadow duration-500 hover:shadow-xl hover:shadow-primary/10">
                  <div className="relative h-56 overflow-hidden sm:h-64">
                    <Image
                      src={card.img}
                      alt={card.alt}
                      fill
                      sizes="(min-width: 1024px) 42vw, 90vw"
                      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent"
                    />
                    <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3.5 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur">
                      Format {card.n}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <h3 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                      <card.icon className="h-7 w-7 text-clay-deep" aria-hidden="true" />
                      {card.title}
                    </h3>
                    <p className="mt-3 flex-1 text-base leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                    <Link
                      href={card.href}
                      className="link-sweep mt-6 inline-flex items-center gap-2 text-sm font-bold text-clay-deep"
                    >
                      {card.cta}
                      <ArrowUpRight
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- 7. Exercise library rail */}
      <section aria-labelledby="exercises-heading" className="overflow-hidden bg-paper py-20 sm:py-28">
        <div className="site-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <SectionHeading
                id="exercises-heading"
                kicker="Exercise library"
                title="Guidance you can take home"
                lede="Therapist-reviewed educational exercises with clear steps, precautions, and shareable pages for family members."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Link
                href="/exercises"
                className="btn btn-outline h-11 text-[12px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                Browse the library
                <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>

        {/* horizontal rail — native scroll, Lenis-safe via data-lenis-prevent */}
        <Reveal delay={0.15} className="mt-10 sm:mt-14">
          <div
            data-lenis-prevent
            className="scroll-warm flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-10 xl:px-[max(2.5rem,calc((100vw-72rem)/2))]"
          >
            {exercises.map((exercise) => {
              const Icon =
                (exercise.category && CATEGORY_ICONS[exercise.category.slug]) ||
                Activity;
              return (
                <Link
                  key={exercise.id}
                  href={`/exercises/${exercise.slug}`}
                  className="group flex w-[16.5rem] shrink-0 snap-start flex-col rounded-3xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 sm:w-[17.5rem]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-clay/35 bg-gold-soft/60 text-clay-deep transition-colors duration-300 group-hover:border-clay group-hover:bg-clay group-hover:text-primary">
                      <Icon className="h-5.5 w-5.5" aria-hidden="true" />
                    </span>
                    <ArrowUpRight
                      className="h-5 w-5 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-clay-deep"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold leading-snug tracking-tight">
                    {exercise.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {exercise.summary.slice(0, 96)}
                    {exercise.summary.length > 96 ? "…" : ""}
                  </p>
                  {exercise.category && (
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-clay-deep">
                      {exercise.category.name}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </Reveal>
        <div className="site-container">
          <Reveal delay={0.2}>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              These pages are general educational references — not
              prescriptions. Repetitions and suitability are always set by your
              therapist for your condition.
            </p>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------- 8. Reviews (honest, dark) */}
      <section aria-labelledby="reviews-heading" className="bg-ink py-20 text-primary-foreground sm:py-28 lg:py-32">
        <div className="site-container text-center">
          <Reveal>
            <p
              aria-hidden="true"
              className="font-display text-[7rem] leading-[0.4] text-clay/40 sm:text-[9rem]"
            >
              &ldquo;
            </p>
            <p className="kicker mt-6 justify-center text-center text-clay">
              Patient feedback
            </p>
            <h2
              id="reviews-heading"
              className="display-fluid-1 mx-auto mt-5 max-w-3xl font-semibold tracking-tight"
            >
              Our patients review us publicly,{" "}
              <em className="font-display font-medium italic text-clay">
                on Google
              </em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
              We keep this space honest — the clinic&apos;s Google listing is
              where real patients share real experiences. Read them where they
              were written.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href={settings.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold h-[54px] text-[13px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                Read our Google reviews
                <ArrowUpRight className="relative h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/reviews"
                className="btn btn-ghost-ivory h-[54px] text-[13px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                About our reviews page
              </Link>
            </div>
            <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-primary-foreground/55">
              A live review feed appears here once the clinic&apos;s authorized
              Google integration is connected — never fabricated placeholders.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------ 9. Visit CTA band */}
      <section aria-labelledby="visit-heading" className="relative overflow-hidden bg-primary py-20 text-primary-foreground sm:py-28 lg:py-32">
        {/* ghost motto watermark */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 select-none font-display text-[9rem] font-semibold italic leading-none tracking-tighter text-primary-foreground/[0.045] xl:block"
        >
          Moving
        </p>
        <div className="site-container relative">
          <Reveal>
            <p className="kicker flex items-center gap-3 text-clay">
              <span aria-hidden="true" className="inline-block h-px w-8 bg-clay/70" />
              Visit the centre
            </p>
            <h2
              id="visit-heading"
              className="display-fluid-1 mt-5 max-w-3xl font-semibold tracking-tight"
            >
              Come see where{" "}
              <em className="font-display font-medium italic text-clay">
                recovery lives
              </em>
              .
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-10 border-t border-primary-foreground/15 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <Reveal delay={0.05}>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
                    Address
                  </p>
                  <address className="mt-1.5 text-sm font-medium not-italic leading-relaxed text-primary-foreground/90">
                    {settings.address.line1}
                    <br />
                    {settings.address.line2}
                    <br />
                    {settings.address.city}
                    {settings.address.state ? `, ${settings.address.state}` : ""}{" "}
                    {settings.address.postcode}
                  </address>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
                    Hours
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-primary-foreground/90">
                    {hoursOneLine}
                    <br />
                    <span className="text-primary-foreground/65">
                      Sundays closed · holidays may differ
                    </span>
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
                    Speak to us
                  </p>
                  <a
                    href={`tel:${settings.phonePrimary}`}
                    className="link-sweep mt-1.5 block text-sm font-semibold leading-relaxed text-primary-foreground"
                  >
                    {settings.phonePrimaryDisplay}
                    {settings.phoneAlternateDisplay && (
                      <span className="block font-normal text-primary-foreground/80">
                        {settings.phoneAlternateDisplay}
                      </span>
                    )}
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex h-full flex-col justify-between gap-5 sm:col-span-2 lg:col-span-1">
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-sweep inline-flex items-center gap-2 text-sm font-bold text-clay"
                >
                  Get directions
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link href="/book" className="btn btn-gold h-[54px] w-full text-[13px]">
                  <span className="btn-sweep" aria-hidden="true" />
                  <CalendarCheck className="relative h-[18px] w-[18px]" aria-hidden="true" />
                  Book an appointment
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <p className="mt-8 text-xs text-primary-foreground/55">
              Send an appointment request online — our team confirms the slot by
              phone. Sundays are not available for booking; requests roll to
              the next working day.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
