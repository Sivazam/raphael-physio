import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoEmblem } from "@/components/site/logo";
import {
  SITE,
  SITE_ADDRESS_ONE_LINE,
  formatPhoneHref,
} from "@/lib/site";

/**
 * Root-level 404 — shown for URLs that match no route at all.
 *
 * It renders inside the *root* layout only (no site header/footer, since
 * route groups don't wrap unmatched URLs), so it carries its own minimal
 * branded chrome: wordmark, call link, address strip. Invalid slugs inside
 * existing sections (e.g. /services/unknown) are handled by the richer
 * `src/app/(site)/not-found.tsx` with the full site chrome.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="site-container flex items-center justify-between py-4">
          <Link
            href="/"
            aria-label={`${SITE.name} — home`}
            className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <LogoEmblem size={40} priority />
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              Raphael Physiotherapy
            </span>
          </Link>
          <a
            href={formatPhoneHref(SITE.phonePrimary)}
            className="flex items-center gap-2 rounded-md text-sm font-medium text-foreground transition-colors hover:text-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Phone className="size-4" aria-hidden="true" />
            {SITE.phonePrimaryDisplay}
          </a>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl text-center">
          <p className="kicker">404 — page not found</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            This page seems to have moved on.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            The address may be mistyped, or the page may have been retired.
            The centre itself hasn&rsquo;t — everything starts from the home
            page, or you can simply call us.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to the home page
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={formatPhoneHref(SITE.phonePrimary)}>
                <Phone className="size-4" aria-hidden="true" />
                {SITE.phonePrimaryDisplay}
              </a>
            </Button>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-border/60">
        <div className="site-container flex flex-col gap-2 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="max-w-md">{SITE_ADDRESS_ONE_LINE}</p>
          <p className="font-display italic text-foreground/70">
            &ldquo;{SITE.motto}&rdquo;
          </p>
        </div>
      </footer>
    </div>
  );
}
