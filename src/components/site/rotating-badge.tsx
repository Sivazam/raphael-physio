import { LogoEmblem } from "@/components/site/logo";
import { cn } from "@/lib/utils";

/**
 * Rotating circular-text badge — the clinic's motto orbits the real
 * emblem like a letterpress seal. Spins slowly (26s); stills on hover
 * and for reduced-motion users. Sized in rem so it scales with the
 * composition around it.
 */
export function RotatingBadge({
  className,
  size = 128,
}: {
  className?: string;
  size?: number;
}) {
  const text = "MISSION TO MAKE MAN MOVING · JAMPET ROAD · ";

  return (
    <div
      className={cn("spin-slow-pause relative select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* orbiting letterpress text */}
      <svg
        viewBox="0 0 100 100"
        className="spin-slow absolute inset-0 h-full w-full"
      >
        <defs>
          <path
            id="badge-orbit"
            d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
          />
        </defs>
        <text
          className="fill-current font-sans text-[7.2px] font-bold uppercase"
          style={{ letterSpacing: "0.14em" }}
        >
          <textPath href="#badge-orbit">{text}</textPath>
        </text>
      </svg>
      {/* emblem centre */}
      <span
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-primary/10"
        style={{ width: size * 0.46, height: size * 0.46 }}
      >
        <LogoEmblem size={Math.round(size * 0.32)} />
      </span>
    </div>
  );
}
