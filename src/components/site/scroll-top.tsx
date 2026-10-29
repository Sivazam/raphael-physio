"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { ArrowUp } from "lucide-react";

declare global {
  interface Window {
    __lenis?: {
      scrollTo: (
        target: number | string | HTMLElement,
        options?: { duration?: number; offset?: number; immediate?: boolean },
      ) => void;
    };
  }
}

/** How far down (px) before the button earns its place. */
const SHOW_AFTER = 640;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Floating back-to-top button — appears bottom-right once the visitor has
 * scrolled past the hero, with a gold progress ring that fills as they read.
 * Clicking glides home through the same Lenis easing the site uses.
 */
export function ScrollTop() {
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: reduce ? 0 : 1.05 });
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={goTop}
          initial={{ opacity: 0, scale: 0.6, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 14 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-[0_14px_35px_-12px_oklch(0.25_0.03_60_/_0.55)] backdrop-blur-sm outline-offset-2 transition-colors duration-300 hover:bg-ink-soft hover:text-clay focus-visible:outline-2 focus-visible:outline-clay sm:bottom-8 sm:right-8 sm:h-12 sm:w-12"
          aria-label="Back to top"
          title="Back to top"
        >
          {/* progress ring — gold arc fills as the page is read */}
          <motion.svg
            viewBox="0 0 44 44"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              strokeWidth="1.5"
              className="stroke-primary-foreground/25"
            />
            <motion.circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="stroke-clay"
              style={{ pathLength: progress }}
            />
          </motion.svg>
          <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
