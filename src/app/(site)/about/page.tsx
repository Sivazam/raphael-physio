import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Footprints,
  Home as HomeIcon,
  ListChecks,
  Phone,
  Sun,
} from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { LogoEmblem } from "@/components/site/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About the Centre",
  description:
    "About Raphael Physiotherapy & Rehabilitation Centre — an in-patient & day care rehabilitation centre on Jampet Road, Rajamahendravaram. Our approach, our formats, and what to expect on a first visit.",
  alternates: { canonical: "/about" },
};

/** Renders "+919959274929" as "+91 99592 74929". */
function formatPhoneForDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+91") && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

const APPROACH_STEPS = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Assessment",
    text: "A conversation and a physical examination — your history, the problem, and what you want to get back to: work, walking, playing with the grandchildren.",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "A structured plan",
    text: "Findings become a plan — what treatment and exercises, how often, and how progress will be tracked. You should always know what you're doing and why.",
  },
  {
    number: "03",
    icon: Footprints,
    title: "Guided progression",
    text: "Sessions at the centre with the plan adjusted as you improve — pushing a little further when it's safe, easing back when it's needed.",
  },
  {
    number: "04",
    icon: HomeIcon,
    title: "Home guidance",
    text: "Family and caregivers learn the exercises and precautions, so recovery continues between visits — and after discharge.",
  },
] as const;

const FIRST_VISIT_STEPS = [
  {
    title: "You arrive and check in",
    text: "The centre is on the ground floor, beside Sunstar Hospital on Jampet Road — no stairs to climb, and seating while you wait.",
  },
  {
    title: "We talk first",
    text: "Your problem in your words, your history, the medicines you take, and what you want to achieve. Family members are welcome in this conversation.",
  },
  {
    title: "Then we examine",
    text: "Movement, strength, and what eases or aggravates the problem — the clinical part of understanding what's going on.",
  },
  {
    title: "We discuss the plan",
    text: "What treatment is likely to help, how often you'd come, and how progress is tracked. Questions are part of this — ask them all.",
  },
  {
    title: "You leave with next steps",
    text: "A scheduled review or session, and clear guidance on what to do — and what to avoid — at home until then.",
  },
] as const;

export default async function AboutPage() {
  const settings = await getSettings();
  const primaryDisplay = formatPhoneForDisplay(settings.phonePrimary);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE.name}`,
    url: `${SITE.url}/about`,
    description: SITE.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        kicker="About us"
        title="A centre, not just a clinic"
        lede={`${SITE.name} is an in-patient and day care rehabilitation centre on Jampet Road, Rajamahendravaram — beside Sunstar Hospital. Here is what that means in practice.`}
      />

      {/* ------------------------------------------------ What the centre is */}
      <section aria-labelledby="centre-heading" className="py-20 sm:py-28">
        <div className="site-container grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                id="centre-heading"
                kicker="The centre"
                title="Rehabilitation with room to recover"
              />
              <div className="prose-editorial mt-6 max-w-xl">
                <p>
                  The centre offers physiotherapy assessment and structured
                  rehabilitation programmes in the heart of Rajamahendravaram —
                  consultation and treatment, alongside programmes that run for
                  days or weeks rather than a single visit.
                </p>
                <p>
                  We are set up for two formats of care, because recovery doesn&apos;t
                  always fit into an hourly appointment. Between them, most people
                  recovering after surgery, injury, or a stroke can be supported
                  close to home, with their family involved.
                </p>
                <p>
                  Whether we&apos;re the right place for a specific situation is
                  honestly best discussed directly — call the centre and the team
                  will tell you plainly.
                </p>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Reveal delay={0.08}>
                <div className="h-full rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
                  <h3 className="flex items-center gap-2.5 text-lg font-semibold">
                    <BedDouble className="h-5 w-5 text-clay-deep" aria-hidden="true" />
                    In-patient stays
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    For people who need daily supported rehabilitation — typically
                    after surgery, a stroke, or a serious injury. Days are
                    structured around therapy, rest, and steady progression, with
                    family involved in discharge planning.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.16}>
                <div className="h-full rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
                  <h3 className="flex items-center gap-2.5 text-lg font-semibold">
                    <Sun className="h-5 w-5 text-clay-deep" aria-hidden="true" />
                    Day care programmes
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    For people who are stable at home but need regular, intensive
                    input — attend scheduled sessions through the day, return home
                    in the evening.
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.2}>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href="/services/inpatient-daycare-rehabilitation"
                  className="btn btn-outline h-11 text-[12px]"
                >
                  <span className="btn-sweep" aria-hidden="true" />
                  About the programme
                  <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href={`tel:${settings.phonePrimary}`}
                  className="link-sweep inline-flex items-center gap-2 text-sm font-bold text-clay-deep"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {primaryDisplay}
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Which format suits a person is a clinical decision, made with the
                patient and family — never assumed from a website.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12} variant="blur" className="lg:sticky lg:top-32">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute -left-4 -top-4 h-full w-full rounded-3xl border-2 border-clay/50"
              />
              <figure className="group relative overflow-hidden rounded-3xl">
                <Image
                  src="/images/photo-treatment-room.jpg"
                  alt="Illustrative photo: a calm Indian physiotherapy treatment room with a treatment table and warm daylight."
                  width={1024}
                  height={1024}
                  sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 90vw"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
              </figure>
              <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Illustrative photography — clinic-supplied photographs of the
                centre will replace it before launch.
              </figcaption>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Motto band */}
      <section
        aria-label="Our motto"
        className="relative overflow-hidden bg-ink text-primary-foreground"
      >
        {/* quiet gold glow + ghost motto watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14]"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.82 0.11 90), transparent)",
          }}
        />
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 bottom-0 hidden select-none font-display text-[9rem] font-semibold italic leading-none tracking-tighter text-primary-foreground/[0.05] xl:block"
        >
          Moving
        </p>
        <div className="site-container relative flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <Reveal>
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-sm">
              <LogoEmblem size={104} />
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <blockquote className="mx-auto max-w-3xl">
              <p
                aria-hidden="true"
                className="font-display text-6xl leading-[0.2] text-clay/40 sm:text-7xl"
              >
                &ldquo;
              </p>
              <p className="mt-6 font-display text-3xl font-medium italic leading-snug tracking-tight text-clay sm:text-4xl">
                {SITE.motto}
              </p>
              <footer className="mt-5 text-sm text-primary-foreground/70">
                The clinic&apos;s motto — written inside our emblem.
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Our approach */}
      <section aria-labelledby="approach-heading" className="bg-paper py-20 sm:py-28">
        <div className="site-container grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <SectionHeading
                id="approach-heading"
                kicker="Our approach"
                title="Assessment first, then a plan you can follow"
                lede="The typical arc of a programme here. The details are always set by your therapist, for your condition."
              />
              <figure className="group mt-8 overflow-hidden rounded-3xl border border-border/70">
                <Image
                  src="/images/photo-rehab-gym.jpg"
                  alt="Illustrative photo: a rehabilitation gym inside the Indian clinic, with parallel bars and simple exercise equipment."
                  width={864}
                  height={648}
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 90vw"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
                <figcaption className="bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
                  Space to practise moving — safely, and supervised
                </figcaption>
              </figure>
            </Reveal>
          </div>

          <ol className="space-y-0 divide-y divide-border/70">
            {APPROACH_STEPS.map((step, i) => (
              <Reveal key={step.number} as="li" delay={i * 0.07}>
                <div className="flex gap-5 py-7 first:pt-0 last:pb-0 sm:gap-7">
                  <p
                    className="font-display text-3xl font-semibold text-clay-deep dark:text-clay"
                    aria-hidden="true"
                  >
                    {step.number}
                  </p>
                  <div>
                    <h3 className="flex items-center gap-2.5 text-lg font-semibold">
                      <step.icon
                        className="h-5 w-5 shrink-0 text-clay-deep dark:text-clay"
                        aria-hidden="true"
                      />
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {step.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- First visit */}
      <section aria-labelledby="first-visit-heading" className="py-20 sm:py-28">
        <div className="site-container grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <SectionHeading
                id="first-visit-heading"
                kicker="First visit"
                title="What a first visit typically looks like"
                lede="A plain walkthrough of a usual first appointment — every case is different, so yours may vary."
              />
              <Card className="mt-8 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg">Worth bringing along</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                    <li className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-deep dark:bg-clay" />
                      Any prescriptions and medical reports you have
                    </li>
                    <li className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-deep dark:bg-clay" />
                      Comfortable clothes you can move in
                    </li>
                    <li className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-deep dark:bg-clay" />
                      A family member, if you&apos;d like one there
                    </li>
                    <li className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-deep dark:bg-clay" />
                      Your questions — all of them
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <figure className="group mt-6 overflow-hidden rounded-3xl border border-border/70">
                <Image
                  src="/images/photo-care-strength.jpg"
                  alt="Illustrative photo: an Indian physiotherapist supporting an elderly Indian woman in a saree during a guided strengthening exercise."
                  width={864}
                  height={864}
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 90vw"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
              </figure>
            </Reveal>
          </div>

          <div>
            <Reveal>
              <ol className="space-y-0 divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
                {FIRST_VISIT_STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-5 px-5 py-6 sm:gap-7 sm:px-7">
                    <p
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-base font-semibold text-secondary-foreground"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </p>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {step.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 rounded-2xl border border-border/70 bg-paper px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
                This is what <em className="font-medium not-italic text-foreground/80">typically</em>{" "}
                happens — not a promise about any particular visit. Assessments
                and plans differ from person to person, and the team will tell
                you what to expect in your case.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Where to go */}
      <section aria-labelledby="next-heading" className="bg-paper py-20 sm:py-28">
        <div className="site-container">
          <Reveal variant="blur">
            <figure className="group overflow-hidden rounded-3xl border border-border/70">
              <Image
                src="/images/photo-band-gym.jpg"
                alt="Illustrative photo: an Indian patient exercising with a resistance band under an Indian therapist's guidance in the rehabilitation gym."
                width={1728}
                height={864}
                sizes="(min-width: 1024px) 92vw, 95vw"
                className="aspect-[21/9] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
              <figcaption className="bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
                Guided exercise, progressed at your pace
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
            <Reveal>
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-ink p-6 text-primary-foreground sm:p-8">
                {/* gold glow + ghost word */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-32 h-[22rem] w-[22rem] rounded-full opacity-20"
                  style={{
                    background:
                      "radial-gradient(closest-side, oklch(0.76 0.125 90), transparent)",
                  }}
                />
                <p
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-4 right-6 select-none font-display text-7xl font-semibold italic leading-none tracking-tighter text-primary-foreground/[0.06] sm:text-8xl"
                >
                  Visit
                </p>
                <div className="relative">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">
                    Appointments
                  </p>
                  <h2
                    id="next-heading"
                    className="display-fluid-2 mt-3 font-semibold tracking-tight"
                  >
                    Request a time that suits you
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
                    Send an appointment request online — our team confirms the
                    slot by phone. Prefer to talk? Call us directly.
                  </p>
                </div>
                <div className="relative mt-8 flex flex-col gap-3.5 sm:flex-row">
                  <Link href="/book" className="btn btn-gold h-12 text-[12px]">
                    <span className="btn-sweep" aria-hidden="true" />
                    <CalendarCheck className="relative h-[18px] w-[18px]" aria-hidden="true" />
                    Book an appointment
                  </Link>
                  <a
                    href={`tel:${settings.phonePrimary}`}
                    className="btn btn-ghost-ivory h-12 text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                    {primaryDisplay}
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <ul className="h-full divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card">
                {[
                  {
                    href: "/services",
                    title: "All services",
                    text: "Orthopaedic, sports, neurological, and in-patient & day care rehabilitation — what each service covers.",
                  },
                  {
                    href: "/team",
                    title: "Meet the team",
                    text: "The therapists behind the programmes — profiles publish as the clinic confirms them.",
                  },
                  {
                    href: "/exercises",
                    title: "Exercise library",
                    text: "Therapist-reviewed educational exercises with clear steps and precautions to share with family.",
                  },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex flex-col gap-1.5 px-5 py-5 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring sm:px-7 sm:py-6"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold tracking-tight group-hover:text-primary">
                          {link.title}
                        </span>
                        <ArrowRight
                          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-clay-deep"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {link.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
