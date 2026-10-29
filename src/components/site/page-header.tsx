import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";

interface PageHeaderProps {
  kicker: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}

/**
 * Shared editorial header band for inner pages: breadcrumb, gold kicker
 * with rule, fluid display title, optional lede — on warm paper with a
 * hairline bottom edge.
 */
export function PageHeader({ kicker, title, lede, children }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-paper">
      {/* quiet gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full opacity-[0.12]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.82 0.11 90), transparent)",
        }}
      />
      <div className="site-container relative pb-14 pt-12 sm:pb-20 sm:pt-16">
        <Reveal>
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <li>
                <Link href="/" className="link-sweep hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              </li>
              <li aria-current="page" className="text-clay-deep">
                {kicker}
              </li>
            </ol>
          </nav>
          <p className="kicker flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block h-px w-8 bg-clay-deep/60"
            />
            {kicker}
          </p>
          <h1 className="display-fluid-1 mt-5 max-w-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {lede && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {lede}
            </p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
