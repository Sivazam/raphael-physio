"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SiteLogo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/team", label: "Our Team" },
  { href: "/exercises", label: "Exercises" },
  { href: "/stories", label: "Stories" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export interface HeaderProps {
  phoneDisplay: string;
  phoneHref: string;
  hoursSummary: string;
}

/**
 * Sticky editorial header.
 *
 * Structure kept at exactly 105px (36px trust strip + 68px main bar +
 * 1px border) so the hero's `calc(100svh - 105px)` math stays true.
 * The main bar reads the scroll position and deepens its frost —
 * transparent-feeling at the very top, porcelain glass once reading
 * begins. Nav links use the site-wide underline sweep; the Book pill
 * is solid gold.
 */
export function SiteHeader({ phoneDisplay, phoneHref, hoursSummary }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Local trust strip */}
      <div className="hidden bg-ink text-primary-foreground lg:block">
        <div className="site-container flex h-9 items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
          <p className="flex items-center gap-2.5 text-primary-foreground/85">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-clay"
            />
            In-Patient &amp; Day Care Centre · Jampet Road, Rajamahendravaram
          </p>
          <div className="flex items-center gap-6">
            <span className="normal-case tracking-normal text-primary-foreground/75">
              {hoursSummary}
            </span>
            <a
              href={phoneHref}
              className="link-sweep inline-flex items-center gap-1.5 text-primary-foreground"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main bar — frosts as you scroll */}
      <div
        className={cn(
          "border-b transition-all duration-500",
          scrolled
            ? "border-border/70 bg-background/88 shadow-[0_18px_40px_-30px_oklch(0.255_0.019_62_/_0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
            : "border-border/50 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55",
        )}
      >
        <div className="site-container flex h-[4.25rem] items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            aria-label="Raphael Physiotherapy & Rehabilitation Centre — home"
          >
            <SiteLogo />
          </Link>

          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "link-sweep whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold tracking-wide transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring",
                        active
                          ? "text-primary"
                          : "text-foreground/75 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2.5">
            {/* gold book pill */}
            <Link
              href="/book"
              className="btn btn-gold hidden h-11 text-[12px] sm:inline-flex lg:h-10 xl:px-4"
            >
              <span className="btn-sweep" aria-hidden="true" />
              Book Appointment
            </Link>
            <a
              href={phoneHref}
              aria-label={`Call the centre on ${phoneDisplay}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent sm:hidden"
            >
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent xl:hidden"
                  aria-label="Open navigation menu"
                  aria-expanded={open}
                >
                  {open ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[20rem] flex-col gap-0 p-0"
              >
                <SheetHeader className="border-b border-border/70 p-5">
                  <SheetTitle asChild>
                    <div>
                      <SiteLogo compact />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Rajamahendravaram, Andhra Pradesh
                      </p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-3">
                  <ul className="space-y-1">
                    {NAV_ITEMS.map((item, i) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            style={{ transitionDelay: `${i * 30}ms` }}
                            className={cn(
                              "flex items-center rounded-xl px-3 py-3 text-base font-semibold transition-colors hover:bg-accent",
                              active ? "bg-accent text-primary" : "text-foreground/85",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="space-y-3 border-t border-border/70 p-5">
                  <Link
                    href="/book"
                    onClick={() => setOpen(false)}
                    className="btn btn-gold h-12 w-full text-[13px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    Book Appointment
                  </Link>
                  <a
                    href={phoneHref}
                    className="btn btn-outline h-11 w-full text-[12px]"
                  >
                    <span className="btn-sweep" aria-hidden="true" />
                    <Phone className="relative h-4 w-4" aria-hidden="true" />
                    {phoneDisplay}
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
