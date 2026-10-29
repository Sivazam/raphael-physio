"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoEmblem } from "@/components/site/logo";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Editorial curtain intro — a one-time (per session) espresso curtain
 * that lifts to reveal the page. The clinic emblem and motto appear on
 * the curtain, so the very first second already feels like the brand.
 *
 * - Skipped entirely for reduced-motion users and repeat views
 *   (sessionStorage flag).
 * - Hard ceiling of ~1.5s so it can never trap a slow device.
 */
export function CurtainIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem("raphael-intro-seen");
    if (reduce || seen) return;
    sessionStorage.setItem("raphael-intro-seen", "1");
    // setState inside a rAF callback (not synchronously in the effect body)
    const raf = requestAnimationFrame(() => setShow(true));
    const failSafe = window.setTimeout(() => setShow(false), 1600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="curtain"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          aria-hidden="true"
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
              <LogoEmblem size={58} />
            </span>
            <motion.p
              className="font-display text-xl italic text-clay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              Mission To Make Man Moving
            </motion.p>
            <motion.span
              className="block h-px w-16 origin-left bg-clay/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
