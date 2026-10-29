"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  CalendarCheck,
  Clock,
  MapPin,
  Phone,
} from "lucide-react";
import { LogoEmblem } from "@/components/site/logo";
import { Magnetic } from "@/components/site/magnetic";
import { RotatingBadge } from "@/components/site/rotating-badge";

/* ------------------------------------------------------------------ *
 * HERO — "The first step", editorial cover treatment.
 *
 * FIT CONTRACT (issue-1 fix, rebuilt):
 *  - The section uses `min-height`, never a fixed height. Content can
 *    therefore never be clipped by `overflow-hidden`, and the band
 *    that follows (gold marquee) sits in normal flow — it can never
 *    slide over the hero, at any viewport, zoom, or iframe quirk.
 *  - On lg+ the min-height is the viewport minus the 105px sticky
 *    header, so on typical screens the whole cover composes inside
 *    exactly one screen; on unusually short viewports it grows a few
 *    pixels instead of eating its own content.
 *  - The headline is fluid in BOTH width and height
 *    (clamp with vw + vh terms) so short widescreen laptops (the exact
 *    shape the bug screenshot came from) keep the full banner visible.
 *  - The photograph keeps its aspect ratio but obeys a svh cap, so it
 *    yields space before anything else has to.
 *
 * MOTION CONTRACT:
 *  - Masked-line headline rise (custom soft ease).
 *  - Photo revealed by clip-path wipe; gentle scroll parallax drift.
 *  - Gold frame draws in behind the photo.
 *  - Rotating motto badge (26s) + magnetic primary CTA.
 *  - Reduced motion: entrances collapse to fades; parallax, spin and
 *    magnetism are disabled.
 * ------------------------------------------------------------------ */

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function MaskedLine({
  children,
  delay,
  reduce,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
      <motion.span
        className={`block will-change-transform ${className ?? ""}`}
        initial={reduce ? { opacity: 0 } : { y: "115%" }}
        animate={reduce ? { opacity: 1 } : { y: "0%" }}
        transition={
          reduce
            ? { duration: 0.5, delay }
            : { duration: 0.95, delay, ease: EASE_OUT }
        }
      >
        {children}
      </motion.span>
    </span>
  );
}

export interface HeroProps {
  phoneDisplay: string;
  phoneHref: string;
  hoursLine: string; // already 12-hour formatted
}

export function Hero({ phoneDisplay, phoneHref, hoursLine }: HeroProps) {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);

  /* Gentle parallax on the photograph — ±22px across the hero's exit. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 22]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -30]);

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE_OUT },
  });

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-background lg:flex lg:min-h-[calc(100svh-105px)] lg:flex-col"
    >
      {/* --- background layers (decorative bleed only) ---------------- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          style={{ y: glowY }}
          className="absolute -right-40 -top-48 h-[36rem] w-[36rem] rounded-full opacity-[0.15]"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, oklch(0.82 0.11 90), transparent)",
            }}
          />
        </motion.div>
        {/* ghosted oversized "MOVe" baseline word */}
        <p className="absolute -bottom-6 left-0 hidden select-none font-display text-[11rem] font-semibold italic leading-none tracking-tighter text-primary/[0.035] xl:block">
          Moving
        </p>
      </div>

      {/* --- main composition ----------------------------------------- */}
      <div className="site-container relative flex-1 pb-10 pt-10 sm:pb-12 sm:pt-14 lg:flex lg:min-h-0 lg:items-center lg:gap-12 lg:pb-8 lg:pt-8 [@media(min-width:1024px)_and_(max-height:700px)]:pt-5 [@media(min-width:1024px)_and_(max-height:700px)]:pb-5">
        {/* left column — copy */}
        <div className="lg:min-w-0 lg:flex-1">
          <motion.p className="kicker flex items-center gap-3" {...fadeUp(0.05)}>
            <motion.span
              aria-hidden="true"
              className="inline-block h-px w-10 bg-clay-deep"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
              style={{ transformOrigin: "left" }}
            />
            Rajamahendravaram · In-Patient &amp; Day Care
          </motion.p>

          <h1
            id="hero-heading"
            className="display-fluid-hero mt-5 font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-6"
          >
            <MaskedLine delay={0.15} reduce={reduce}>
              Getting back to
            </MaskedLine>
            <MaskedLine delay={0.27} reduce={reduce}>
              everyday life,
            </MaskedLine>
            <MaskedLine
              delay={0.39}
              reduce={reduce}
              className="font-display font-medium italic text-clay-deep"
            >
              one supported step
            </MaskedLine>
            <MaskedLine delay={0.51} reduce={reduce}>
              at a time.
            </MaskedLine>
          </h1>

          {/* motto epigraph */}
          <motion.blockquote
            className="mt-4 flex items-start gap-2.5"
            {...fadeUp(0.66)}
          >
            <span
              aria-hidden="true"
              className="mt-1 font-display text-2xl leading-none text-clay-deep/60"
            >
              &ldquo;
            </span>
            <p className="font-display text-base italic text-muted-foreground sm:text-lg">
              Mission To Make Man Moving.
              <span className="sr-only">
                {" "}
                — the motto written inside our clinic emblem.
              </span>
            </p>
          </motion.blockquote>

          <motion.p
            className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
            {...fadeUp(0.78)}
          >
            Physiotherapy assessment, structured recovery programmes, and
            in-patient &amp; day care rehabilitation on Jampet Road.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-7 flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4"
            {...fadeUp(0.9)}
          >
            <Magnetic strength={0.25} className="inline-block">
              <Link
                href="/book"
                className="btn btn-gold h-[52px] text-[13px] sm:h-[56px] sm:text-sm"
              >
                <span className="btn-sweep" aria-hidden="true" />
                <CalendarCheck className="relative h-[18px] w-[18px]" aria-hidden="true" />
                Book an appointment
                <ArrowRight
                  className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Magnetic>
            <Magnetic strength={0.18} className="inline-block">
              <Link
                href="/services"
                className="btn btn-outline h-[52px] text-[13px] sm:h-[56px] sm:text-sm"
              >
                <span className="btn-sweep" aria-hidden="true" />
                Explore our services
                <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        {/* right column — editorial portrait composition */}
        <motion.div
          className="relative mt-12 sm:mt-14 lg:mt-0 lg:w-[42%] lg:max-w-[500px] lg:shrink-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
        >
          {/* gold offset frame */}
          <motion.div
            aria-hidden="true"
            className="absolute -left-3.5 -top-3.5 hidden h-full w-full rounded-3xl border-2 border-clay/60 sm:block lg:-left-5 lg:-top-5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE_OUT }}
          />

          {/* photograph — aspect-driven with a viewport-height cap so it
              yields space on short screens instead of pushing the fold */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl shadow-primary/20 sm:aspect-[5/5] lg:aspect-auto lg:h-[min(58svh,34rem)]">
            <motion.div
              className="absolute inset-0"
              style={{ y: photoY }}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { clipPath: "inset(100% 0% 0% 0%)", scale: 1.06 }
              }
              animate={
                reduce
                  ? { opacity: 1 }
                  : { clipPath: "inset(0% 0% 0% 0%)", scale: 1 }
              }
              transition={{ duration: 1.15, delay: 0.4, ease: EASE_OUT }}
            >
              <Image
                src="/images/photo-therapist-band.jpg"
                alt="Illustrative photo: a physiotherapist guiding an older patient through a resistance-band exercise in a bright clinic."
                fill
                priority
                sizes="(min-width: 1024px) 44vw, (min-width: 640px) 70vw, 92vw"
                className="object-cover"
              />
              {/* soft vignette to seat the chip and badge */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-primary/45 via-transparent to-primary/10"
              />
            </motion.div>

            {/* floating format chip — top right, inside the photo */}
            <motion.div
              className="absolute right-4 top-4 sm:right-5 sm:top-5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease: EASE_OUT }}
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/90 px-4 py-3 shadow-lg shadow-primary/20 backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <LogoEmblem size={34} />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-foreground">
                    In-patient &amp; day care
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    A centre, not just a clinic
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* rotating motto badge — overlaps the photo's top-left corner,
              floating in the whitespace between the columns */}
          <motion.div
            className="absolute -left-7 -top-9 hidden text-primary sm:block lg:-left-9 lg:-top-10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 1.15, ease: EASE_OUT }}
          >
            <Magnetic strength={0.15}>
              <RotatingBadge size={124} />
            </Magnetic>
          </motion.div>
        </motion.div>
      </div>

      {/* --- hero foot: facts + scroll cue (hairline-topped row) ------- */}
      <motion.div
        className="relative border-t border-border/60 bg-background/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.25 }}
      >
        <div className="site-container grid gap-x-8 gap-y-4 py-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Where
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                Beside Sunstar Hospital, Jampet Road
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Hours
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">{hoursLine}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-clay-deep" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                To reach us
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                <a
                  href={phoneHref}
                  className="link-sweep font-semibold text-primary"
                >
                  {phoneDisplay}
                </a>
              </p>
            </div>
          </div>
          {/* scroll cue */}
          <div className="hidden items-center gap-3 lg:flex" aria-hidden="true">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Scroll
            </span>
            <span className="relative h-10 w-px overflow-hidden bg-border">
              <motion.span
                className="absolute inset-x-0 top-0 h-4 bg-clay-deep"
                animate={reduce ? undefined : { y: [-16, 40] }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                }
              />
            </span>
            <ArrowDown className="h-3.5 w-3.5 text-clay-deep" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
