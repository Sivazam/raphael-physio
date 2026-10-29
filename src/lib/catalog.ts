import { cache } from "react";
import { db } from "@/lib/db";
import {
  BAKED_EXERCISES,
  BAKED_EXERCISE_CATEGORIES,
  BAKED_SERVICES,
  type CatalogExercise,
  type CatalogExerciseCategory,
  type CatalogService,
} from "@/lib/baked-content";

/**
 * Public-content catalog — one data-access layer for every page the visitor
 * sees (homepage, services, exercises, sitemap).
 *
 * Order of preference, per query:
 *   1. SQLite via Prisma (the admin CMS's database — always used when
 *      reachable and holding rows, i.e. local dev and any host with the
 *      database wired up);
 *   2. the baked-in published snapshot from @/lib/baked-content (serverless
 *      deployments like Vercel, where the git-ignored SQLite file and .env
 *      never travel with the build, and a wiped dev database before its
 *      first `db:push && db:seed`).
 *
 * The fallback triggers on a query ERROR *or* an EMPTY result — an empty
 * services/exercise section is never a valid state for this site. Detail
 * lookups delegate to the list accessors, so a service the clinic has
 * genuinely unpublished (on a working database) still 404s honestly, while
 * a whole-database failure serves the baked pages instead.
 *
 * `cache()` dedupes reads within a single request, so the homepage,
 * generateMetadata and any layout reads share one query per render.
 */

/** Query the database; serve the baked snapshot on failure or emptiness. */
async function listOrBaked<T>(
  query: () => Promise<T[]>,
  baked: T[]
): Promise<T[]> {
  try {
    const rows = await query();
    return rows.length > 0 ? rows : baked;
  } catch {
    return baked;
  }
}

/** Canonical published-exercise order used by every consumer.
 * NOTE: separate objects per key — this Prisma build rejects combined-key
 * orderBy objects at runtime (see dev.log; TypeScript accepts both forms). */
const EXERCISE_ORDER = [
  { featured: "desc" },
  { sortOrder: "asc" },
  { title: "asc" },
] as const;

function sortBakedExercises(rows: CatalogExercise[]): CatalogExercise[] {
  return [...rows].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}

/* ---------------------------------------------------------------- services */

/**
 * Every PUBLISHED service, in display order, with its category and its
 * related published exercises (capped at 4 — the detail page's include).
 */
export const getPublishedServices = cache(async (): Promise<CatalogService[]> => {
  const rows = await listOrBaked(
    () =>
      db.service.findMany({
        where: { status: "published" },
        orderBy: { sortOrder: "asc" },
        include: {
          category: { select: { name: true, slug: true } },
          exercises: {
            where: { status: "published" },
            orderBy: { sortOrder: "asc" },
            take: 4,
            select: {
              slug: true,
              title: true,
              summary: true,
              category: { select: { name: true } },
            },
          },
        },
      }) as Promise<CatalogService[]>,
    BAKED_SERVICES
  );
  return rows;
});

/**
 * One published service by slug, or null when it does not exist / is not
 * published on a working database (an honest 404). When the database is
 * unavailable, the baked snapshot answers instead.
 */
export const getServiceBySlug = cache(
  async (slug: string): Promise<CatalogService | null> => {
    const services = await getPublishedServices();
    return services.find((s) => s.slug === slug) ?? null;
  }
);

/* -------------------------------------------------------------- exercises */

/** Every PUBLISHED exercise with full category + related services. */
export const getPublishedExercises = cache(async (): Promise<CatalogExercise[]> => {
  const rows = await listOrBaked(
    () =>
      db.exercise.findMany({
        where: { status: "published" },
        orderBy: [...EXERCISE_ORDER],
        include: {
          category: true,
          services: {
            where: { status: "published" },
            select: { slug: true, name: true, tagline: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }) as Promise<CatalogExercise[]>,
    sortBakedExercises(BAKED_EXERCISES)
  );
  return rows;
});

/**
 * One published exercise by slug, or null (honest 404 on a working
 * database; the baked snapshot answers when the database is unavailable).
 */
export const getExerciseBySlug = cache(
  async (slug: string): Promise<CatalogExercise | null> => {
    const exercises = await getPublishedExercises();
    return exercises.find((e) => e.slug === slug) ?? null;
  }
);

/** Up to three other published exercises in the same category. */
export const getRelatedExercises = cache(
  async (
    categorySlug: string,
    excludeSlug: string
  ): Promise<CatalogExercise[]> => {
    const exercises = await getPublishedExercises();
    return exercises
      .filter(
        (e) =>
          e.slug !== excludeSlug && e.category?.slug === categorySlug
      )
      .slice(0, 3);
  }
);

/** All exercise categories (for the library's filter pills). */
export const getExerciseCategories = cache(
  async (): Promise<CatalogExerciseCategory[]> => {
    return listOrBaked(
      () =>
        db.exerciseCategory.findMany({
          orderBy: { sortOrder: "asc" },
        }) as Promise<CatalogExerciseCategory[]>,
      BAKED_EXERCISE_CATEGORIES
    );
  }
);

/* ------------------------------------------------------------------ hours */
// Operating-hours resilience lives in @/lib/settings (getOperatingHours),
// which imports BAKED_HOURS from baked-content directly.
