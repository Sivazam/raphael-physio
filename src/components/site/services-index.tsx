"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getServiceIcon } from "@/lib/service-icons";

/* ------------------------------------------------------------------ *
 * SERVICES INDEX — the editorial "table of contents" pattern.
 *
 * Desktop (lg+): hovering a row floats a photograph that trails the
 * cursor on a spring — the signature interaction of top-tier studio
 * sites. The row itself tints espresso with ivory type as it hovers.
 * Touch / small screens: rows carry a compact inline thumbnail and
 * the preview is disabled entirely.
 *
 * Reduced motion: no trailing image, no row transforms — just colour.
 * ------------------------------------------------------------------ */

export interface IndexService {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  summary: string;
  imageUrl: string | null;
  categoryName: string | null;
}

/** Shared rest-state tile classes for service glyph tiles. */
const SERVICE_TILE =
  "relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-clay/30 bg-gold-soft/60 text-clay-deep transition-colors duration-300 group-hover:border-clay/60 group-hover:bg-clay/15 group-hover:text-clay lg:flex";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ServicesIndex({ services }: { services: IndexService[] }) {
  const reduce = useReducedMotion() ?? false;
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 160, damping: 18, mass: 0.5 });
  const py = useSpring(my, { stiffness: 160, damping: 18, mass: 0.5 });

  const active = services.find((s) => s.id === activeId) ?? null;

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      onMouseLeave={() => setActiveId(null)}
      className="relative"
    >
      {/* cursor-trailing photograph (desktop pointer + motion only) */}
      {!reduce && (
        <AnimatePresence>
          {active?.imageUrl && (
            <motion.div
              key={active.id}
              aria-hidden="true"
              className="pointer-events-none absolute z-20 hidden lg:block"
              style={{ x: px, y: py }}
              initial={{ opacity: 0, scale: 0.82, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <div className="relative h-56 w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-clay/50 shadow-2xl shadow-primary/35 xl:h-64 xl:w-52">
                <Image
                  src={active.imageUrl}
                  alt=""
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* the index */}
      <ul className="border-t border-border/70">
        {services.map((service, i) => {
          const num = String(i + 1).padStart(2, "0");
          const Glyph = getServiceIcon(service.slug);
          return (
            <li key={service.id} className="border-b border-border/70">
              <Link
                href={`/services/${service.slug}`}
                onMouseEnter={() => setActiveId(service.id)}
                onFocus={() => setActiveId(service.id)}
                className="group relative flex items-center gap-4 overflow-hidden py-5 pr-4 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:gap-6 sm:py-6 lg:py-7"
              >
                {/* espresso fill sweeps up on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                />
                <span
                  className="relative font-sans text-xs font-bold tracking-[0.18em] text-clay-deep transition-colors duration-300 group-hover:text-clay sm:text-sm"
                >
                  {num}
                </span>

                {/* anatomical glyph — a visual anchor at rest (desktop) */}
                <span className={SERVICE_TILE}>
                  <Glyph className="h-5.5 w-5.5" aria-hidden="true" />
                </span>

                {/* inline thumbnail for touch/small screens */}
                {service.imageUrl && (
                  <span className="relative block h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 sm:h-[4.5rem] sm:w-20 lg:hidden">
                    <Image
                      src={service.imageUrl}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </span>
                )}

                <span className="relative min-w-0 flex-1">
                  <span className="block font-display text-xl font-semibold leading-tight tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary-foreground sm:text-2xl lg:text-[2rem]">
                    {service.name}
                  </span>
                  <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground transition-colors duration-300 group-hover:text-primary-foreground/70">
                    {service.tagline ?? service.summary}
                  </span>
                </span>

                {service.categoryName && (
                  <span
                    className="relative hidden shrink-0 rounded-full border border-border/80 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 group-hover:border-primary-foreground/30 group-hover:text-primary-foreground/80 md:inline-block"
                  >
                    {service.categoryName}
                  </span>
                )}

                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 transition-all duration-300 group-hover:border-clay group-hover:bg-clay group-hover:text-primary sm:h-12 sm:w-12">
                  <ArrowUpRight
                    className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-45 sm:h-5 sm:w-5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
