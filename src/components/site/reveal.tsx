"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "figure";
  /** visual flavour of the entrance */
  variant?: "rise" | "blur" | "line";
}

/**
 * Scroll-entrance wrapper with three editorial flavours:
 *  - rise  : classic masked lift (default)
 *  - blur  : soft focus pull, for photography
 *  - line  : rise + a hairline rule that draws in above the content
 *
 * Honours prefers-reduced-motion by rendering content immediately.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  variant = "rise",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const initial =
    variant === "blur"
      ? { opacity: 0, y: 14, filter: "blur(6px)" }
      : { opacity: 0, y: 24 };
  const whileInView =
    variant === "blur"
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 1, y: 0 };

  return (
    <Tag
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: variant === "blur" ? 0.75 : 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {variant === "line" && (
        <span
          aria-hidden="true"
          className="mb-5 block h-px w-16 origin-left bg-clay/70"
        />
      )}
      {children}
    </Tag>
  );
}
