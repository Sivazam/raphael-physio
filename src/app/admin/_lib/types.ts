/**
 * Serialized row types shared between admin server pages (which query Prisma)
 * and client components (which render + mutate via /api/admin).
 * Dates cross the RSC boundary as ISO strings.
 */

export interface AppointmentRow {
  id: string;
  patientName: string;
  phone: string;
  email: string | null;
  serviceName: string | null;
  appointmentDate: string; // YYYY-MM-DD clinic-local
  appointmentSlot: string; // HH:mm clinic-local
  notes: string | null;
  consentGiven: boolean;
  status: string;
  adminNote: string | null;
  createdAt: string; // ISO
}

export interface MessageRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: string;
  createdAt: string; // ISO
}

export interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  summary: string;
  description: string;
  imageUrl: string | null;
  featured: boolean;
  status: string;
  sortOrder: number;
  categoryName: string | null;
}

export interface ExerciseRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  purpose: string | null;
  instructions: string;
  imageUrl: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  categoryId: string | null;
  featured: boolean;
  status: string;
  sortOrder: number;
  categoryName: string | null;
}

export interface TherapistRow {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  bio: string | null;
  photoUrl: string | null;
  languages: string[];
  expertise: string[];
  status: string;
  sortOrder: number;
}

export interface StoryRow {
  id: string;
  slug: string;
  title: string;
  conditionContext: string | null;
  journey: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  therapistId: string | null;
  therapistName: string | null;
  consentStatus: string;
  consentReference: string | null;
  status: string;
}

export interface SessionTime {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface DayHoursRow {
  dayOfWeek: number; // 0 = Sunday
  isOpen: boolean;
  sessions: SessionTime[];
}

export interface SettingsForm {
  phonePrimary: string;
  phoneAlternate: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  mapsUrl: string;
  googleReviewsUrl: string;
  bookingMode: "internal" | "external";
  externalBookingUrl: string;
  sundayBookingEnabled: boolean;
  minBookingDateOffset: number;
  maxBookingDateOffset: number;
  slotDurationMinutes: number;
  bookingNotes: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  hours: DayHoursRow[];
}

export interface OptionItem {
  id: string;
  label: string;
}
