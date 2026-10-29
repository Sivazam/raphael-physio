/**
 * Shared client-side types for the booking wizard. Pure types + constants —
 * safe for both the server page and the client components.
 */

export interface WizardService {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  categoryName: string | null;
}

export type SlotSession = "morning" | "afternoon";

export interface SlotInfo {
  start: string; // "HH:mm" clinic-local
  end: string; // "HH:mm" clinic-local
  label: string; // "9:00 AM"
  session: SlotSession;
  available: boolean;
}

/** Shape of GET /api/availability responses. */
export interface AvailabilityResponse {
  ok: boolean;
  date?: string;
  reason?: string;
  message?: string;
  alternativeDate?: string | null;
  slots?: SlotInfo[];
  error?: string;
}

/** Lifecycle of the availability fetch owned by the wizard. */
export type AvailabilityState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "loaded"; data: AvailabilityResponse };

export interface WizardPhone {
  primary: string; // tel: href value, e.g. "+919959274929"
  primaryDisplay: string;
  alternate: string | null;
  alternateDisplay: string | null;
}

export const UNSURE = "unsure";

export const STEPS = [
  { n: 1, label: "Service" },
  { n: 2, label: "Date & time" },
  { n: 3, label: "Your details" },
  { n: 4, label: "Review" },
] as const;

export type StepNumber = (typeof STEPS)[number]["n"];
