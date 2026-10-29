import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Info,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { formatPhoneDisplay, getCategoryIcon } from "./_lib/exercises";

interface ExercisesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * The whole published library (10 exercises) is read once per request and
 * filtered in memory — the data set is tiny, and `cache()` dedupes the read
 * between generateMetadata and the page render.
 */
const getLibrary = cache(async () => {
  const [categories, exercises] = await Promise.all([
    db.exerciseCategory.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.exercise
      .findMany({
        where: { status: "published" },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
        include: { category: { select: { name: true, slug: true } } },
      })
      .catch(() => []),
  ]);
  return { categories, exercises };
});

/** Normalise ?category= — repeated params collapse to the first value. */
function normalizeCategoryParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function generateMetadata({ searchParams }: ExercisesPageProps): Promise<Metadata> {
  const { categories } = await getLibrary();
  const activeSlug = normalizeCategoryParam((await searchParams).category);
  const activeCategory = activeSlug
    ? categories.find((c) => c.slug === activeSlug) ?? null
    : null;

  const canonical = activeCategory ? `/exercises?category=${activeCategory.slug}` : "/exercises";
  if (activeCategory) {
    return {
      title: `${activeCategory.name} Exercises`,
      description: `Educational ${activeCategory.name.toLowerCase()} exercises${
        activeCategory.bodyArea ? ` for ${activeCategory.bodyArea.toLowerCase()}` : ""
      } — clear steps and honest precautions from the therapist-reviewed library at ${SITE.name}, Rajamahendravaram.`,
      alternates: { canonical },
    };
  }
  return {
    title: "Exercise Library",
    description:
      "A therapist-reviewed library of educational physiotherapy exercises — clear step-by-step instructions, equipment notes, and honest precautions. General education from Raphael Physiotherapy & Rehabilitation Centre, Rajamahendravaram.",
    alternates: { canonical },
  };
}

function pillClassName(active: boolean): string {
  return [
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:border-clay/60 hover:bg-accent",
  ].join(" ");
}

function pillCountClassName(active: boolean): string {
  return [
    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
    active ? "bg-primary-foreground/15 text-primary-foreground/80" : "bg-secondary text-muted-foreground",
  ].join(" ");
}

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const [settings, { categories, exercises }] = await Promise.all([getSettings(), getLibrary()]);
  const activeSlug = normalizeCategoryParam((await searchParams).category);
  const activeCategory = activeSlug
    ? categories.find((c) => c.slug === activeSlug) ?? null
    : null;

  // An unknown category slug is an invalid URL, not a silently-empty library.
  if (activeSlug && !activeCategory) notFound();

  const visible = activeCategory
    ? exercises.filter((e) => e.category?.slug === activeCategory.slug)
    : exercises;
  const featured = visible.filter((e) => e.featured);
  const rest = visible.filter((e) => !e.featured);

  const countBySlug = new Map<string, number>();
  for (const exercise of exercises) {
    const slug = exercise.category?.slug;
    if (slug) countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1);
  }
  // Only categories with at least one published exercise become filters.
  const filterCategories = categories.filter((c) => (countBySlug.get(c.slug) ?? 0) > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: activeCategory ? `${activeCategory.name} exercises` : "Exercise library",
    description:
      "Therapist-reviewed educational physiotherapy exercises with step-by-step instructions and precautions. General education — not prescriptions.",
    url: `${SITE.url}/exercises${activeCategory ? `?category=${activeCategory.slug}` : ""}`,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: visible.length,
      itemListElement: visible.map((exercise, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: exercise.title,
        url: `${SITE.url}/exercises/${exercise.slug}`,
      })),
    },
  };

  // Page-scoped print rules: hide site chrome, force Reveal opacity, keep the
  // reading order. Hard-coded ink colours are a pragmatic print fallback for
  // dark-mode sessions (browsers drop backgrounds but keep light text colours).
  const printCss = `
@page { margin: 14mm; }
@media print {
  header, footer { display: none !important; }
  * { opacity: 1 !important; transform: none !important; }
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

      <PageHeader
        kicker="Exercise library"
        title="Guidance you can take home"
        lede="A small, carefully written library of educational exercises our therapists use in programmes — each page reviewed for clarity, with honest precautions. General education for patients and families, never a prescription."
      >
        {filterCategories.length > 0 && (
          <nav aria-label="Filter exercises by body area" className="mt-8 print:hidden">
            <ul className="flex flex-wrap gap-2.5">
              <li>
                <Link
                  href="/exercises"
                  aria-current={activeCategory ? undefined : "true"}
                  className={pillClassName(!activeCategory)}
                >
                  All exercises
                  <span className={pillCountClassName(!activeCategory)}>{exercises.length}</span>
                </Link>
              </li>
              {filterCategories.map((category) => {
                const isActive = category.slug === activeCategory?.slug;
                return (
                  <li key={category.id}>
                    <Link
                      href={`/exercises?category=${category.slug}`}
                      aria-current={isActive ? "true" : undefined}
                      className={pillClassName(isActive)}
                    >
                      {category.name}
                      <span className={pillCountClassName(isActive)}>
                        {countBySlug.get(category.slug) ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </PageHeader>

      {visible.length === 0 ? (
        /* ---------------------------------------------- honest empty state */
        <section className="bg-paper py-20 sm:py-28">
          <div className="site-container">
            <Reveal variant="blur">
              <div className="mx-auto max-w-2xl rounded-3xl border border-border/70 bg-card p-8 text-center sm:p-12">
                <p className="kicker flex items-center justify-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-clay-deep/60"
                  />
                  Nothing published yet
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-clay-deep/60"
                  />
                </p>
                <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  This part of the library is still being written
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  No exercises are published here yet. Pages are added only after
                  our therapists have reviewed them — if you need guidance in the
                  meantime, please call the centre.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                  <a
                    href={`tel:${settings.phonePrimary}`}
                    className="btn btn-outline h-11 text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <Phone className="relative h-4 w-4" aria-hidden="true" />
                    {formatPhoneDisplay(settings.phonePrimaryDisplay)}
                  </a>
                  <Link href="/book" className="btn btn-gold h-11 text-[12px]">
                    <span className="btn-sweep" aria-hidden="true" />
                    <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                    Request an appointment
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        <>
          {/* ------------------------------------------------ featured row */}
          {featured.length > 0 && (
            <section className="py-16 sm:py-24">
              <div className="site-container">
                <Reveal>
                  <SectionHeading
                    kicker="Start here"
                    title="Featured exercises"
                    lede="The pages our therapists point patients to most often — each opens as a step-by-step guide you can share with family."
                  />
                </Reveal>
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((exercise, i) => {
                    const Icon = getCategoryIcon(exercise.category?.slug);
                    return (
                      <Reveal key={exercise.id} delay={i * 0.07} variant="blur">
                        <Link
                          href={`/exercises/${exercise.slug}`}
                          className="group flex h-full flex-col rounded-3xl border border-border/70 bg-card p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-clay transition-colors duration-300 group-hover:bg-clay group-hover:text-primary">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <Badge variant="secondary" className="font-normal">
                              Featured
                            </Badge>
                          </div>
                          {exercise.category && (
                            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay-deep">
                              {exercise.category.name}
                            </p>
                          )}
                          <h3 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-primary">
                            {exercise.title}
                          </h3>
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {exercise.summary}
                          </p>
                          <span className="link-sweep mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-clay-deep">
                            Step-by-step guide
                            <ArrowUpRight
                              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ------------------------------------------- remaining exercises */}
          {rest.length > 0 && (
            <section className="bg-paper py-16 sm:py-24">
              <div className="site-container">
                <Reveal>
                  <SectionHeading
                    kicker="The full library"
                    title={
                      activeCategory
                        ? `${activeCategory.name} exercises`
                        : "Every exercise, simply explained"
                    }
                    lede={
                      activeCategory
                        ? activeCategory.bodyArea
                          ? `Body area: ${activeCategory.bodyArea.toLowerCase()}.`
                          : undefined
                        : "Each page includes the purpose, numbered instructions, equipment notes, and precautions."
                    }
                  />
                </Reveal>
                <Reveal delay={0.08}>
                  <ul className="mt-12 divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
                    {rest.map((exercise) => {
                      const Icon = getCategoryIcon(exercise.category?.slug);
                      return (
                        <li key={exercise.id}>
                          <Link
                            href={`/exercises/${exercise.slug}`}
                            className="group flex flex-col gap-3 px-5 py-5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-5 sm:px-7"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-clay transition-colors duration-300 group-hover:bg-clay group-hover:text-primary">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary">
                                  {exercise.title}
                                </h3>
                                {exercise.category && (
                                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-clay-deep">
                                    {exercise.category.name}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                {exercise.summary}
                              </p>
                            </div>
                            <ArrowRight
                              className="hidden h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-clay-deep sm:block"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Reveal>
              </div>
            </section>
          )}

          {/* ------------------------------------------------ disclaimer line */}
          <section aria-label="Educational disclaimer" className="border-t border-border/60 py-8">
            <div className="site-container">
              <Reveal>
                <p className="mx-auto flex max-w-3xl items-start gap-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                  <span>
                    Every page in this library is general educational material —
                    it is not a prescription. Repetitions, suitability, and
                    progression are always set individually by your therapist.
                    Stop any exercise that increases pain, and speak to us
                    before continuing.
                  </span>
                </p>
              </Reveal>
            </div>
          </section>
        </>
      )}
    </>
  );
}
