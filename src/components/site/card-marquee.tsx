"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { cn } from "@/lib/utils";

/* useLayoutEffect is a no-op during SSR; fall back to useEffect there. */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface CardMarqueeProps {
  /** One set of cards. It is repeated enough times to fill and loop seamlessly. */
  children: ReactNode;
  /** Drift direction of the idle auto-scroll. Default "left". */
  direction?: "left" | "right";
  /** Idle drift speed in px per second. Default 30 — deliberately slow. */
  speed?: number;
  /** Accessible name of the scrolling region. */
  ariaLabel: string;
  /** Width of the soft edge fades in px. 0 disables. Default 28. */
  fade?: number;
  /** Classes for the outer region (horizontal padding, background…). */
  className?: string;
  /**
   * Classes for each repeated card group. The trailing padding must stay
   * equal to the card gap so the loop is seamless
   * (default "gap-5 pr-5" → pair with gap-5 cards).
   */
  groupClassName?: string;
}

interface DragState {
  startX: number;
  startOffset: number;
}

/**
 * CardMarquee — an auto-scrolling horizontal rail of cards.
 *
 * Behaviour (per product request):
 *  - drifts continuously at a minimal speed while idle;
 *  - stops the moment the pointer hovers (or a card receives keyboard focus),
 *    so visitors can read and click in peace;
 *  - hold & drag with mouse / touch / pen to scrub either way — the drift
 *    resumes on release (once the pointer leaves);
 *  - horizontal trackpad/wheel deltas nudge the rail too;
 *  - no scrollbar, ever — the region is overflow-hidden;
 *  - seamless infinite loop: the card set is repeated just enough times to
 *    cover the viewport plus one copy, then translated modulo one copy width;
 *  - honours prefers-reduced-motion: the drift never starts (drag still works).
 *
 * Accessibility: the region is a labelled landmark; only the first copy of
 * the cards is exposed to assistive tech and the keyboard — the duplicates
 * are aria-hidden + inert, and focus anywhere inside pauses the drift.
 */
export function CardMarquee({
  children,
  direction = "left",
  speed = 30,
  ariaLabel,
  fade = 28,
  className,
  groupClassName = "gap-5 pr-5",
}: CardMarqueeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [copies, setCopies] = useState(2);
  const [dragging, setDragging] = useState(false);

  /* Mutable motion state — deliberately NOT React state (60fps updates). */
  const motion = useRef({
    /** Logical scroll offset. translateX = -mod(offset, copyWidth). */
    offset: 0,
    /** Measured width of one card group (px). */
    copyW: 0,
    hover: false,
    focus: false,
    dragging: false,
    reduced: false,
    /** performance.now() of the last real drag — used to swallow the click. */
    lastDragEnd: 0,
    drag: null as DragState | null,
  });

  const apply = useCallback(() => {
    const track = trackRef.current;
    const w = motion.current.copyW;
    if (!track || w <= 0) return;
    let pos = motion.current.offset % w;
    if (pos < 0) pos += w;
    track.style.transform = `translate3d(${-pos}px, 0, 0)`;
  }, []);

  /* ------------------------------------------------ measure + duplication */
  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current;
    const group = groupRef.current;
    if (!wrap || !group) return;

    const measure = () => {
      const w = group.offsetWidth; // includes the trailing gap padding
      motion.current.copyW = w;
      if (w > 4) {
        const need = Math.ceil(wrap.clientWidth / w) + 1;
        setCopies(Math.min(8, Math.max(2, need)));
      }
      apply();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(group);
    return () => ro.disconnect();
  }, [apply, children]);

  /* ------------------------------------------------------- reduced motion */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      motion.current.reduced = mq.matches;
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* --------------------------------------------------------- the drift rAF */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const m = motion.current;
      const paused = m.hover || m.focus || m.dragging || m.reduced;
      if (!paused && m.copyW > 0 && speed > 0) {
        m.offset += (direction === "left" ? 1 : -1) * speed * dt;
        apply();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [apply, direction, speed]);

  /* ------------------------------------------------------------- dragging */
  /*
   * The drag is tracked with window-level native listeners registered on
   * pointerdown — deliberately WITHOUT setPointerCapture: capturing would
   * retarget the subsequent pointerup to the wrapper, which re-targets the
   * browser's click event to the wrapper too and silently kills plain
   * clicks on the cards. Window listeners follow the pointer anywhere
   * while keeping native click semantics intact.
   */
  const winDrag = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const m = motion.current;
    if (m.drag) return; // a drag is already in flight (e.g. second finger)

    m.drag = { startX: e.clientX, startOffset: m.offset };
    m.dragging = true;
    setDragging(true);

    const move = (ev: PointerEvent) => {
      const mm = motion.current;
      if (!mm.drag) return;
      const dx = ev.clientX - mm.drag.startX;
      if (dx === 0) return;
      /* Dragging right moves the cards right; the modulo handles either way. */
      mm.offset = mm.drag.startOffset - dx;
      apply();
    };

    const up = (ev: PointerEvent) => {
      const mm = motion.current;
      const dx = mm.drag ? ev.clientX - mm.drag.startX : 0;
      const moved = Math.abs(dx) > 6;
      mm.drag = null;
      mm.dragging = false;
      setDragging(false);
      if (moved) mm.lastDragEnd = performance.now();
      /* A mouse press also focuses the card it started on. That focus is
         not keyboard focus, so drop it — otherwise the rail would stay
         paused forever after a drag (focus-pause is for keyboard users). */
      const ae = document.activeElement;
      if (
        moved &&
        ae instanceof HTMLElement &&
        wrapRef.current?.contains(ae) &&
        !ae.matches(":focus-visible")
      ) {
        ae.blur();
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      winDrag.current = null;
    };

    winDrag.current = { move, up };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /* If the component unmounts mid-drag, release the window listeners. */
  useEffect(() => {
    return () => {
      const wd = winDrag.current;
      if (wd) {
        window.removeEventListener("pointermove", wd.move);
        window.removeEventListener("pointerup", wd.up);
        window.removeEventListener("pointercancel", wd.up);
      }
    };
  }, []);

  /* Swallow the click that follows a drag so cards never "navigate by accident". */
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (m.lastDragEnd && performance.now() - m.lastDragEnd < 200) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /* ------------------------------------------------ trackpad / wheel input */
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    motion.current.offset += e.deltaX;
    apply();
  };

  /* -------------------------------------------------------------- render */
  const style: CSSProperties = {
    touchAction: "pan-y", // keep vertical page scrolling free on touch
    userSelect: dragging ? "none" : undefined,
    cursor: dragging ? "grabbing" : "grab",
    ...(fade > 0 && {
      maskImage: `linear-gradient(to right, transparent 0, black ${fade}px, black calc(100% - ${fade}px), transparent 100%)`,
      WebkitMaskImage: `linear-gradient(to right, transparent 0, black ${fade}px, black calc(100% - ${fade}px), transparent 100%)`,
    }),
  };

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden", className)}
      style={style}
      onPointerDown={onPointerDown}
      onPointerEnter={() => {
        motion.current.hover = true;
      }}
      onPointerLeave={() => {
        motion.current.hover = false;
      }}
      onFocus={(e) => {
        /* Pause for keyboard focus only — mouse presses focus cards too,
           and that must not freeze the rail mid-read. */
        motion.current.focus =
          e.target instanceof Element && e.target.matches(":focus-visible");
      }}
      onBlur={() => {
        motion.current.focus = false;
      }}
      onWheel={onWheel}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            ref={i === 0 ? groupRef : undefined}
            className={cn("flex shrink-0", groupClassName)}
            aria-hidden={i > 0 ? true : undefined}
            inert={i > 0 ? true : undefined}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
