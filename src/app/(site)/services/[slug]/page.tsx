import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  Phone,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CtaBand } from "@/components/site/cta-band";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseJsonArray, type FaqItem } from "@/lib/content";
import { SITE } from "@/lib/site";
import { serviceImageMeta } from "../_components/image-meta";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

async function getService(slug: string) {
  return db.service
    .findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        exercises: {
          where: { status: "published" },
          orderBy: { sortOrder: "asc" },
          take: 4,
          select: {
            slug: true,
            title: true,
            summary: true,
            category: { select: { name: true } },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateStaticParams() {
  const services = await db.service
    .findMany({
      where: { status: "published" },
      select: { slug: true },
    })
    .catch(() => [] as { slug: string }[]);
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service || service.status !== "published") {
    return { title: "Service not found" };
  }
  const title = service.seoTitle ?? service.name;
  const description = service.seoDescription ?? service.summary;
  return {
    title,
    description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title,
      description,
      ...(service.imageUrl
        ? { images: [{ url: service.imageUrl }] }
        : {}),
    },
  };
}

/**
 * Renders the clinic-approved approach copy as an ordered list. The seeded
 * approach text is a comma-separated sequence of treatment elements, so it is
 * split on its natural punctuation — never rewritten or embellished.
 */
function approachSteps(approach: string | null): string[] {
  if (!approach) return [];
  const cleaned = approach.replace(/\s+/g, " ").trim();
  const parts = cleaned.includes(";")
    ? cleaned.split(";")
    : cleaned.split(/,\s*/);
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^(and|then|with|plus)\s+/i, ""))
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1)
    );
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const [service, settings] = await Promise.all([getService(slug), getSettings()]);

  if (!service || service.status !== "published") {
    notFound();
  }

  const conditions = parseJsonArray<string>(service.conditions);
  const faqs = parseJsonArray<FaqItem>(service.faqs);
  const steps = approachSteps(service.approach);
  const descriptionParagraphs = service.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const meta = serviceImageMeta(service.imageUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Physiotherapy",
    name: service.name,
    description: service.summary,
    url: `${SITE.url}/services/${service.slug}`,
    provider: {
      "@type": "MedicalClinic",
      medicalSpecialty: "https://schema.org/PhysicalTherapy",
      name: SITE.name,
      telephone: settings.phonePrimary,
      url: SITE.url,
      address: {
        "@type": "PostalAddress",
        streetAddress: `${settings.address.line1}, ${settings.address.line2 ?? ""}${
          settings.address.line3 ? `, ${settings.address.line3}` : ""
        }`,
        addressLocality: settings.address.city,
        addressRegion: settings.address.state ?? undefined,
        postalCode: settings.address.postcode ?? undefined,
        addressCountry: "IN",
      },
    },
    areaServed: "Rajamahendravaram, Andhra Pradesh, India",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ------------------------------------------------------------- hero */}
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
        <div className="site-container relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div>
            <Reveal>
              <nav
                aria-label="Breadcrumb"
                className="mb-6"
              >
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
                      href="/services"
                      className="link-sweep hover:text-foreground"
                    >
                      Services
                    </Link>
                  </li>
                  <li aria-hidden="true">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </li>
                  <li aria-current="page" className="text-clay-deep">
                    {service.name}
                  </li>
                </ol>
              </nav>
              {service.category && (
                <p className="kicker flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-clay-deep/60"
                  />
                  {service.category.name}
                </p>
              )}
              <h1 className="display-fluid-1 mt-5 max-w-2xl font-semibold tracking-tight text-foreground">
                {service.name}
              </h1>
              {service.tagline && (
                <p className="mt-4 font-display text-lg italic text-clay-deep sm:text-xl">
                  {service.tagline}
                </p>
              )}
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {service.summary}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/book"
                  className="btn btn-gold h-[54px] text-[13px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  <CalendarCheck className="relative h-[18px] w-[18px]" aria-hidden="true" />
                  Book an appointment
                </Link>
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

          {meta && (
            <Reveal delay={0.12} variant="blur" className="relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -left-4 -top-4 h-full w-full rounded-3xl border-2 border-clay/50"
                />
                <div className="relative overflow-hidden rounded-3xl">
                  <Image
                    src={service.imageUrl!}
                    alt={meta.alt}
                    width={meta.width}
                    height={meta.height}
                    priority
                    sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 90vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Illustrative photography — clinic-supplied photographs will
                  replace it before launch.
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* -------------------------------------------- description + conditions */}
      <section aria-labelledby="about-heading" className="py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                id="about-heading"
                kicker="In detail"
                title={`About ${service.name.toLowerCase()}`}
              />
              <div className="prose-editorial mt-6 max-w-2xl">
                {descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </Reveal>
          </div>

          {conditions.length > 0 && (
            <Reveal delay={0.1}>
              <aside className="lg:sticky lg:top-32 lg:self-start">
                <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-7">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Conditions we assess
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {conditions.map((condition) => (
                      <li
                        key={condition}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep"
                          aria-hidden="true"
                        />
                        {condition}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
                    Whether a particular condition is suitable for this service
                    is confirmed at your assessment — bring any reports you
                    have.
                  </p>
                </div>
              </aside>
            </Reveal>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ our approach */}
      {steps.length > 0 && (
        <section
          aria-labelledby="approach-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="approach-heading"
                kicker="How we work"
                title="Our approach"
                lede={steps.length === 1 ? steps[0] : undefined}
              />
            </Reveal>
            {steps.length > 1 && (
              <ol className="mt-12 grid gap-6 md:grid-cols-2">
                {steps.map((step, i) => (
                  <li key={step.slice(0, 40)}>
                    <Reveal delay={i * 0.06} className="h-full">
                      <div className="flex h-full gap-5 rounded-3xl border border-border/70 bg-card p-6 sm:p-7">
                        <span className="font-display text-3xl font-semibold leading-none text-clay-deep">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="text-base leading-relaxed text-foreground/90">
                          {step}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- FAQs */}
      {faqs.length > 0 && (
        <section aria-labelledby="faqs-heading" className="py-20 sm:py-28">
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="faqs-heading"
                kicker="Good to know"
                title="Common questions"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Accordion
                type="single"
                collapsible
                className="mt-10 max-w-3xl rounded-3xl border border-border/70 bg-card px-6"
              >
                {faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger className="text-base font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ related exercises */}
      {service.exercises.length > 0 && (
        <section
          aria-labelledby="exercises-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading
                  id="exercises-heading"
                  kicker="Exercise library"
                  title="Exercises often used in this care"
                  lede="General educational references your therapist may draw from — never a prescription on their own."
                />
                <Link
                  href="/exercises"
                  className="btn btn-outline h-11 shrink-0 text-[12px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  Browse the library
                  <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {service.exercises.map((exercise, i) => (
                <Reveal key={exercise.slug} delay={i * 0.06}>
                  <Link
                    href={`/exercises/${exercise.slug}`}
                    className="group flex h-full flex-col rounded-3xl border border-border/70 bg-card p-5 transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-ring sm:p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-clay transition-colors duration-300 group-hover:bg-clay group-hover:text-primary">
                        <Activity className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {exercise.category && (
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-clay-deep">
                          {exercise.category.name}
                        </p>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight group-hover:text-primary">
                      {exercise.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {exercise.summary.slice(0, 130)}
                      {exercise.summary.length > 130 ? "…" : ""}
                    </p>
                    <span className="link-sweep mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-clay-deep">
                      View exercise
                      <ArrowUpRight
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2}>
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                These pages are general educational references, not
                prescriptions — repetitions and suitability are always set by
                your therapist for your condition.
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- CTA band */}
      <CtaBand
        title={`Ask us about ${service.name.toLowerCase()}`}
        body={`A first visit settles most questions — what's going on, what care would help, and how it fits your routine. Prefer to talk it through first? Call us directly.`}
        extraLink={{ label: "See all services", href: "/services" }}
        note="This sends an appointment request — our team confirms the slot by phone. Sunday bookings are unavailable."
      />
    </>
  );
}
