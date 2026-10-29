import { cache } from "react";
import { SITE } from "@/lib/site";
import { type Session } from "@/lib/content";
import { BAKED_HOURS } from "@/lib/baked-content";
import {
  getClinicSettingsRecord,
  getOperatingHoursRows,
} from "@/lib/store";

/**
 * Server-side accessor for editable clinic settings. Values in the database
 * are seeded from the verified constants in @/lib/site — never a second,
 * conflicting hard-coded copy. Admin changes in /admin flow through here.
 *
 * Resolution order: SQLite (Prisma) → Firestore `config/clinic` (mirrored
 * by scripts/firestore-seed.ts and written by /admin/settings on
 * database-less deployments) → the verified constants fallback. `cache()`
 * deduplicates reads within a single request.
 */

export interface ClinicInfo {
  phonePrimary: string;
  phonePrimaryDisplay: string;
  phoneAlternate: string | null;
  phoneAlternateDisplay: string | null;
  email: string | null;
  address: {
    line1: string;
    line2: string | null;
    line3: string | null;
    city: string;
    state: string | null;
    postcode: string | null;
    country: string | null;
  };
  mapsUrl: string;
  googleReviewsUrl: string | null;
  bookingMode: "internal" | "external";
  externalBookingUrl: string | null;
  sundayBookingEnabled: boolean;
  minBookingDateOffset: number;
  maxBookingDateOffset: number;
  slotDurationMinutes: number;
  bookingNotes: string | null;
  smsReminderHours: number;
  social: {
    facebookUrl: string | null;
    instagramUrl: string | null;
    linkedinUrl: string | null;
    youtubeUrl: string | null;
  };
}

export interface DayHours {
  dayOfWeek: number; // 0 = Sunday
  isOpen: boolean;
  sessions: Session[];
}

const FALLBACK: ClinicInfo = {
  phonePrimary: SITE.phonePrimary,
  phonePrimaryDisplay: SITE.phonePrimaryDisplay,
  phoneAlternate: SITE.phoneAlternate,
  phoneAlternateDisplay: SITE.phoneAlternateDisplay,
  email: SITE.email,
  address: {
    line1: SITE.address.line1,
    line2: SITE.address.line2,
    line3: SITE.address.line3,
    city: SITE.address.city,
    state: SITE.address.state,
    postcode: SITE.address.postcode,
    country: SITE.address.country,
  },
  mapsUrl: SITE.mapsUrl,
  googleReviewsUrl: null,
  bookingMode: "internal",
  externalBookingUrl: null,
  sundayBookingEnabled: false,
  minBookingDateOffset: 1,
  maxBookingDateOffset: 30,
  slotDurationMinutes: 30,
  bookingNotes: null,
  smsReminderHours: 24,
  social: {
    facebookUrl: null,
    instagramUrl: null,
    linkedinUrl: null,
    youtubeUrl: null,
  },
};

/** Maps a stored settings record to the public ClinicInfo shape. */
function mapSettingRow(
  row: NonNullable<Awaited<ReturnType<typeof getClinicSettingsRecord>>>
): ClinicInfo {
  return {
    phonePrimary: row.phonePrimary ?? FALLBACK.phonePrimary,
    // Display formatting is a presentation concern — always derive it from
    // the canonical constants (or format the raw number), never store raw
    // unspaced strings in *Display fields.
    phonePrimaryDisplay:
      row.phonePrimary === SITE.phonePrimary
        ? SITE.phonePrimaryDisplay
        : (row.phonePrimary ?? FALLBACK.phonePrimary),
    phoneAlternate: row.phoneAlternate,
    phoneAlternateDisplay:
      row.phoneAlternate === SITE.phoneAlternate
        ? SITE.phoneAlternateDisplay
        : row.phoneAlternate,
    email: row.email,
    address: {
      line1: row.addressLine1,
      line2: row.addressLine2,
      line3: row.addressLine3,
      city: row.city,
      state: row.state,
      postcode: row.postcode,
      country: row.country,
    },
    mapsUrl: row.mapsUrl ?? SITE.mapsUrl,
    googleReviewsUrl: row.googleReviewsUrl,
    bookingMode: row.bookingMode === "external" ? "external" : "internal",
    externalBookingUrl: row.externalBookingUrl,
    sundayBookingEnabled: row.sundayBookingEnabled,
    minBookingDateOffset: row.minBookingDateOffset,
    maxBookingDateOffset: row.maxBookingDateOffset,
    slotDurationMinutes: row.slotDurationMinutes,
    bookingNotes: row.bookingNotes,
    smsReminderHours: row.smsReminderHours,
    social: {
      facebookUrl: row.facebookUrl,
      instagramUrl: row.instagramUrl,
      linkedinUrl: row.linkedinUrl,
      youtubeUrl: row.youtubeUrl,
    },
  };
}

export const getSettings = cache(async (): Promise<ClinicInfo> => {
  // Reads through the dual-path store (SQLite → Firestore); both degrade
  // to null when nothing is stored — the verified constants answer then.
  const row = await getClinicSettingsRecord();
  if (!row) return FALLBACK;
  return mapSettingRow(row);
});

export const getOperatingHours = cache(async (): Promise<DayHours[]> => {
  // SQLite rows → Firestore docs → the baked draft schedule, so every
  // hours surface (header strip, footer, contact, booking) keeps rendering.
  const rows = await getOperatingHoursRows();
  if (rows.length === 0) return BAKED_HOURS;
  return rows;
});
