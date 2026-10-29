/**
 * Firestore content mirror — populates the clinic's Firebase project with the
 * same content the local SQLite database holds, so database-less deployments
 * (Vercel) can serve the admin dashboard, sign-in authorization, booking and
 * contact submissions from Firestore.
 *
 * WHAT IS MIRRORED (idempotent — docs are overwritten by id):
 *   services, serviceCategories, exercises, exerciseCategories, team,
 *   stories, config/clinic (settings singleton), hours/{0..6}, admins
 *
 * WHAT IS DELIBERATELY NOT MIRRORED:
 *   appointments, messages — live collections. Production starts clean; real
 *   bookings/enquiries land there directly once the site is live.
 *   googleReviews/reviewSyncState — dormant until the Google integration is
 *   configured. smsJobs — local queue plumbing.
 *
 * Run: bun scripts/firestore-seed.ts
 * (Uses the PUBLIC Firebase web config from src/lib/firebase-config.ts — the
 * project runs in test mode with open rules, which is what allows plain
 * HTTPS writes. Tighten rules + switch to a service account before handling
 * sensitive data at scale.)
 */

import { PrismaClient } from "@prisma/client";
import { fsDelete, fsList, fsSet } from "../src/lib/firestore-rest";
import { parseJsonArray } from "../src/lib/content";

const db = new PrismaClient();

function slugifyId(prefix: string, id: string): string {
  return id; // ids are already filesystem/URL-safe cuids or explicit slugs
}

async function mirrorContent() {
  /* -------------------------------------------------------------- admins */
  const adminUsers = await db.adminUser.findMany();
  for (const a of adminUsers) {
    await fsSet("admins", a.email.toLowerCase(), {
      email: a.email.toLowerCase(),
      name: a.name,
      role: a.role,
    });
  }
  console.log(`admins: ${adminUsers.length} doc(s)`);

  /* ----------------------------------------------------- service categories */
  const serviceCategories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  for (const c of serviceCategories) {
    await fsSet("serviceCategories", slugifyId("sc", c.id), {
      name: c.name,
      slug: c.slug,
      description: c.description,
      sortOrder: c.sortOrder,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  }
  console.log(`serviceCategories: ${serviceCategories.length} doc(s)`);

  /* ------------------------------------------------------------- services */
  const services = await db.service.findMany({
    include: { category: { select: { name: true, slug: true } }, exercises: { select: { slug: true } } },
    orderBy: { sortOrder: "asc" },
  });
  for (const s of services) {
    await fsSet("services", slugifyId("svc", s.id), {
      categoryId: s.categoryId,
      categoryName: s.category?.name ?? null,
      name: s.name,
      slug: s.slug,
      tagline: s.tagline,
      summary: s.summary,
      description: s.description,
      conditions: parseJsonArray(s.conditions),
      approach: s.approach,
      faqs: safeJson(s.faqs),
      imageUrl: s.imageUrl,
      featured: s.featured,
      status: s.status,
      seoTitle: s.seoTitle,
      seoDescription: s.seoDescription,
      sortOrder: s.sortOrder,
      exerciseSlugs: s.exercises.map((e) => e.slug),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }
  console.log(`services: ${services.length} doc(s)`);

  /* ---------------------------------------------------- exercise categories */
  const exerciseCategories = await db.exerciseCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  for (const c of exerciseCategories) {
    await fsSet("exerciseCategories", slugifyId("ec", c.id), {
      name: c.name,
      slug: c.slug,
      bodyArea: c.bodyArea,
      description: c.description,
      sortOrder: c.sortOrder,
    });
  }
  console.log(`exerciseCategories: ${exerciseCategories.length} doc(s)`);

  /* ------------------------------------------------------------ exercises */
  const exercises = await db.exercise.findMany({
    include: { category: { select: { name: true } }, services: { select: { slug: true } } },
    orderBy: { sortOrder: "asc" },
  });
  for (const e of exercises) {
    await fsSet("exercises", slugifyId("ex", e.id), {
      categoryId: e.categoryId,
      categoryName: e.category?.name ?? null,
      title: e.title,
      slug: e.slug,
      purpose: e.purpose,
      summary: e.summary,
      instructions: e.instructions,
      frequency: e.frequency,
      equipment: e.equipment,
      imageUrl: e.imageUrl,
      videoUrl: e.videoUrl,
      youtubeUrl: e.youtubeUrl,
      precautions: e.precautions,
      attribution: e.attribution,
      featured: e.featured,
      status: e.status,
      sortOrder: e.sortOrder,
      serviceSlugs: e.services.map((s) => s.slug),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }
  console.log(`exercises: ${exercises.length} doc(s)`);

  /* ----------------------------------------------------------------- team */
  const therapists = await db.therapist.findMany({
    orderBy: { sortOrder: "asc" },
  });
  for (const t of therapists) {
    await fsSet("team", slugifyId("th", t.id), {
      name: t.name,
      slug: t.slug,
      title: t.title,
      qualifications: t.qualifications,
      experienceYears: t.experienceYears,
      bio: t.bio,
      languages: parseJsonArray(t.languages),
      expertise: parseJsonArray(t.expertise),
      photoUrl: t.photoUrl,
      status: t.status,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    });
  }
  console.log(`team: ${therapists.length} doc(s)`);

  /* -------------------------------------------------------------- stories */
  const stories = await db.patientStory.findMany({
    include: { therapist: { select: { name: true } } },
  });
  for (const s of stories) {
    await fsSet("stories", slugifyId("st", s.id), {
      title: s.title,
      slug: s.slug,
      conditionContext: s.conditionContext,
      journey: s.journey,
      beforeImageUrl: s.beforeImageUrl,
      afterImageUrl: s.afterImageUrl,
      milestones: safeJson(s.milestones),
      therapistId: s.therapistId,
      therapistName: s.therapist?.name ?? null,
      consentStatus: s.consentStatus,
      consentReference: s.consentReference,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }
  console.log(`stories: ${stories.length} doc(s)`);

  /* --------------------------------------------------------- settings + hours */
  const settings = await db.clinicSetting.findUnique({
    where: { id: "singleton" },
  });
  if (settings) {
    const { id, updatedAt, ...fields } = settings;
    await fsSet("config", "clinic", { ...fields, updatedAt });
    console.log("config/clinic: 1 doc");
  } else {
    console.log("config/clinic: SKIPPED (no settings row locally)");
  }

  const hourRows = await db.operatingHour.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  for (const h of hourRows) {
    await fsSet("hours", String(h.dayOfWeek), {
      dayOfWeek: h.dayOfWeek,
      isOpen: h.isOpen,
      sessions: parseJsonArray(h.sessions),
    });
  }
  console.log(`hours: ${hourRows.length} doc(s)`);
}

/** parseJsonArray for shapes that may be objects (faqs, milestones). */
function safeJson(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function cleanupScratch() {
  // Remove probe documents left by earlier connectivity checks.
  const scratch = await fsList("scratch-test");
  for (const doc of scratch) {
    await fsDelete("scratch-test", doc.id);
  }
  if (scratch.length > 0) console.log(`scratch-test: removed ${scratch.length} probe doc(s)`);
}

async function main() {
  console.log("Mirroring local SQLite content → Firestore (project: raphaelphysiocenter)…\n");
  await cleanupScratch();
  await mirrorContent();
  console.log("\nDone. The Vercel deployment now has its hosted datastore.");
}

main()
  .catch((err) => {
    console.error("Firestore seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
