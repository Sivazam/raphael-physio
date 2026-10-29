import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  AlertTriangle,
  Armchair,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  Info,
  Phone,
  Repeat,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import {
  getExerciseBySlug,
  getRelatedExercises as getRelatedFromCatalog,
} from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import {
  formatPhoneDisplay,
  getCategoryIcon,
  splitInstructions,
  youtubeVideoId,
} from "../_lib/exercises";
import { ShareExercise } from "../_components/share-exercise";

interface ExercisePageProps {
  params: Promise<{ slug: string }>;
}

/** One published exercise with its category and related published services.
 * Database rows when present; the baked snapshot when the database is
 * unreachable (serverless deploys). Null = honest 404 on a working DB. */
const getExercise = cache(async (slug: string) => {
  return getExerciseBySlug(slug);
});

/** Up to three other published exercises in the same category. */
const getRelatedExercises = cache(async (categorySlug: string, excludeSlug: string) => {
  return getRelatedFromCatalog(categorySlug, excludeSlug);
});

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) {
    return { title: "Exercise not found" };
  }
  return {
    title: exercise.title,
    description: exercise.summary,
    alternates: { canonical: `/exercises/${exercise.slug}` },
    openGraph: {
      type: "article",
      title: `${exercise.title} — exercise guide`,
      description: exercise.summary,
      ...(exercise.imageUrl ? { images: [exercise.imageUrl] } : {}),
    },
  };
}

export default async function ExerciseDetailPage({ params }: ExercisePageProps) {
  const { slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) notFound();

  const [settings, relatedExercises] = await Promise.all([
    getSettings(),
    exercise.category
      ? getRelatedExercises(exercise.category.slug, exercise.slug)
      : Promise.resolve([]),
  ]);

  const steps = splitInstructions(exercise.instructions);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
          { "@type": "ListItem", position: 2, name: "Exercise library", item: `${SITE.url}/exercises` },
          ...(exercise.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: exercise.category.name,
                  item: `${SITE.url}/exercises?category=${exercise.category.slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: exercise.category ? 4 : 3,
            name: exercise.title,
            item: `${SITE.url}/exercises/${exercise.slug}`,
          },
        ],
      },
      {
        "@type": "HowTo",
        name: exercise.title,
        description: exercise.summary,
        ...(exercise.equipment
          ? { tool: [{ "@type": "HowToTool", name: exercise.equipment }] }
          : {}),
        ...(exercise.imageUrl ? { image: [exercise.imageUrl] } : {}),
        ...(youtubeVideoId(exercise.youtubeUrl)
          ? {
              video: {
                "@type": "VideoObject",
                name: `${exercise.title} — video demonstration`,
                description: exercise.summary,
                embedUrl: `https://www.youtube.com/embed/${youtubeVideoId(exercise.youtubeUrl)}`,
                thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId(exercise.youtubeUrl)}/hqdefault.jpg`,
              },
            }
          : {}),
        step: steps.map((text) => ({ "@type": "HowToStep", text })),
      },
    ],
  };

  // Page-scoped print rules: hide site chrome and interactive extras, widen the
  // container, keep steps and the disclaimer together, and force ink colours
  // for dark-mode sessions (browsers drop backgrounds but keep light text).
  const printCss = `
@page { margin: 14mm; }
@media print {
  header, footer { display: none !important; }
  * { opacity: 1 !important; transform: none !important; }
  .site-container { max-width: none !important; padding-left: 0 !important; padding-right: 0 !important; }
  .print-avoid-break { break-inside: avoid; }
  html.dark main, html.dark main * { color: #241f1c !important; border-color: #d8d1c5 !important; }
}
`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style media="print" dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* ----------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-paper">
        {/* quiet gold glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.82 0.11 90), transparent)",
          }}
        />
        <div className="site-container relative py-14 sm:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <li>
                  <Link href="/" className="link-sweep hover:text-foreground">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </li>
                <li>
                  <Link
                    href="/exercises"
                    className="link-sweep hover:text-foreground"
                  >
                    Exercise library
                  </Link>
                </li>
                {exercise.category && (
                  <>
                    <li aria-hidden="true">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </li>
                    <li>
                      <Link
                        href={`/exercises?category=${exercise.category.slug}`}
                        className="link-sweep hover:text-foreground"
                      >
                        {exercise.category.name}
                      </Link>
                    </li>
                  </>
                )}
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </li>
                <li aria-current="page" className="text-clay-deep">
                  {exercise.title}
                </li>
              </ol>
            </nav>

            <p className="kicker flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block h-px w-8 bg-clay-deep/60"
              />
              {exercise.category?.name ?? "General exercise"}
            </p>
            <h1 className="display-fluid-1 mt-5 max-w-3xl font-semibold tracking-tight text-foreground">
              {exercise.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {exercise.summary}
            </p>

            {(exercise.equipment || exercise.frequency) && (
              <ul className="mt-7 flex max-w-2xl flex-wrap gap-2.5" aria-label="Exercise details">
                {exercise.equipment && (
                  <li className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm leading-snug">
                    <Armchair className="h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                    <span>
                      <span className="text-muted-foreground">Equipment: </span>
                      {exercise.equipment}
                    </span>
                  </li>
                )}
                {exercise.frequency && (
                  <li className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm leading-snug">
                    <Repeat className="h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                    <span>
                      <span className="text-muted-foreground">Frequency: </span>
                      {exercise.frequency}
                    </span>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-8 border-t border-border/60 pt-6 print:hidden">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Send this page to family
              </p>
              <ShareExercise title={exercise.title} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------- main column + aside */}
      <section className="py-16 sm:py-24">
        <div className="site-container grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <div className="min-w-0">
            {/* --- demonstration media (managed from /admin) ----------------
                Priority: YouTube embed → uploaded video → image. If a video
                exists it leads; an image follows in a smaller frame. Videos
                are hidden in print (they print as empty boxes); images stay. */}
            {(youtubeVideoId(exercise.youtubeUrl) ||
              exercise.videoUrl ||
              exercise.imageUrl) && (
              <Reveal>
                <figure className="print-avoid-break">
                  {youtubeVideoId(exercise.youtubeUrl) ? (
                    <div className="relative">
                      <div
                        aria-hidden="true"
                        className="absolute -left-4 -top-4 hidden h-full w-full rounded-3xl border-2 border-clay/50 sm:block"
                      />
                      <div className="relative overflow-hidden rounded-3xl bg-ink shadow-xl shadow-primary/10 print:hidden">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId(
                            exercise.youtubeUrl,
                          )}?rel=0`}
                          title={`Video demonstration of ${exercise.title}`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="aspect-video w-full border-0"
                        />
                      </div>
                    </div>
                  ) : exercise.videoUrl ? (
                    <div className="relative">
                      <div
                        aria-hidden="true"
                        className="absolute -left-4 -top-4 hidden h-full w-full rounded-3xl border-2 border-clay/50 sm:block"
                      />
                      <video
                        controls
                        preload="metadata"
                        playsInline
                        className="relative aspect-video w-full rounded-3xl bg-ink shadow-xl shadow-primary/10 print:hidden"
                      >
                        <source src={exercise.videoUrl} />
                        Your browser can’t play embedded videos — the written
                        steps below cover the full exercise.
                      </video>
                    </div>
                  ) : null}

                  {exercise.imageUrl && (
                    <div
                      className={
                        youtubeVideoId(exercise.youtubeUrl) || exercise.videoUrl
                          ? "relative mt-8 max-w-xl"
                          : "relative"
                      }
                    >
                      {(youtubeVideoId(exercise.youtubeUrl) ||
                        exercise.videoUrl) && (
                        <div
                          aria-hidden="true"
                          className="absolute -left-3 -top-3 hidden h-full w-full rounded-3xl border-2 border-clay/40 sm:block"
                        />
                      )}
                      <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-primary/10">
                        <Image
                          src={exercise.imageUrl}
                          alt={`Illustrative photo demonstrating ${exercise.title.toLowerCase()}.`}
                          width={1200}
                          height={750}
                          sizes="(min-width: 1024px) 55vw, 92vw"
                          className="aspect-[16/10] w-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <figcaption className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <Info
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay-deep"
                      aria-hidden="true"
                    />
                    <span>
                      Illustrative demonstration media — shown for general
                      education, never as a personal prescription.
                      {exercise.attribution
                        ? ` Source: ${exercise.attribution}`
                        : ""}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            )}

            <div className={exercise.imageUrl || exercise.videoUrl || youtubeVideoId(exercise.youtubeUrl) ? "mt-14" : ""}>
              <Reveal>
                <SectionHeading
                  kicker="Purpose"
                  title="Why this exercise is taught"
                />
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/90">
                  {exercise.purpose ?? exercise.summary}
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.05}>
              <div className="mt-14">
                <SectionHeading
                  kicker="How to do it"
                  title="Step by step"
                  lede="Follow the steps in order, moving slowly and staying within a comfortable range."
                />
                <ol className="mt-8 list-none divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
                  {steps.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-4 px-5 py-5 sm:gap-6 sm:px-7 sm:py-6 print-avoid-break"
                    >
                      <span
                        aria-hidden="true"
                        className="w-8 shrink-0 font-display text-2xl font-semibold leading-snug tabular-nums text-clay-deep"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-base leading-relaxed text-foreground/90">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            {exercise.precautions && (
              <Reveal delay={0.05}>
                <div className="mt-12 rounded-3xl border-2 border-clay/60 bg-secondary/50 p-6 sm:p-7 print-avoid-break">
                  <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                    <AlertTriangle
                      className="h-5 w-5 shrink-0 text-brand-red"
                      aria-hidden="true"
                    />
                    Precautions
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-foreground/90">
                    {exercise.precautions}
                  </p>
                  <p className="mt-4 border-t border-clay/30 pt-4 text-sm leading-relaxed text-muted-foreground">
                    General safety: stop the exercise and tell your therapist if
                    pain increases, or if you feel dizziness, numbness, or
                    tingling. Never push through sharp pain.
                  </p>
                </div>
              </Reveal>
            )}

            {exercise.attribution && (
              <p className="mt-8 flex items-start gap-2.5 text-sm text-muted-foreground print-avoid-break">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                <span>{exercise.attribution}</span>
              </p>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start print:hidden">
            {exercise.services.length > 0 && (
              <Reveal delay={0.08}>
                <div className="rounded-3xl border border-border/70 bg-card p-5">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-clay-deep">
                    Related services
                  </h2>
                  <ul className="mt-3 space-y-1">
                    {exercise.services.map((service) => (
                      <li key={service.slug}>
                        <Link
                          href={`/services/${service.slug}`}
                          className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        >
                          {service.name}
                          <ArrowUpRight
                            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {relatedExercises.length > 0 && exercise.category && (
              <Reveal delay={0.12}>
                <div className="rounded-3xl border border-border/70 bg-card p-5">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-clay-deep">
                    More {exercise.category.name.toLowerCase()} exercises
                  </h2>
                  <ul className="mt-3 space-y-1">
                    {relatedExercises.map((related) => {
                      const RelatedIcon = getCategoryIcon(related.category?.slug);
                      return (
                        <li key={related.id}>
                          <Link
                            href={`/exercises/${related.slug}`}
                            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                              <RelatedIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-medium">
                              {related.title}
                            </span>
                            <ArrowUpRight
                              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <Link
                      href={`/exercises?category=${exercise.category.slug}`}
                      className="link-sweep hover:text-foreground"
                    >
                      View all {exercise.category.name.toLowerCase()} exercises
                    </Link>
                  </p>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.16}>
              <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-primary-foreground">
                {/* quiet gold glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-20"
                  style={{
                    background:
                      "radial-gradient(closest-side, oklch(0.76 0.125 90), transparent)",
                  }}
                />
                <h2 className="relative text-xs font-bold uppercase tracking-[0.18em] text-clay">
                  Not sure it suits you?
                </h2>
                <p className="relative mt-2 text-sm leading-relaxed text-primary-foreground/85">
                  Your therapist decides whether this exercise fits your
                  condition — call us before starting, or bring your questions to
                  an appointment.
                </p>
                <div className="relative mt-5 flex flex-col gap-2.5">
                  <a
                    href={`tel:${settings.phonePrimary}`}
                    className="btn btn-gold h-11 text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <Phone className="relative h-4 w-4" aria-hidden="true" />
                    {formatPhoneDisplay(settings.phonePrimaryDisplay)}
                  </a>
                  <Link
                    href="/book"
                    className="btn btn-ghost-ivory h-11 text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                    Request an appointment
                  </Link>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>

      {/* --------------------------------------------- disclaimer band */}
      <section
        aria-labelledby="exercise-disclaimer-heading"
        className="border-t border-border/60 bg-secondary/60 print-avoid-break"
      >
        <div className="site-container py-8 sm:py-10">
          <div className="flex max-w-3xl gap-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-clay-deep" aria-hidden="true" />
            <div>
              <h2
                id="exercise-disclaimer-heading"
                className="text-lg font-semibold tracking-tight"
              >
                General education, not a prescription
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                This page is general educational material for patients and their
                families — not an individual prescription. Your therapist at the
                centre sets repetitions, suitability, and progression for your
                condition. Stop and seek advice if anything feels wrong.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- print-only contact line (handouts) */}
      <div className="hidden pt-4 text-xs leading-relaxed text-muted-foreground print:block">
        {SITE.name} · {SITE.phonePrimaryDisplay} · {SITE.email}
        <br />
        Educational reference — not a prescription. Suitability is set by your therapist.
      </div>
    </>
  );
}
