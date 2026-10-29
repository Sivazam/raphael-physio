import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getServiceIcon } from "@/lib/service-icons";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CtaBand } from "@/components/site/cta-band";
import { getPublishedServices } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { serviceImageMeta } from "./_components/image-meta";

export const metadata: Metadata = {
  title: "Physiotherapy & Rehabilitation Services",
  description:
    "Orthopaedic physiotherapy, back and neck pain care, post-surgical and neurological rehabilitation, sports injury recovery, and in-patient & day care programmes in Rajamahendravaram.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Physiotherapy & Rehabilitation Services",
    description:
      "Assessment-led physiotherapy and rehabilitation at Raphael Physiotherapy & Rehabilitation Centre, Jampet Road, Rajamahendravaram.",
  },
};

const HOW_WE_WORK = [
  {
    icon: ClipboardCheck,
    step: "01",
    title: "Assessment",
    text: "A session typically begins with a physical assessment and a conversation about your daily demands — work, walking, stairs, sleep.",
  },
  {
    icon: ListChecks,
    step: "02",
    title: "A structured plan",
    text: "Treatment is drawn up around what matters to you — combining manual therapy, graded exercise, and guidance you can follow at home.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Progression",
    text: "The plan is reviewed as you progress, with clear advice for the days between visits and a path towards the activities you need back.",
  },
] as const;

type ServiceCardData = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  summary: string;
  imageUrl: string | null;
  featured: boolean;
  category: { name: string; slug: string } | null;
};

async function getServices(): Promise<ServiceCardData[]> {
  // Catalog = database rows when present, baked snapshot otherwise (Vercel).
  return getPublishedServices();
}

export default async function ServicesPage() {
  const services = await getServices();
  const featured = services.filter((s) => s.featured).slice(0, 3);
  const rest = services.filter((s) => !featured.includes(s));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Physiotherapy and rehabilitation services",
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: service.name,
      url: `${SITE.url}/services/${service.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        kicker="Services"
        title="Physiotherapy & rehabilitation services"
        lede="From persisting joint pain to recovery after surgery or stroke, care at the centre begins with an assessment and builds into a structured programme — delivered as clinic visits, day care, or in-patient rehabilitation. Each service is described below in plain terms, so you know what to expect before you call."
      />

      {/* ------------------------------------------------ how we work strip */}
      <section aria-labelledby="how-we-work-heading" className="py-16 sm:py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              id="how-we-work-heading"
              kicker="How we work"
              title="Assessment first, then a plan that progresses"
            />
          </Reveal>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_WE_WORK.map((step, i) => (
              <li key={step.step}>
                <Reveal delay={i * 0.08}>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl font-semibold text-clay-deep">
                      {step.step}
                    </span>
                    <step.icon
                      className="h-5 w-5 text-clay-deep"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------- core (featured) */}
      {featured.length > 0 && (
        <section
          aria-labelledby="core-services-heading"
          className="bg-paper py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="core-services-heading"
                kicker="Core services"
                title="The core of what we do"
                lede="Orthopaedic assessment and treatment, care for back and neck pain, and structured rehabilitation at the centre itself."
              />
            </Reveal>

            <div className="mt-12 space-y-6">
              {/* Lead service — wide, image-led editorial card */}
              {featured[0] && (
                <Reveal variant="blur">
                  <Link
                    href={`/services/${featured[0].slug}`}
                    className={`group grid overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-ring ${
                      serviceImageMeta(featured[0].imageUrl)
                        ? "lg:grid-cols-[0.95fr_1.05fr]"
                        : ""
                    }`}
                  >
                    {serviceImageMeta(featured[0].imageUrl) && (
                      <div className="relative min-h-64 lg:min-h-full">
                        <Image
                          src={featured[0].imageUrl!}
                          alt={serviceImageMeta(featured[0].imageUrl)!.alt}
                          width={serviceImageMeta(featured[0].imageUrl)!.width}
                          height={serviceImageMeta(featured[0].imageUrl)!.height}
                          sizes="(min-width: 1024px) 45vw, 90vw"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                      <div className="flex flex-wrap items-center gap-2">
                        {featured[0].category && (
                          <Badge variant="secondary" className="font-normal">
                            {featured[0].category.name}
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight group-hover:text-primary sm:text-3xl">
                        {featured[0].name}
                      </h3>
                      {featured[0].tagline && (
                        <p className="mt-2 font-display text-base italic text-clay-deep">
                          {featured[0].tagline}
                        </p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {featured[0].summary}
                      </p>
                      <span className="link-sweep mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-clay-deep">
                        Learn about this service
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              )}

              {/* Remaining featured services — image-led cards */}
              <div className="grid gap-6 md:grid-cols-2">
                {featured.slice(1).map((service, i) => {
                  const meta = serviceImageMeta(service.imageUrl);
                  return (
                    <Reveal key={service.id} delay={i * 0.08} variant="blur">
                      <Link
                        href={`/services/${service.slug}`}
                        className="group block h-full overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {meta && (
                          <div className="relative overflow-hidden">
                            <Image
                              src={service.imageUrl!}
                              alt={meta.alt}
                              width={meta.width}
                              height={meta.height}
                              sizes="(min-width: 768px) 40vw, 90vw"
                              className="aspect-[8/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                            />
                            {service.category && (
                              <Badge className="absolute left-4 top-4 bg-background/90 text-foreground backdrop-blur">
                                {service.category.name}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="p-5 sm:p-6">
                          <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary">
                            {service.name}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {service.summary}
                          </p>
                          <span className="link-sweep mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-clay-deep">
                            Learn about this service
                            <ArrowUpRight
                              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------- specialist programmes */}
      {rest.length > 0 && (
        <section
          aria-labelledby="specialist-heading"
          className="py-20 sm:py-28"
        >
          <div className="site-container">
            <Reveal>
              <SectionHeading
                id="specialist-heading"
                kicker="Specialist programmes"
                title="Focused rehabilitation, built around your goals"
                lede="Recovery after surgery, sports and activity injuries, and neurological rehabilitation — each programme progresses at a pace set by your assessment, not a fixed template."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="mt-12 divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
                {rest.map((service) => {
                  const Glyph = getServiceIcon(service.slug);
                  return (
                  <li key={service.id}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group flex flex-col gap-2 px-5 py-5 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-5 sm:px-7"
                    >
                      <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-clay/30 bg-gold-soft/60 text-clay-deep transition-colors duration-300 group-hover:border-clay/60 group-hover:bg-clay/15 group-hover:text-clay sm:flex">
                        <Glyph className="h-5.5 w-5.5" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary">
                            {service.name}
                          </h3>
                          {service.category && (
                            <Badge variant="secondary" className="font-normal">
                              {service.category.name}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          {service.tagline ?? service.summary}
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
            <Reveal delay={0.15}>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Don&apos;t see the therapy you&apos;re looking for? Call the
                centre — the team can confirm what is currently offered before
                you plan a visit.
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ CTA band */}
      <CtaBand
        title="Not sure which service fits? Start with an assessment."
        body="A first visit settles most questions — what's going on, what care would help, and whether it's clinic visits, day care, or in-patient rehabilitation. Prefer to talk it through first? Call us directly."
        extraLink={{ label: "Contact & directions", href: "/contact" }}
        note="This sends an appointment request — our team confirms the slot by phone. Sunday bookings are unavailable."
      />
    </>
  );
}
