import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Siren,
} from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "./contact-form";
import { getOperatingHours, getSettings, type DayHours } from "@/lib/settings";
import { DAY_NAMES_SHORT, formatTime12h } from "@/lib/content";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & Directions",
  description:
    "Call, visit, or message Raphael Physiotherapy & Rehabilitation Centre on Jampet Road, Rajamahendravaram — phones, email, hours, directions, and a form for non-urgent enquiries.",
  alternates: { canonical: "/contact" },
};

/** Renders "+919959274929" as "+91 99592 74929" and "08832470757" as "0883 247 0757". */
function formatPhoneForDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+91") && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11 && raw.trim().startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

/** Groups consecutive days with identical sessions — same logic as the footer. */
function groupHours(hours: DayHours[]): { label: string; text: string }[] {
  const groups: { label: string; text: string; days: number[] }[] = [];
  for (const day of hours) {
    const text = day.isOpen
      ? day.sessions
          .map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`)
          .join(" · ")
      : "Closed";
    const prev = groups[groups.length - 1];
    if (
      prev &&
      prev.text === text &&
      prev.days[prev.days.length - 1] === day.dayOfWeek - 1
    ) {
      prev.days.push(day.dayOfWeek);
      prev.label = `${DAY_NAMES_SHORT[prev.days[0]]}–${DAY_NAMES_SHORT[day.dayOfWeek]}`;
    } else {
      groups.push({ label: DAY_NAMES_SHORT[day.dayOfWeek], text, days: [day.dayOfWeek] });
    }
  }
  return groups;
}

function HoursTable({ hours }: { hours: DayHours[] }) {
  if (hours.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Call the centre for current consultation hours.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {groupHours(hours).map((g) => (
        <li key={g.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
          <span className="w-20 shrink-0 font-semibold">{g.label}</span>
          <span
            className={
              g.text === "Closed" ? "text-muted-foreground" : "text-foreground/90"
            }
          >
            {g.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOperatingHours()]);
  const { address } = settings;

  const primaryDisplay = formatPhoneForDisplay(settings.phonePrimary);
  const alternateDisplay = settings.phoneAlternate
    ? formatPhoneForDisplay(settings.phoneAlternate)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE.name}`,
    url: `${SITE.url}/contact`,
    description: SITE.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        kicker="Contact"
        title="Talk to the centre"
        lede="A phone call is the fastest way to reach the team — for appointments, admission questions, or directions. Phones, email, the address, hours, and a message form are all below."
      />

      {/* -------------------------------------------------- Phones & details */}
      <section className="py-20 sm:py-28">
        <div className="site-container grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Phone-first panel */}
          <Reveal variant="blur">
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-ink p-6 text-primary-foreground sm:p-8">
              {/* gold glow + ghost glyph */}
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
                className="pointer-events-none absolute -bottom-6 right-4 select-none font-display text-7xl font-semibold italic leading-none tracking-tighter text-primary-foreground/[0.06]"
              >
                Call
              </p>
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-clay">
                Call the centre
              </p>

              <a
                href={`tel:${settings.phonePrimary}`}
                className="group relative mt-6 flex min-h-[4.5rem] items-center gap-4 rounded-2xl bg-primary-foreground/10 px-4 py-4 transition-colors hover:bg-primary-foreground/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                aria-label={`Call the centre on ${primaryDisplay}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay text-primary">
                  <Phone className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {primaryDisplay}
                  </span>
                  <span className="mt-0.5 block text-sm text-primary-foreground/75">
                    Tap to call — the quickest way to reach us
                  </span>
                </span>
              </a>

              <div className="relative mt-6 space-y-1.5">
                {alternateDisplay && settings.phoneAlternate && (
                  <a
                    href={`tel:${settings.phoneAlternate}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-base transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Phone
                      className="h-4 w-4 shrink-0 text-clay"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{alternateDisplay}</span>
                    <span className="text-sm text-primary-foreground/70">(alternate)</span>
                  </a>
                )}
                {settings.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-base transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Mail
                      className="h-4 w-4 shrink-0 text-clay"
                      aria-hidden="true"
                    />
                    <span className="font-medium break-all">{settings.email}</span>
                  </a>
                )}
              </div>

              <p className="relative mt-6 border-t border-primary-foreground/15 pt-5 text-sm leading-relaxed text-primary-foreground/85">
                <Siren className="mb-0.5 mr-1.5 inline h-4 w-4 text-clay" aria-hidden="true" />
                For a medical emergency, please don&apos;t wait on a call back or a
                message — dial 108 or go straight to the nearest hospital emergency
                department.
              </p>
            </div>
          </Reveal>

          {/* Address + hours */}
          <div className="flex flex-col gap-6">
            <Reveal delay={0.08}>
              <Card className="h-full rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/15 text-clay-deep">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    Visit the centre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <address className="not-italic leading-relaxed text-foreground/90">
                    <p className="font-medium">{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    {address.line3 && <p>{address.line3}</p>}
                    <p>
                      {address.city}
                      {address.state ? `, ${address.state}` : ""} {address.postcode}
                    </p>
                  </address>
                  <p className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <Navigation
                      className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep"
                      aria-hidden="true"
                    />
                    <span>
                      Ground floor, beside Sunstar Hospital and Venki&apos;s Delight —
                      opposite Hotel Anand Regency. For an auto or taxi, &ldquo;Jampet
                      Road, Sunstar Hospital&rdquo; is the landmark to give.
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-3.5 pt-1">
                    <a
                      href={settings.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline h-11 text-[12px]"
                    >
                      <span className="btn-sweep" aria-hidden="true" />
                      <MapPin className="relative h-4 w-4" aria-hidden="true" />
                      Open in Google Maps
                    </a>
                    <Link href="/book" className="btn btn-gold h-11 text-[12px]">
                      <span className="btn-sweep" aria-hidden="true" />
                      <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                      Book an appointment
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.16}>
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/15 text-clay-deep">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HoursTable hours={hours} />
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Hours can change on public holidays — call to confirm before a
                    special trip. Bookings are not taken for Sundays.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Form */}
      <section aria-labelledby="message-heading" className="bg-paper py-20 sm:py-28">
        <div className="site-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <SectionHeading
                kicker="Send a message"
                title="For non-urgent enquiries and feedback"
                lede="Questions about programmes, admission, or the centre itself — write to us and the team will reply during working hours."
              />
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  A short message is enough — your name, a phone number we can reach
                  you on, and what it&apos;s about. There&apos;s no need to include
                  medical details.
                </p>
                <p>
                  Need an appointment? A call is faster — or{" "}
                  <Link
                    href="/book"
                    className="link-sweep font-bold text-clay-deep"
                  >
                    request a time on the booking page
                  </Link>{" "}
                  and we&apos;ll confirm by phone.
                </p>
                <p className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 text-foreground/80">
                  <Siren
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-red"
                    aria-hidden="true"
                  />
                  <span>
                    This form is not monitored around the clock. In an emergency, dial
                    108 or go to the nearest hospital emergency department.
                  </span>
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <Card id="message-form" className="relative rounded-3xl">
              <CardHeader>
                <CardTitle id="message-heading" className="text-lg">
                  Message the centre
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  );
}
