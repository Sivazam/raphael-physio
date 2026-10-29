import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  kicker: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
  id?: string;
  /** big display title vs standard section title */
  scale?: "display" | "standard";
}

/**
 * Editorial section heading: gold kicker with rule, fluid serif title,
 * optional lede. `tone="dark"` flips the palette for espresso sections.
 */
export function SectionHeading({
  kicker,
  title,
  lede,
  align = "left",
  tone = "light",
  className,
  id,
  scale = "standard",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p
        className={cn(
          "kicker flex items-center gap-3",
          align === "center" && "justify-center",
          dark && "text-clay",
        )}
        id={id}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-px w-8",
            dark ? "bg-clay/70" : "bg-clay-deep/60",
            align === "center" && "w-6",
          )}
        />
        {kicker}
      </p>
      <h2
        className={cn(
          "mt-4 font-semibold tracking-tight",
          scale === "display" ? "display-fluid-1" : "display-fluid-2",
          dark ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            dark ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
