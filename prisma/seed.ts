/**
 * Initial content seed for Raphael Physiotherapy & Rehabilitation Centre.
 *
 * Content policy (see docs/content-needed.md):
 * - Contact details come from verified public listings.
 * - Service copy describes physiotherapy practice in general, professional
 *   terms and makes NO outcome or cure promises. All of it is flagged for
 *   clinic approval before launch and can be unpublished in /admin.
 * - Therapists are seeded as DRAFTS ONLY (no real names were provided).
 * - Patient stories are seeded as a DRAFT TEMPLATE ONLY (no consent on file).
 * - Exercises are general educational content, never framed as prescriptions.
 * - No impact statistics are seeded as verified.
 * - Operating hours are configurable DRAFTS pending clinic confirmation.
 *
 * PUBLISHED content (services, exercises, categories, hours) is defined ONCE
 * in src/lib/baked-content.ts — the same snapshot the public site serves on
 * database-less deployments — and inserted here, so a freshly seeded
 * database and the baked fallback can never drift apart. Re-running the
 * seed resets existing published rows back to that baseline (admin edits to
 * those rows are overwritten; records created in /admin are untouched).
 */

import { PrismaClient } from "@prisma/client";
import { scryptHash } from "../src/lib/auth-crypto";
import {
  BAKED_EXERCISE_CATEGORIES,
  BAKED_HOURS,
  BAKED_SERVICE_CATEGORIES,
  EXERCISE_SEED_ROWS,
  SERVICE_SEED_ROWS,
} from "../src/lib/baked-content";

const db = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@raphaelphysio.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe#2025";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Clinic Administrator";

async function main() {
  console.log("Seeding database…");

  // ---------------------------------------------------------------- settings
  await db.clinicSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      phonePrimary: "+919959274929",
      phoneAlternate: "08832470757",
      email: "raphaelphysiotherapyclinic@gmail.com",
      addressLine1: "26-3-23/3, Ground Floor",
      addressLine2:
        "Beside Sunstar Hospital and Venki's Delight, Jampet Road",
      addressLine3: "Opposite Hotel Anand Regency, Kambala Peta",
      city: "Rajamahendravaram",
      state: "Andhra Pradesh",
      postcode: "533103",
      country: "India",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Raphael+Physiotherapy+and+Rehabilitation+Centre+Jampet+Road+Rajamahendravaram",
      googleReviewsUrl:
        "https://www.google.com/maps/search/?api=1&query=Raphael+Physiotherapy+and+Rehabilitation+Centre+Jampet+Road+Rajamahendravaram",
      bookingMode: "internal",
      sundayBookingEnabled: false, // discovery-call requirement; configurable
      minBookingDateOffset: 1,
      maxBookingDateOffset: 30,
      slotDurationMinutes: 30,
      bookingNotes:
        "This sends an appointment request — our team will confirm the slot by phone.",
      smsProvider: "msg91",
      smsReminderHours: 24,
      // Social links intentionally absent: profiles not verified yet.
    },
  });

  // --------------------------------------------------------- operating hours
  // DRAFT hours pending clinic confirmation (see docs/content-needed.md) —
  // sourced from baked-content so the site's fallback matches the seed.
  for (const day of BAKED_HOURS) {
    await db.operatingHour.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: {
        isOpen: day.isOpen,
        sessions: JSON.stringify(day.sessions),
      },
      create: {
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        sessions: JSON.stringify(day.sessions),
      },
    });
  }

  // ------------------------------------------------------------- categories
  // Published categories from baked-content + the draft "pending
  // confirmation" category that holds unconfirmed public listings.
  for (const c of BAKED_SERVICE_CATEGORIES) {
    await db.serviceCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        status: c.status,
        sortOrder: c.sortOrder,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        status: c.status,
        sortOrder: c.sortOrder,
      },
    });
  }
  await db.serviceCategory.upsert({
    where: { slug: "additional-therapies" },
    update: {
      name: "Additional Therapies — pending confirmation",
      description:
        "Public listings hint at further offerings. These stay drafts until the clinic confirms them.",
      status: "draft",
    },
    create: {
      name: "Additional Therapies — pending confirmation",
      slug: "additional-therapies",
      description:
        "Public listings hint at further offerings. These stay drafts until the clinic confirms them.",
      status: "draft",
      sortOrder: 9,
    },
  });

  // ---------------------------------------------------------------- services
  // Published services from baked-content; drafts — public listings hint at
  // these; they stay unpublished until the clinic confirms them.
  const draftServices = [
    {
      slug: "acupuncture",
      name: "Acupuncture (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business listings mention acupuncture. This service page remains a draft until the clinic confirms the offering and approves content.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
    },
    {
      slug: "womens-health-physiotherapy",
      name: "Women's Health Physiotherapy (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business listings mention women's health. This service page remains a draft until the clinic confirms the offering and approves content.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
    },
    {
      slug: "chiropractic-osteopathy",
      name: "Chiropractic & Osteopathy (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business categories mention chiropractic and osteopathy. This page remains a draft until the clinic confirms what is actually offered.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
    },
  ];

  const categories = await db.serviceCategory.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const s of SERVICE_SEED_ROWS) {
    await db.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        tagline: s.tagline,
        summary: s.summary,
        description: s.description,
        conditions: JSON.stringify(s.conditions),
        approach: s.approach,
        faqs: JSON.stringify(s.faqs),
        imageUrl: s.imageUrl,
        featured: s.featured,
        status: "published",
        sortOrder: s.sortOrder,
        categoryId: catBySlug.get(s.categorySlug) ?? null,
        seoTitle: s.seoTitle ?? null,
        seoDescription: s.seoDescription ?? null,
      },
      create: {
        name: s.name,
        slug: s.slug,
        tagline: s.tagline,
        summary: s.summary,
        description: s.description,
        conditions: JSON.stringify(s.conditions),
        approach: s.approach,
        faqs: JSON.stringify(s.faqs),
        imageUrl: s.imageUrl,
        featured: s.featured,
        status: "published",
        sortOrder: s.sortOrder,
        categoryId: catBySlug.get(s.categorySlug) ?? null,
        seoTitle: s.seoTitle ?? null,
        seoDescription: s.seoDescription ?? null,
      },
    });
  }

  for (const s of draftServices) {
    await db.service.upsert({
      where: { slug: s.slug },
      update: { imageUrl: null },
      create: {
        name: s.name,
        slug: s.slug,
        tagline: s.tagline,
        summary: s.summary,
        description: s.description,
        conditions: "[]",
        approach: null,
        faqs: "[]",
        imageUrl: null,
        featured: false,
        status: "draft",
        sortOrder: 90 + draftServices.indexOf(s),
        categoryId: catBySlug.get(s.categorySlug) ?? null,
      },
    });
  }

  // -------------------------------------------------------------- therapists
  // NO real names were provided — drafts only, never published as-is.
  const therapistDrafts = [
    {
      name: "[Add lead physiotherapist name]",
      slug: "lead-physiotherapist",
      title: "Physiotherapist",
      bio: "Replace this draft with the therapist's approved professional biography, qualifications, and areas of expertise before publishing.",
    },
    {
      name: "[Add second therapist name]",
      slug: "therapist-two",
      title: "Physiotherapist",
      bio: "Replace this draft with the therapist's approved professional biography, qualifications, and areas of expertise before publishing.",
    },
  ];
  for (const t of therapistDrafts) {
    await db.therapist.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, status: "draft", languages: "[]", expertise: "[]" },
    });
  }

  // ---------------------------------------------------------- patient stories
  // Draft TEMPLATE only — publishing requires documented consent.
  await db.patientStory.upsert({
    where: { slug: "example-story-template" },
    update: {},
    create: {
      title: "Example recovery story (template — not for publication)",
      slug: "example-story-template",
      conditionContext:
        "Describe the general rehabilitation context here, approved by the patient.",
      journey:
        "A short, patient-approved account of the rehabilitation journey. Replace with consented content, and attach approved before/after photographs where the patient has agreed in writing.",
      milestones: JSON.stringify([]),
      consentStatus: "pending",
      consentReference: null,
      status: "draft",
    },
  });

  // ------------------------------------------------------------------ stats
  // Intentionally empty: no verified statistics exist yet. See
  // docs/content-needed.md — statistics display only when verified=true.

  // ------------------------------------------------------------- exercises
  for (const c of BAKED_EXERCISE_CATEGORIES) {
    await db.exerciseCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, bodyArea: c.bodyArea, sortOrder: c.sortOrder },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        bodyArea: c.bodyArea,
        sortOrder: c.sortOrder,
      },
    });
  }

  const exCats = await db.exerciseCategory.findMany();
  const exCatBySlug = new Map(exCats.map((c) => [c.slug, c.id]));
  const allServices = await db.service.findMany();
  const svcBySlug = new Map(allServices.map((s) => [s.slug, s]));

  for (const [index, e] of EXERCISE_SEED_ROWS.entries()) {
    const related = e.relatedServiceSlugs
      .map((slug) => svcBySlug.get(slug))
      .filter(Boolean);
    const fields = {
      title: e.title,
      purpose: e.purpose,
      summary: e.summary,
      instructions: e.instructions,
      frequency: null, // only set when specifically approved by the clinic
      equipment: e.equipment,
      precautions: e.precautions,
      featured: e.featured,
      status: "published",
      // Baked sortOrder (index + 1) keeps database and fallback orders in
      // lockstep — see src/lib/baked-content.ts.
      sortOrder: index + 1,
      categoryId: exCatBySlug.get(e.categorySlug) ?? null,
    };
    await db.exercise.upsert({
      where: { slug: e.slug },
      update: {
        ...fields,
        services: { set: related.map((s) => ({ id: s!.id })) },
      },
      create: {
        ...fields,
        slug: e.slug,
        services: { connect: related.map((s) => ({ id: s!.id })) },
      },
    });
  }

  // ------------------------------------------------------------- sync state
  await db.reviewSyncState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", provider: null, reviewCount: 0 },
  });

  // ------------------------------------------------------------ admin user
  // Always (re-)sync the admin credentials on seed so the .env password is
  // authoritative — a stale hash from an earlier run would lock staff out.
  await db.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      passwordHash: scryptHash(ADMIN_PASSWORD),
      role: "admin",
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: scryptHash(ADMIN_PASSWORD),
      role: "admin",
    },
  });

  const counts = {
    services: await db.service.count(),
    exercises: await db.exercise.count(),
    categories: await db.serviceCategory.count(),
    therapists: await db.therapist.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
