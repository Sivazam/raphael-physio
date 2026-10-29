import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  ArrowUp,
} from "lucide-react";
import { LogoEmblem } from "@/components/site/logo";
import type { ClinicInfo, DayHours } from "@/lib/settings";
import { DAY_NAMES_SHORT, formatTime12h } from "@/lib/content";
import { SITE } from "@/lib/site";

export interface FooterProps {
  settings: ClinicInfo;
  hours: DayHours[];
  services: { slug: string; name: string }[];
}

function HoursLine({ hours }: { hours: DayHours[] }) {
  if (hours.length === 0) {
    return (
      <p className="text-sm text-primary-foreground/85">
        Call the centre for current consultation hours.
      </p>
    );
  }
  // Group consecutive days with identical sessions for a compact display.
  const groups: { label: string; text: string }[] = [];
  for (const day of hours) {
    const text = day.isOpen
      ? day.sessions
          .map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`)
          .join(" · ")
      : "Closed";
    const prev = groups[groups.length - 1];
    if (prev && prev.text === text && !prev.label.includes("–")) {
      const lastIdx = hours.findIndex(
        (h) => DAY_NAMES_SHORT[h.dayOfWeek] === prev.label.split("–").pop(),
      );
      if (lastIdx === day.dayOfWeek - 1) {
        prev.label = `${prev.label}–${DAY_NAMES_SHORT[day.dayOfWeek]}`;
      } else {
        groups.push({ label: DAY_NAMES_SHORT[day.dayOfWeek], text });
      }
    } else if (prev && prev.text === text) {
      prev.label = `${prev.label.split("–")[0]}–${DAY_NAMES_SHORT[day.dayOfWeek]}`;
    } else {
      groups.push({ label: DAY_NAMES_SHORT[day.dayOfWeek], text });
    }
  }
  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.label} className="flex justify-between gap-4 text-sm">
          <span className="w-14 shrink-0 font-bold uppercase tracking-[0.12em] text-clay/90">
            {g.label}
          </span>
          <span className="text-primary-foreground/85">{g.text}</span>
        </li>
      ))}
      <li className="pt-1.5 text-xs text-primary-foreground/60">
        Public holidays may differ — call to confirm.
      </li>
    </ul>
  );
}

export function SiteFooter({ settings, hours, services }: FooterProps) {
  const { address } = settings;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-primary-foreground">
      {/* ---- top: brand statement + columns ---- */}
      <div className="site-container grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.25fr_1fr_1fr_1fr] lg:gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
              <LogoEmblem size={50} />
            </span>
            <div className="leading-tight">
              <p className="whitespace-nowrap font-display text-xl font-semibold tracking-tight">
                Raphael Physiotherapy
              </p>
              <p className="mt-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
                &amp; Rehabilitation Centre
              </p>
            </div>
          </div>
          <p className="mt-6 font-display text-2xl italic text-clay">
            &ldquo;{SITE.motto}&rdquo;
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/80">
            In-patient &amp; day care rehabilitation on Jampet Road,
            Rajamahendravaram — physiotherapy, recovery support, and
            therapist-guided exercise resources.
          </p>
          <p className="mt-5 max-w-xs border-l-2 border-clay/50 pl-4 text-xs leading-relaxed text-primary-foreground/65">
            For medical emergencies, please visit the nearest hospital
            emergency department.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-clay">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-clay/70" />
            Contact
          </h2>
          <ul className="mt-5 space-y-4 text-sm">
            <li>
              <a
                href={`tel:${settings.phonePrimary}`}
                className="link-sweep flex items-start gap-3"
              >
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-clay/80"
                  aria-hidden="true"
                />
                <span>
                  {settings.phonePrimaryDisplay}
                  {settings.phoneAlternateDisplay && (
                    <span className="block text-primary-foreground/70">
                      {settings.phoneAlternateDisplay}
                    </span>
                  )}
                </span>
              </a>
            </li>
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="link-sweep flex items-start gap-3"
                >
                  <Mail
                    className="mt-0.5 h-4 w-4 shrink-0 text-clay/80"
                    aria-hidden="true"
                  />
                  {settings.email}
                </a>
              </li>
            )}
            <li>
              <a
                href={settings.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-sweep flex items-start gap-3"
              >
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-clay/80"
                  aria-hidden="true"
                />
                <span className="leading-relaxed">
                  {address.line1}, {address.line2}
                  {address.line3 ? `, ${address.line3}` : ""}
                  <span className="block">
                    {address.city}
                    {address.state ? `, ${address.state}` : ""}{" "}
                    {address.postcode}
                  </span>
                </span>
              </a>
            </li>
          </ul>
        </div>

        {/* Hours */}
        <div>
          <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-clay">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-clay/70" />
            Hours
          </h2>
          <div className="mt-5">
            <HoursLine hours={hours} />
          </div>
        </div>

        {/* Navigate */}
        <nav aria-label="Footer">
          <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-clay">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-clay/70" />
            Explore
          </h2>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              { href: "/services", label: "All services" },
              ...services.slice(0, 3).map((s) => ({
                href: `/services/${s.slug}`,
                label: s.name,
              })),
              { href: "/exercises", label: "Exercise library" },
              { href: "/book", label: "Book an appointment" },
              { href: "/about", label: "About the centre" },
              { href: "/contact", label: "Contact & directions" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group inline-flex items-center gap-2 text-primary-foreground/75 transition-colors hover:text-primary-foreground"
                >
                  <ArrowRight
                    className="h-3.5 w-3.5 -translate-x-1 text-clay opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ---- giant outline wordmark ---- */}
      <div className="site-container" aria-hidden="true">
        <p className="text-outline-ivory select-none whitespace-nowrap font-display text-[13.5vw] font-semibold leading-[0.82] tracking-tighter lg:text-[10.5rem]">
          RAPHAEL
        </p>
      </div>

      {/* ---- legal row ---- */}
      <div className="border-t border-primary-foreground/15">
        <div className="site-container flex flex-col gap-3 py-5 text-xs text-primary-foreground/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {`Raphael Physiotherapy & Rehabilitation Centre`}.
            Rajamahendravaram, Andhra Pradesh.
          </p>
          <div className="flex items-center gap-5">
            <ul className="flex items-center gap-5">
              <li>
                <Link href="/privacy" className="link-sweep">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="link-sweep">
                  Terms
                </Link>
              </li>
            </ul>
            <a
              href="#main-content"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/25 text-primary-foreground/80 transition-colors hover:border-clay hover:text-clay sm:inline-flex"
              aria-label="Back to top"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
