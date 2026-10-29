import {
  Activity,
  Bone,
  Dumbbell,
  Footprints,
  HeartPulse,
  MoveVertical,
  PersonStanding,
  type LucideIcon,
} from "lucide-react";

/**
 * Shared helpers for the exercise library routes
 * (/exercises and /exercises/[slug]).
 *
 * Icon mapping mirrors the homepage library preview so a body area keeps the
 * same visual identity across the site.
 */

/** Icon per exercise category slug (seeded slugs — see prisma/seed.ts). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "neck-upper-back": MoveVertical,
  shoulder: Dumbbell,
  "lower-back-core": HeartPulse,
  "hip-glutes": PersonStanding,
  knee: Bone,
  "ankle-foot": Footprints,
};

/** Category icon, falling back to a generic activity glyph. */
export function getCategoryIcon(categorySlug: string | null | undefined): LucideIcon {
  return (categorySlug && CATEGORY_ICONS[categorySlug]) || Activity;
}

/**
 * Extract the 11-character YouTube video id from a watch / youtu.be /
 * shorts / embed / live / nocookie URL. Returns null for anything that
 * isn't a recognisable YouTube link (the CMS only stores YouTube links in
 * this field, but the public renderer must never trust that).
 */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id ?? "") ? (id as string) : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (
        parts.length >= 2 &&
        ["shorts", "embed", "v", "live"].includes(parts[0]!.toLowerCase())
      ) {
        const id = parts[1]!;
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // Not a parseable absolute URL — not embeddable.
  }
  return null;
}

/**
 * Exercise instructions are stored as a single newline-separated string.
 * Split into display steps, dropping stray empty lines.
 */
export function splitInstructions(instructions: string): string[] {
  return instructions
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
}

/**
 * Pretty-print an Indian mobile number for display ("+919959274929" →
 * "+91 99592 74929"). The settings DB currently stores the unspaced form;
 * a shared formatter is proposed in the worklog for the orchestrator.
 */
export function formatPhoneDisplay(phone: string): string {
  if (/^\+91\d{10}$/.test(phone)) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}
