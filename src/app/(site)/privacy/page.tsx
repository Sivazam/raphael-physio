import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Raphael Physiotherapy & Rehabilitation Centre handles the information you submit through this website — what we collect, why, who sees it, and how to have it removed. Plain English, no jargon.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "2026-10-27";
const LAST_UPDATED_DISPLAY = "27 October 2026";

const SECTIONS = [
  { id: "collect", label: "What this website collects" },
  { id: "why", label: "Why we collect it" },
  { id: "who", label: "Who sees your information" },
  { id: "external", label: "Google Maps & external links" },
  { id: "retention", label: "How long we keep it" },
  { id: "choices", label: "Your choices" },
  { id: "changes", label: "Changes to this page" },
] as const;

export default async function PrivacyPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        kicker="Privacy"
        title="Your information, in plain language"
        lede="This page explains what this website collects, why, and what you can ask us to do about it. Written to be read — not to be skimmed past."
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
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    The short version
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    Forms on this website collect only what&apos;s needed to get
                    back to you — your name, a phone number, optionally an email,
                    and your message. We don&apos;t sell your details, we don&apos;t
                    share them for advertising, and you can ask us to remove them.
                    The rest of this page explains the details.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This page is written in plain language for patients and
                    families — it is not a formal legal document. The clinic will
                    have it reviewed legally before launch, as part of its launch
                    requirements.
                  </p>
                </CardContent>
              </Card>
            </Reveal>

            <article className="prose-editorial mt-10">
              <h2 id="collect">What this website collects</h2>
              <p>
                This website has no accounts, no sign-in, and no online payments.
                The only personal information it collects is what you choose to
                type into a form:
              </p>
              <ul>
                <li>
                  <strong>The appointment request form</strong> — your name, phone
                  number, optionally an email address, the service, date, and time
                  you&apos;re requesting, and any notes you add.
                </li>
                <li>
                  <strong>The contact form</strong> — your name, phone number,
                  optionally an email address, the topic you pick, and your
                  message.
                </li>
              </ul>
              <p>
                Browsing the site itself doesn&apos;t require any personal
                details. Like most websites, the server keeps brief technical
                request logs for security and operation. This website does not
                use advertising or tracking cookies.
              </p>
              <p>
                Health records are <em>never</em> collected through this website.
                Please don&apos;t send medical reports or sensitive health
                details through these forms — bring them to your appointment
                instead.
              </p>

              <h2 id="why">Why we collect it</h2>
              <p>
                For one purpose: to respond to you. Your details let the clinic
                team call or write back about the request you made — confirming an
                appointment time, answering an enquiry, or acknowledging feedback.
                That is the whole of it.
              </p>

              <h2 id="who">Who sees your information</h2>
              <p>
                Your message goes directly to the clinic&apos;s own system and is
                seen by the staff who handle messages and appointments. We do not
                sell your information, and we do not share it with third parties
                for their marketing. There is no advertising network reading these
                forms.
              </p>

              <h2 id="external">Google Maps &amp; external links</h2>
              <p>
                Buttons for directions open{" "}
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Maps
                </a>{" "}
                — from that point, you&apos;re on Google&apos;s website and their
                privacy practices apply, not ours. The same applies to any other
                external link: we point to them, but we don&apos;t control them.
              </p>

              <h2 id="retention">How long we keep it</h2>
              <p>
                Form submissions are kept only as long as they&apos;re needed to
                respond to you, and as part of the clinic&apos;s reasonable
                records. Appointment records follow the clinic&apos;s normal
                record-keeping practice. If you&apos;d like a message you sent
                removed after we&apos;ve replied, just ask — details are below.
              </p>

              <h2 id="choices">Your choices</h2>
              <p>
                You can ask the clinic to correct or remove the details you
                submitted through this website at any time. The fastest way is a
                phone call; email works too:
              </p>
              <div className="not-prose my-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 text-base">
                <p className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                  <a
                    href={`tel:${settings.phonePrimary}`}
                    className="link-sweep font-bold text-clay-deep"
                  >
                    {settings.phonePrimaryDisplay}
                  </a>
                </p>
                {settings.email && (
                  <p className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
                    <a
                      href={`mailto:${settings.email}`}
                      className="link-sweep break-all font-bold text-clay-deep"
                    >
                      {settings.email}
                    </a>
                  </p>
                )}
              </div>
              <p>
                Removal requests about website submissions are handled by the
                clinic directly. Records held about your care, if any, follow a
                separate process — ask at the centre about that.
              </p>

              <h2 id="changes">Changes to this page</h2>
              <p>
                If our data practices change, this page changes with them — and
                so does the date at the top. Related reading:{" "}
                <Link href="/terms">our terms of use</Link> and the{" "}
                <Link href="/contact">contact page</Link>.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
