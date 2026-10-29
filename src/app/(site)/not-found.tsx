import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Dumbbell,
  Home,
  MessageSquare,
  Phone,
  Stethoscope,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";

/**
 * 404 with the full site chrome (header + footer) — shown when a page inside
 * the (site) route group calls notFound(), e.g. an unknown service or
 * exercise slug. Completely unmatched URLs use the root
 * `src/app/not-found.tsx` instead, because route groups do not wrap URLs
 * that match no route at all.
 */
export default function NotFound() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60 bg-paper">
        {/* giant ghost 404 watermark */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none font-display text-[11rem] font-semibold italic leading-none tracking-tighter text-outline lg:block"
        >
          404
        </p>
        <div className="site-container relative py-20 sm:py-28">
          <Reveal>
            <p className="kicker flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block h-px w-8 bg-clay-deep/60"
              />
              404 — page not found
            </p>
            <h1 className="display-fluid-1 mt-5 max-w-3xl font-semibold tracking-tight">
              This page seems to have{" "}
              <em className="font-display font-medium italic text-clay-deep">
                moved on
              </em>
              .
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The address may be mistyped, or the page may have been retired.
              Nothing is lost — you can start again from the beginning, book a
              visit, or reach a person directly.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/" className="btn btn-gold h-12 text-[12px]">
                <span className="btn-sweep" aria-hidden="true" />
                <Home className="relative h-4 w-4" aria-hidden="true" />
                Back to the home page
              </Link>
              <Link href="/book" className="btn btn-outline h-12 text-[12px]">
                <span className="btn-sweep" aria-hidden="true" />
                <CalendarCheck className="relative h-4 w-4" aria-hidden="true" />
                Book a visit
              </Link>
              <Link
                href="/contact"
                className="link-sweep inline-flex items-center gap-2 text-sm font-bold text-clay-deep"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Contact the centre
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="site-container py-16 sm:py-24">
        <Reveal>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Looking for something in particular?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            These are the pages people look for most often.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                href: "/services",
                icon: Stethoscope,
                title: "Our services",
                text: "In-patient & day care rehabilitation and the full range of physiotherapy services we offer.",
              },
              {
                href: "/exercises",
                icon: Dumbbell,
                title: "Exercise library",
                text: "Therapist-guided educational exercises, clearly labelled as general guidance — not prescriptions.",
              },
              {
                href: "/contact",
                icon: Phone,
                title: "Contact & directions",
                text: "Phone numbers, address with landmarks, opening hours, and a form for written enquiries.",
              },
            ].map(({ href, icon: Icon, title, text }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-2.5 rounded-3xl border border-border/70 bg-card p-5 transition-all duration-500 hover:-translate-y-1.5 hover:border-clay/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-clay">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <ArrowRight
                      className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-clay-deep"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-medium text-foreground">{title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </>
  );
}
