import type { Metadata } from "next";

import {
  getClinicSettingsRecord,
  getOperatingHoursRows,
} from "@/lib/store";
import { SettingsForm } from "../../_components/settings-form";
import type { SettingsForm as SettingsFormType } from "../../_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clinic settings",
};

export default async function AdminSettingsPage() {
  // Dual-path reads: SQLite when the database exists, Firestore otherwise.
  const [row, hourRows] = await Promise.all([
    getClinicSettingsRecord(),
    getOperatingHoursRows(),
  ]);

  // Full 0–6 day grid; any missing row renders as closed with no sessions
  // (and saving creates it).
  const byDay = new Map<number, (typeof hourRows)[number]>(
    hourRows.map((h) => [h.dayOfWeek, h] as [number, (typeof hourRows)[number]])
  );
  const hours = Array.from({ length: 7 }, (_, day) => {
    const h = byDay.get(day);
    return {
      dayOfWeek: day,
      isOpen: h?.isOpen ?? false,
      sessions: h?.sessions ?? [],
    };
  });

  const initial: SettingsFormType = {
    phonePrimary: row?.phonePrimary ?? "",
    phoneAlternate: row?.phoneAlternate ?? "",
    email: row?.email ?? "",
    addressLine1: row?.addressLine1 ?? "",
    addressLine2: row?.addressLine2 ?? "",
    addressLine3: row?.addressLine3 ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    postcode: row?.postcode ?? "",
    country: row?.country ?? "",
    mapsUrl: row?.mapsUrl ?? "",
    googleReviewsUrl: row?.googleReviewsUrl ?? "",
    bookingMode: row?.bookingMode === "external" ? "external" : "internal",
    externalBookingUrl: row?.externalBookingUrl ?? "",
    sundayBookingEnabled: row?.sundayBookingEnabled ?? false,
    minBookingDateOffset: row?.minBookingDateOffset ?? 1,
    maxBookingDateOffset: row?.maxBookingDateOffset ?? 30,
    slotDurationMinutes: row?.slotDurationMinutes ?? 30,
    bookingNotes: row?.bookingNotes ?? "",
    facebookUrl: row?.facebookUrl ?? "",
    instagramUrl: row?.instagramUrl ?? "",
    linkedinUrl: row?.linkedinUrl ?? "",
    youtubeUrl: row?.youtubeUrl ?? "",
    hours,
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Configuration</p>
        <h1 className="font-display text-3xl tracking-tight">
          Clinic settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact details, booking rules, social links and operating hours.
          Changes apply across the public website immediately after saving.
        </p>
      </div>

      <SettingsForm initial={initial} />
    </div>
  );
}
