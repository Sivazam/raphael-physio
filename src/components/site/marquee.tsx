import { Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

function MarqueeRow({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden ? undefined : true}
      className={cn(
        "flex shrink-0 items-center gap-8 pr-8 sm:gap-12 sm:pr-12",
        hidden && "sr-only",
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-8 sm:gap-12">
          <span className="whitespace-nowrap font-display text-lg italic tracking-tight sm:text-xl">
            {item}
          </span>
          <Sparkle
            className="h-4 w-4 shrink-0 opacity-70"
            aria-hidden={hidden ? undefined : true}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * Gold marquee band — an infinite ticker of the clinic's real care
 * formats and programmes. The band that follows the hero, by design.
 *
 * Accessibility: the visible track is aria-hidden (it repeats); the
 * same phrases are provided once, off-screen, for assistive tech.
 * Pauses on hover; static for reduced motion.
 */
export function MarqueeBand({
  items,
  reverse = false,
  duration = 38,
  className,
}: {
  items: string[];
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden bg-clay py-4 sm:py-5", className)}>
      <MarqueeRow items={items} hidden />
      <div
        className={cn("marquee", reverse && "marquee-reverse")}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        <MarqueeRow items={items} />
        <MarqueeRow items={items} />
      </div>
    </div>
  );
}
