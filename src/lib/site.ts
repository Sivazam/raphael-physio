/**
 * Canonical, verified public facts about the clinic.
 *
 * This module is the single hard-coded source for information that is
 * publicly verifiable. Editable/operational values (social links, booking
 * mode, operating hours) live in the database (ClinicSetting /
 * OperatingHour) and are read through `@/lib/settings`. Seed data in
 * `prisma/seed.ts` derives from these constants so there are never two
 * conflicting hard-coded versions of the same fact.
 *
 * Anything not verified (social profiles, hours, stats) is intentionally
 * absent here — see docs/content-needed.md.
 */

export const SITE = {
  name: "Raphael Physiotherapy & Rehabilitation Centre",
  extendedName:
    "Raphael Physiotherapy & Rehabilitation Centre (In-Patient & Day Care Centre)",
  shortName: "Raphael Physio",
  tagline: "In-patient & day care rehabilitation in Rajamahendravaram",
  /** The clinic's own motto, exactly as written inside their logo artwork. */
  motto: "Mission To Make Man Moving",
  description:
    "Physiotherapy and rehabilitation centre offering in-patient and day care rehabilitation on Jampet Road, Rajamahendravaram. Appointment requests, therapist-guided exercise resources, and clear directions.",

  // Verified public contact details (from public business listings — see docs/content-needed.md)
  phonePrimary: "+919959274929",
  phonePrimaryDisplay: "+91 99592 74929",
  phoneAlternate: "08832470757",
  phoneAlternateDisplay: "0883 247 0757",
  email: "raphaelphysiotherapyclinic@gmail.com",

  address: {
    line1: "26-3-23/3, Ground Floor",
    line2: "Beside Sunstar Hospital and Venki's Delight, Jampet Road",
    line3: "Opposite Hotel Anand Regency, Kambala Peta",
    city: "Rajamahendravaram",
    state: "Andhra Pradesh",
    postcode: "533103",
    country: "India",
  },

  /**
   * Link to the clinic's Google Maps listing. This is a Maps *search* link
   * that resolves to the actual public listing — not fabricated place data.
   */
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Raphael+Physiotherapy+and+Rehabilitation+Centre+Jampet+Road+Rajamahendravaram",

  // Clinic-local timezone. All booking date handling must use this.
  timezone: "Asia/Kolkata",

  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://raphaelphysio.example.local", // replace at deployment — see docs/deployment.md
} as const;

export const SITE_ADDRESS_ONE_LINE = [
  SITE.address.line1,
  SITE.address.line2,
  SITE.address.line3,
  [SITE.address.city, SITE.address.state, SITE.address.postcode].join(" "),
].join(", ");

export function formatPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
