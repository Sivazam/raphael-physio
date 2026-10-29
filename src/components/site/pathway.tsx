"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ClipboardList, Route, Stethoscope, Home } from "lucide-react";

/* ------------------------------------------------------------------ *
 * PATHWAY — "How care works", told as a scroll-linked progress rail.
 *
 * A gold rail fills as the steps cross the viewport; each step lifts
 * in with a masked number. Static and fully readable without motion.
 * Honest copy: describes the clinic's actual process shape
 * (assess → plan → treat → return) without inventing outcomes.
 * ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: ClipboardList,
    title: "Assess",
    text: "A thorough first assessment — history, movement, and what daily life actually demands of you.",
  },
  {
    icon: Route,
    title: "Plan",
    text: "A structured programme agreed with you and your family: frequency, format, and what progress will look like.",
  },
  {
    icon: Stethoscope,
    title: "Treat",
    text: "Hands-on therapy and graded exercise across our sessions — in-patient or day care, as clinically right.",
  },
  {
    icon: Home,
    title: "Return",
    text: "Planned discharge home with clear guidance, and therapist-reviewed exercises you can keep following.",
  },
] as const;

export function Pathway() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.45"],
  });
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative">
      {/* progress rail */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-[27px] top-6 w-px bg-border sm:left-[31px]"
      >
        <motion.div
          className="h-full w-full origin-top bg-gradient-to-b from-clay to-clay-deep"
          style={reduce ? { scaleY: 1 } : { scaleY: railScale }}
        />
      </div>

      <ol className="space-y-10 sm:space-y-12">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            className="relative flex gap-5 sm:gap-7"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* step node */}
            <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-clay/50 bg-card shadow-sm sm:h-16 sm:w-16">
              <step.icon
                className="h-6 w-6 text-clay-deep sm:h-7 sm:w-7"
                aria-hidden="true"
              />
              <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink font-sans text-[10px] font-bold text-clay">
                {i + 1}
              </span>
            </span>
            <div className="pt-1 sm:pt-2">
              <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
