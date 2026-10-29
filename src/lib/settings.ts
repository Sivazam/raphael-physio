import { cache } from "react";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { parseJsonArray, type Session } from "@/lib/content";

/**
 * Server-side accessor for editable clinic settings. Values in the database
 * are seeded from the verified constants in @/lib/site — never a second,
 * conflicting hard-coded copy. Admin changes in /admin flow through here.
 *
 * `cache()` deduplicates reads within a single request.
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

export const getSettings = cache(async (): Promise<ClinicInfo> => {
  try {
    const row = await db.clinicSetting.findUnique({ where: { id: "singleton" } });
    if (!row) return FALLBACK;
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
  } catch {
    // Database unavailable (e.g. before first db:push) — fall back to
    // verified constants so pages still render.
    return FALLBACK;
  }
});

export const getOperatingHours = cache(async (): Promise<DayHours[]> => {
  try {
    const rows = await db.operatingHour.findMany({ orderBy: { dayOfWeek: "asc" } });
    if (rows.length === 0) return [];
    return rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      isOpen: r.isOpen,
      sessions: parseJsonArray<Session>(r.sessions),
    }));
  } catch {
    return [];
  }
});
