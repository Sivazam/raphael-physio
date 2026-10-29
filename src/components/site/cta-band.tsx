import Link from "next/link";
import { CalendarCheck, Phone } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { getSettings } from "@/lib/settings";

interface CtaBandProps {
  /** Small uppercase label above the title. */
  kicker?: string;
  title: string;
  body?: string;
  /** Overrides the primary button label (still links to /book). */
  bookLabel?: string;
  /** Optional third action, rendered as a text link under the buttons. */
  extraLink?: { label: string; href: string; external?: boolean };
  /** Small footnote under the actions. */
  note?: string;
}

/**
 * Shared espresso "book or call" band used by the services, team, and
 * stories routes. Read-only — renders the clinic phone from settings.
 */
export async function CtaBand({
  kicker = "Appointments",
  title,
  body,
  bookLabel = "Book an appointment",
  extraLink,
  note,
}: CtaBandProps) {
  const settings = await getSettings();

  return (
    <section aria-labelledby="cta-band-title" className="py-16 sm:py-20">
      <div className="site-container">
        <Reveal variant="blur">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-primary-foreground sm:p-12">
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
              Moving
            </p>

            <p className="kicker relative flex items-center gap-3 text-clay">
              <span
                aria-hidden="true"
                className="inline-block h-px w-8 bg-clay/70"
              />
              {kicker}
            </p>
            <h2
              id="cta-band-title"
              className="display-fluid-2 relative mt-4 max-w-2xl font-semibold tracking-tight"
            >
              {title}
            </h2>
            {body && (
              <p className="relative mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/75">
                {body}
              </p>
            )}
            <div className="relative mt-8 flex flex-col gap-3.5 sm:flex-row">
              <Link
                href="/book"
                className="btn btn-gold h-[54px] text-[13px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                <CalendarCheck className="relative h-[18px] w-[18px]" aria-hidden="true" />
                {bookLabel}
              </Link>
              <a
                href={`tel:${settings.phonePrimary}`}
                className="btn btn-ghost-ivory h-[54px] text-[13px]"
              >
                <span className="btn-sweep" aria-hidden="true" />
                <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
                {settings.phonePrimaryDisplay}
              </a>
            </div>
            {extraLink && (
              <p className="relative mt-5 text-sm">
                {extraLink.external ? (
                  <a
                    href={extraLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-sweep font-semibold text-clay"
                  >
                    {extraLink.label}
                  </a>
                ) : (
                  <Link
                    href={extraLink.href}
                    className="link-sweep font-semibold text-clay"
                  >
                    {extraLink.label}
                  </Link>
                )}
              </p>
            )}
            {note && (
              <p className="relative mt-5 text-xs leading-relaxed text-primary-foreground/60">
                {note}
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
