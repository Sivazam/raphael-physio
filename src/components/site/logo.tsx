import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The clinic's real logo — client-supplied artwork (golden crescent, red
 * runner, arched lettering; motto "Mission To Make Man Moving").
 * Transparent PNG, kept in public/images/logo.png. The text inside the
 * emblem is illegible below ~140px, so it is always paired with a clean
 * typographic lockup when displayed small.
 */
export function LogoEmblem({
  className,
  size = 44,
  priority = false,
  responsive = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
  /**
   * Size with Tailwind classes instead of the fixed inline style, so the
   * emblem can step down on narrow viewports (36px below `sm`, 44px from
   * `sm` up). `size` still sets the intrinsic width/height attributes.
   */
  responsive?: boolean;
}) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      aria-hidden="true"
      className={cn(
        "shrink-0 select-none",
        responsive && "h-9 w-9 sm:h-11 sm:w-11",
        className,
      )}
      style={responsive ? undefined : { width: size, height: size }}
    />
  );
}

export function SiteLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <LogoEmblem size={44} priority responsive />
      <span className="flex flex-col leading-none">
        <span className="whitespace-nowrap font-display text-[15px] font-semibold tracking-tight text-foreground sm:text-lg">
          Raphael Physiotherapy
        </span>
        {!compact && (
          <span className="mt-1 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-[10px] sm:tracking-[0.16em]">
            &amp; Rehabilitation Centre
          </span>
        )}
      </span>
    </span>
  );
}
