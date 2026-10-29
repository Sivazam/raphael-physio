import {
  Activity,
  Bandage,
  BedDouble,
  Bone,
  Brain,
  Dumbbell,
  HeartPulse,
  PersonStanding,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * Per-service anatomical / care glyph, keyed by service slug (seeded slugs —
 * see prisma/seed.ts). Gives each services-list row a small visual anchor at
 * rest, matching the body-area icon language of the exercise library.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "orthopaedic-physiotherapy": Bone,
  "back-neck-pain-care": Activity,
  "post-surgical-rehabilitation": Bandage,
  "sports-injury-rehabilitation": Dumbbell,
  "neurological-rehabilitation": Brain,
  "inpatient-daycare-rehabilitation": BedDouble,
  acupuncture: Sparkles,
  "womens-health-physiotherapy": HeartPulse,
  "chiropractic-osteopathy": PersonStanding,
};

/** Service icon, falling back to a generic activity glyph. */
export function getServiceIcon(
  serviceSlug: string | null | undefined,
): LucideIcon {
  return (serviceSlug && SERVICE_ICONS[serviceSlug]) || Activity;
}
