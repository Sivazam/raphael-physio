import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, Clock, ExternalLink, Info, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { db } from "@/lib/db";
import { getOperatingHours, getSettings, type DayHours } from "@/lib/settings";
import { DAY_NAMES, DAY_NAMES_SHORT, formatTime12h } from "@/lib/content";
import {
  closedWeekdaysFromHours,
  getBookingWindow,
  parseISODate,
  resolveInitialDate,
} from "@/lib/booking";
import { BookingWizard } from "./booking-wizard";
import type { WizardService } from "./_lib/types";

export const metadata: Metadata = {
  title: "Book an appointment",
  description:
    "Send an appointment request to Raphael Physiotherapy & Rehabilitation Centre, Rajamahendravaram — choose a service, a weekday and a time, and the team will confirm by phone.",
  alternates: { canonical: "/book" },
};

type SearchParams = Promise<{ service?: string; date?: string }>;

/** Only http(s) external booking URLs are ever rendered. */
function safeExternalUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Compact grouped hours (same policy as the footer: consecutive like days). */
function groupHours(hours: DayHours[]): { label: string; text: string }[] {
  if (hours.length === 0) return [];
  const groups: { days: number[]; text: string }[] = [];
  for (const day of [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek)) {
    const text =
      day.isOpen && day.sessions.length > 0
        ? day.sessions.map((s) => `${formatTime12h(s.start)}–${formatTime12h(s.end)}`).join(" · ")
        : "Closed";
    const prev = groups[groups.length - 1];
    if (prev && prev.text === text && prev.days[prev.days.length - 1] === day.dayOfWeek - 1) {
      prev.days.push(day.dayOfWeek);
    } else {
      groups.push({ days: [day.dayOfWeek], text });
    }
  }
  return groups.map((g) => ({
    label:
      g.days.length === 1
        ? DAY_NAMES[g.days[0]]
        : `${DAY_NAMES_SHORT[g.days[0]]}–${DAY_NAMES_SHORT[g.days[g.days.length - 1]]}`,
    text: g.text,
  }));
}

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [settings, hours, serviceRows] = await Promise.all([
    getSettings(),
    getOperatingHours(),
    db.service
      .findMany({
        where: { status: "published" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          category: { select: { name: true } },
        },
      })
      .catch(() => []),
  ]);

  const phone = {
    primary: settings.phonePrimary,
    primaryDisplay: settings.phonePrimaryDisplay,
    alternate: settings.phoneAlternate,
    alternateDisplay: settings.phoneAlternateDisplay,
  };

  // ------------------------------------------------------------ external mode
  if (settings.bookingMode === "external") {
    const externalUrl = safeExternalUrl(settings.externalBookingUrl);
    return (
      <>
        <PageHeader
          kicker="Appointments"
          title="Book an appointment"
          lede="Online booking for the centre runs through the clinic's own booking platform."
        />
        <section className="py-16 sm:py-24">
          <div className="site-container">
            <Reveal variant="blur">
              <div className="mx-auto max-w-xl rounded-3xl border border-border/70 bg-card p-6 text-center sm:p-10">
                {externalUrl ? (
                  <>
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ink text-clay">
                      <ExternalLink className="size-6" aria-hidden="true" />
                    </span>
                    <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
                      Continue on the clinic&rsquo;s booking platform
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Appointment booking is handled by the clinic&rsquo;s chosen platform,
                      which opens in a new tab. Available times and confirmations there are
                      managed by the clinic team.
                    </p>
                    <div className="mt-7 flex flex-col items-center gap-3.5">
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-gold h-12 text-[12px]"
                      >
                        <span className="btn-sweep" aria-hidden="true" />
                        Open the booking platform
                        <ExternalLink className="relative h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                    <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                      We can&rsquo;t check times or confirmations inside the external
                      platform from this page — the clinic team handles those there.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ink text-clay">
                      <CalendarCheck2 className="size-6" aria-hidden="true" />
                    </span>
                    <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
                      Online booking isn&rsquo;t available right now
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      The clinic&rsquo;s booking platform hasn&rsquo;t been connected yet.
                      Please call the centre directly and the team will book you in.
                    </p>
                  </>
                )}
                <div className="mt-7 flex flex-col justify-center gap-3.5 sm:flex-row">
                  <a
                    href={`tel:${phone.primary}`}
                    className="btn btn-outline h-12 text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                    Call {phone.primaryDisplay}
                  </a>
                  {phone.alternate && phone.alternateDisplay && (
                    <a
                      href={`tel:${phone.alternate}`}
                      className="btn btn-outline h-12 text-[12px]"
                    >
                      <span className="btn-sweep" aria-hidden="true" />
                      <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                      {phone.alternateDisplay}
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </>
    );
  }

  // ------------------------------------------------------------ internal mode
  const services: WizardService[] = serviceRows.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tagline: s.tagline,
    categoryName: s.category?.name ?? null,
  }));

  const bookingWindow = getBookingWindow(
    settings.minBookingDateOffset,
    settings.maxBookingDateOffset
  );
  const closedWeekdays = closedWeekdaysFromHours(hours, settings.sundayBookingEnabled);

  // Deep links: /book?service=<slug> preselects; /book?date=YYYY-MM-DD is
  // resolved honestly (window clamp, Sunday → next working day) with a notice.
  const requestedSlug = typeof params.service === "string" ? params.service : undefined;
  const initialServiceId =
    requestedSlug && services.some((s) => s.slug === requestedSlug)
      ? (services.find((s) => s.slug === requestedSlug)?.id ?? null)
      : null;

  const requestedDate = typeof params.date === "string" ? params.date : "";
  const resolved =
    requestedDate && parseISODate(requestedDate)
      ? resolveInitialDate(requestedDate, bookingWindow, closedWeekdays)
      : { date: "", notice: null as string | null };

  const hoursGroups = groupHours(hours);

  return (
    <>
      <PageHeader
        kicker="Appointments"
        title="Book an appointment"
        lede="Tell us what you need and when suits you — the team calls back to confirm. It takes about a minute."
      >
        {settings.bookingNotes && (
          <p className="mt-6 inline-flex items-start gap-2 rounded-xl border border-clay/40 bg-secondary/60 px-4 py-2.5 text-sm leading-relaxed text-foreground/85">
            <Info className="mt-0.5 size-4 shrink-0 text-clay-deep" aria-hidden="true" />
            {settings.bookingNotes}
          </p>
        )}
      </PageHeader>

      <section className="py-12 sm:py-16" aria-labelledby="booking-heading">
        <h2 id="booking-heading" className="sr-only">
          Appointment request form
        </h2>
        <div className="site-container">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <BookingWizard
                services={services}
                bookingWindow={bookingWindow}
                closedWeekdays={closedWeekdays}
                phone={phone}
                initialServiceId={initialServiceId}
                initialDate={resolved.date || null}
                initialDateNotice={resolved.notice}
              />

              {/* Phone-first escape hatch + hours — server rendered, no JS. */}
              <aside className="space-y-6 lg:sticky lg:top-28">
                <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
                  <h3 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/15 text-clay-deep">
                      <Phone className="size-5" aria-hidden="true" />
                    </span>
                    Prefer to call?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Reception can book you in directly during working hours — no forms
                    needed.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <a
                      href={`tel:${phone.primary}`}
                      className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-clay/60 hover:bg-secondary/50"
                    >
                      <Phone className="size-4 text-clay-deep" aria-hidden="true" />
                      {phone.primaryDisplay}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Primary
                      </span>
                    </a>
                    {phone.alternate && phone.alternateDisplay && (
                      <a
                        href={`tel:${phone.alternate}`}
                        className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-clay/60 hover:bg-secondary/50"
                      >
                        <Phone className="size-4 text-clay-deep" aria-hidden="true" />
                        {phone.alternateDisplay}
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                          Alternate
                        </span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-secondary/40 p-5 sm:p-6">
                  <h3 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay/15 text-clay-deep">
                      <Clock className="size-5" aria-hidden="true" />
                    </span>
                    Working hours
                  </h3>
                  {hoursGroups.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {hoursGroups.map((g) => (
                        <li key={g.label} className="flex justify-between gap-4 text-sm">
                          <span className="font-medium text-foreground/90">{g.label}</span>
                          <span className="text-right text-muted-foreground">{g.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Call the centre for current consultation hours.
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Public holidays may differ — call to confirm.
                  </p>
                  <p className="mt-3 text-sm">
                    <Link
                      href="/contact"
                      className="link-sweep font-bold text-clay-deep"
                    >
                      Directions &amp; contact details
                    </Link>
                  </p>
                </div>
              </aside>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
