import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for the Raphael Physiotherapy & Rehabilitation Centre website — informational content, exercise pages as education, appointment requests, and honest expectations about outcomes.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "2026-10-27";
const LAST_UPDATED_DISPLAY = "27 October 2026";

const SECTIONS = [
  { id: "informational", label: "This website is informational" },
  { id: "exercises", label: "Exercise pages are education" },
  { id: "appointments", label: "Appointment requests are requests" },
  { id: "outcomes", label: "No guarantees about outcomes" },
  { id: "communications", label: "Contacting you about your request" },
  { id: "external", label: "External links & photographs" },
  { id: "changes", label: "Changes to these terms" },
] as const;

export default async function TermsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        kicker="Terms"
        title="Terms of use, plainly stated"
        lede="What this website is, what it isn't, and the honest expectations that come with using it — written the way we'd explain it at the front desk."
      >
        <p className="mt-5 text-sm text-muted-foreground">
          Last updated{" "}
          <time dateTime={LAST_UPDATED} className="font-medium text-foreground/80">
            {LAST_UPDATED_DISPLAY}
          </time>
        </p>
      </PageHeader>

      <section className="py-16 sm:py-24">
        <div className="site-container grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-32">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-deep dark:text-clay">
                On this page
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="max-w-3xl">
            <Reveal>
              <Card className="rounded-3xl border-clay/40 bg-secondary/50">
                <CardContent className="space-y-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-clay-deep dark:text-clay">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    The short version
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    This website offers general information about the centre and
                    general physiotherapy education — it is not medical advice for
                    your condition. Forms on it send requests, not confirmed
                    appointments; the clinic confirms by phone. Recovery can&apos;t
                    be promised by anyone, and nothing here replaces assessment by
                    a qualified health professional.
                  </p>
                </CardContent>
              </Card>
            </Reveal>

            <article className="prose-editorial mt-10">
              <h2 id="informational">This website is informational</h2>
              <p>
                Everything on this site — service descriptions, the exercise
                library, the about pages — is general information about the centre
                and about physiotherapy practice. We work to keep it accurate and
                to correct mistakes when we find them, but content may change as
                the clinic confirms details, and none of it is a substitute for an
                in-person assessment by a qualified health professional.
              </p>
              <p>
                If anything on this site ever disagrees with what the clinic team
                tells you directly, trust the team — and please tell us so we can
                fix the page.
              </p>

              <h2 id="exercises">Exercise pages are education, not prescriptions</h2>
              <p>
                The exercise library exists to explain, in plain language, how
                common therapeutic exercises are generally performed. That is its
                whole job. It is not a prescription for you, and it is not a
                diagnosis.
              </p>
              <p>
                Repetitions, frequencies, and suitability are always set by your
                therapist for your condition. If you are recovering from surgery,
                living with a neurological or cardiac condition, or unsure whether
                an exercise is safe for you, speak to your therapist or doctor
                before trying it. If an exercise causes sharp pain, dizziness, or
                anything that feels wrong, stop and seek advice.
              </p>

              <h2 id="appointments">Appointment requests are requests</h2>
              <p>
                Submitting the booking form sends an appointment{" "}
                <em>request</em> to the clinic. It is not a confirmed appointment
                until a member of the team confirms it with you by phone —
                including the date, time, and anything you should bring. Sunday is
                not available for bookings.
              </p>
              <p>
                If the requested time can&apos;t be accommodated, we&apos;ll say so
                and offer the nearest alternative. For anything urgent, skip the
                form and call the centre directly — and for medical emergencies, go
                to a hospital emergency department.
              </p>

              <h2 id="outcomes">No guarantees about outcomes</h2>
              <p>
                Rehabilitation is genuinely individual. How fast and how far
                someone recovers depends on the condition, overall health, and
                many factors no website can predict. This site describes how the
                clinic works — it never promises a cure, a timeline, or a
                particular result, and you should be wary of anyone who does.
              </p>

              <h2 id="communications">Contacting you about your request</h2>
              <p>
                When you submit a form, you&apos;re agreeing that the clinic may
                contact you — by phone, message, or email — about that specific
                request. That&apos;s the only conversation you&apos;re opting
                into: this website doesn&apos;t send marketing messages, and you
                can ask us to stop at any point. See our{" "}
                <Link href="/privacy">privacy page</Link> for how your details are
                handled.
              </p>

              <h2 id="external">External links &amp; photographs</h2>
              <p>
                Links such as Google Maps point to third-party websites we
                don&apos;t control — their terms apply once you&apos;re there.
                Photographs on this site are illustrative — they show the kind of
                care and equipment involved, not the clinic&apos;s own rooms or
                patients — until clinic-supplied photographs arrive.
              </p>

              <h2 id="changes">Changes to these terms</h2>
              <p>
                These terms may be updated as the site and the clinic&apos;s
                practices evolve. The &ldquo;last updated&rdquo; date at the top
                always reflects the current version. Related reading: the{" "}
                <Link href="/privacy">privacy page</Link> and{" "}
                <Link href="/contact">contact &amp; directions</Link>.
              </p>
            </article>

            <Reveal delay={0.08}>
              <Card className="mt-10 rounded-3xl">
                <CardContent className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    Questions about this page?
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    The fastest way to ask is a phone call; email works too.
                  </p>
                  <div className="flex flex-col gap-2.5 text-base sm:flex-row sm:gap-6">
                    <a
                      href={`tel:${settings.phonePrimary}`}
                      className="link-sweep flex min-h-11 items-center gap-2.5 font-bold text-clay-deep"
                    >
                      <Phone
                        className="h-4 w-4 shrink-0 text-clay-deep dark:text-clay"
                        aria-hidden="true"
                      />
                      {settings.phonePrimaryDisplay}
                    </a>
                    {settings.email && (
                      <a
                        href={`mailto:${settings.email}`}
                        className="link-sweep flex min-h-11 items-center gap-2.5 break-all font-bold text-clay-deep"
                      >
                        <Mail
                          className="h-4 w-4 shrink-0 text-clay-deep dark:text-clay"
                          aria-hidden="true"
                        />
                        {settings.email}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
